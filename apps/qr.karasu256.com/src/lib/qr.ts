import 'server-only';

import { headers } from 'next/headers';
import { createId } from '@paralleldrive/cuid2';
import QRCode from 'qrcode';
import { useRedis } from '@Hashibutogarasu/ui/redis';
import { embedChallengeToken } from '@Hashibutogarasu/challengetoken';
import {
  MissingEnvError,
  deleteUploadedImage,
  getSessionUser,
  requestChallengeToken,
  uploadImage,
  uploadImageAnonymous,
  verifyAppJwt,
} from '@Hashibutogarasu/utils/server';
import { getDb } from '@Hashibutogarasu/db';
import { qrGenerations } from '@Hashibutogarasu/db/schema';

const QR_IMAGE_WIDTH = 512;
const CACHE_TTL_SECONDS = 60 * 60 * 24;

export interface QrData {
  content: string;
  url: string;
  createdAt: string;
}

interface CachedQr extends QrData {
  path: string;
}

/** Returns `CDN_URL`, throwing {@link MissingEnvError} if it's unset. */
function getImageApiUrl(): string {
  const imageApiUrl = process.env.CDN_URL;
  if (!imageApiUrl) throw new MissingEnvError('CDN_URL');
  return imageApiUrl;
}

function redisKeyFor(uid: string | null): string {
  return uid ? `qr:user:${uid}` : 'qr:anonymous';
}

async function readCachedQr(uid: string | null): Promise<CachedQr | null> {
  const cached = await useRedis(process.env.REDIS_URL).get(redisKeyFor(uid));
  return cached ? (JSON.parse(cached) as CachedQr) : null;
}

async function writeCachedQr(uid: string | null, qr: CachedQr): Promise<void> {
  await useRedis(process.env.REDIS_URL).set(redisKeyFor(uid), JSON.stringify(qr), CACHE_TTL_SECONDS);
}

interface ResolvedSession {
  uid: string | null;
  cookieHeader: string | null;
  /** The verified bearer token, forwarded as-is to authenticate the R2 upload (see `uploadForUser`), or null when the caller authenticated via cookie instead. */
  token: string | null;
}

/**
 * Resolves the caller's uid, raw `Cookie` request header, and verified
 * bearer token. Prefers a caller-supplied JWT (verified against
 * api-auth.karasu256.com's JWKS via `verifyAppJwt`) over `getSessionUser`'s
 * `Cookie`-forwarding check, since this app's own server can't rely on
 * that cookie reaching it — see `SessionProvider` in `@Hashibutogarasu/ui`,
 * which mints that JWT as the single source of truth for "who is logged
 * in".
 */
async function resolveSession(bearerToken?: string | null): Promise<ResolvedSession> {
  const cookieHeader = (await headers()).get('cookie');
  const authUrl = process.env.NEXT_PUBLIC_AUTH_API_URL;
  const protectionBypassSecret = process.env.VERCEL_PROTECTION_BYPASS_SECRET;

  const uidFromToken = bearerToken ? await verifyAppJwt(bearerToken, authUrl, protectionBypassSecret) : null;
  if (uidFromToken) return { uid: uidFromToken, cookieHeader, token: bearerToken ?? null };

  const sessionUser = await getSessionUser(authUrl, protectionBypassSecret);
  return sessionUser ? { uid: sessionUser.uid, cookieHeader, token: null } : { uid: null, cookieHeader: null, token: null };
}

/** Fetches a fresh challenge token from the image API and embeds it into `buffer`'s header, so the CDN can verify this upload round-tripped through it. */
async function embedChallenge(buffer: Buffer): Promise<Buffer> {
  const token = await requestChallengeToken(getImageApiUrl());
  return Buffer.from(embedChallengeToken(buffer, token));
}

async function uploadForUser(
  buffer: Buffer,
  uid: string,
  auth: { cookieHeader: string | null; token: string | null }
): Promise<{ path: string; url: string }> {
  const embedded = await embedChallenge(buffer);
  const path = `qr/${uid}/${Date.now()}.png`;
  const file = new File([Uint8Array.from(embedded)], 'qr.png', { type: 'image/png' });
  const imageApiUrl = getImageApiUrl();
  const result = await uploadImage(file, {
    imageApiUrl,
    cookieHeader: auth.cookieHeader,
    token: auth.token,
    path,
  });
  if (!result.ok) throw new Error(`Failed to upload QR image to ${imageApiUrl}: ${result.error ?? result.status}`);
  return { path, url: result.url };
}

async function uploadAnonymous(buffer: Buffer): Promise<{ path: string; url: string }> {
  const embedded = await embedChallenge(buffer);
  const path = `qr/anonymous/${Date.now()}.png`;
  const imageApiUrl = getImageApiUrl();
  const result = await uploadImageAnonymous(embedded, {
    apiUrl: imageApiUrl,
    path,
    contentType: 'image/png',
  });
  if (!result.ok) throw new Error(`Failed to upload QR image to ${imageApiUrl}: ${result.error ?? result.status}`);
  return { path, url: result.url };
}

/** Records a generation in the history table; best-effort so a DB outage never breaks the QR response. */
async function recordGeneration(uid: string | null, fileName: string, url: string): Promise<void> {
  try {
    await getDb().insert(qrGenerations).values({ fileName, url, userId: uid });
  } catch (err) {
    console.error('Failed to record QR generation history', err);
  }
}

/**
 * Generates a QR for `content` (a fresh random id unless the client already
 * predicted one), uploads it under the caller's path scheme, and replaces
 * the cached entry. The previous-cache read runs in parallel with the R2
 * upload, and the cache write in parallel with the best-effort delete of the
 * previous R2 object; anonymous uploads have no delete credentials and are
 * left for R2 lifecycle rules to expire.
 *
 * The authenticated upload to cdn.karasu256.com is gated on `auth.token`
 * alone, not `auth.cookieHeader`: forwarding the cookie a second hop (this
 * app's own server to cdn.karasu256.com's) is the unreliable mechanism this
 * app moved away from, so it's ignored here even when it did resolve `uid`
 * for the DB record.
 */
async function generateAndCacheQr(
  uid: string | null,
  auth: { cookieHeader: string | null; token: string | null },
  content: string = createId()
): Promise<QrData> {
  const buffer = await QRCode.toBuffer(content, { type: 'png', width: QR_IMAGE_WIDTH });

  const [previous, { path, url }] = await Promise.all([
    uid ? readCachedQr(uid) : null,
    uid && auth.token ? uploadForUser(buffer, uid, auth) : uploadAnonymous(buffer),
  ]);

  const qr: CachedQr = { content, path, url, createdAt: new Date().toISOString() };

  await Promise.all([
    writeCachedQr(uid, qr),
    recordGeneration(uid, path, url),
    uid && auth.token && previous
      ? deleteUploadedImage(previous.url, {
          imageApiUrl: getImageApiUrl(),
          token: auth.token,
        })
      : null,
  ]);

  return { content: qr.content, url: qr.url, createdAt: qr.createdAt };
}

/** Returns the cached QR for the current caller if present, generating and caching a new one otherwise. */
export async function getOrCreateQr(): Promise<QrData> {
  const { uid, cookieHeader, token } = await resolveSession();
  const cached = await readCachedQr(uid);
  if (cached) return { content: cached.content, url: cached.url, createdAt: cached.createdAt };
  return generateAndCacheQr(uid, { cookieHeader, token });
}

/**
 * Always generates a fresh QR for the current caller, replacing the cached
 * one. When the client already rendered a predicted QR locally, it passes
 * that same `content` so the server-side image encodes identical data.
 * `bearerToken` is the JWT from the caller's `SessionProvider` (see
 * `resolveSession`), sent when the caller is signed in.
 */
export async function regenerateQr(content?: string, bearerToken?: string | null): Promise<QrData> {
  const { uid, cookieHeader, token } = await resolveSession(bearerToken);
  return generateAndCacheQr(uid, { cookieHeader, token }, content);
}

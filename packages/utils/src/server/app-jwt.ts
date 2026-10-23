import { createRemoteJWKSet, customFetch, jwtVerify, type JWTPayload } from 'jose';
import { vercelProtectionBypassHeaders } from './vercel-bypass';
import { logError, logInfo } from './log';

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

/**
 * jose fetches the JWKS with `redirect: 'manual'`, so a Vercel Deployment
 * Protection redirect surfaces only as a generic "Expected 200 OK" error
 * with no further detail. This `customFetch` logs the raw response
 * (status/type) and whether a bypass header was actually attached, so a
 * redirect-caused failure is distinguishable from every other one.
 */
function getJwks(authUrl: string, protectionBypassSecret: string | undefined): ReturnType<typeof createRemoteJWKSet> {
  const existing = jwksCache.get(authUrl);
  if (existing) return existing;

  const jwks = createRemoteJWKSet(new URL('/api/auth/jwks', authUrl), {
    headers: vercelProtectionBypassHeaders(protectionBypassSecret),
    [customFetch]: async (url, options) => {
      const res = await fetch(url, options);
      const bodyPreview =
        res.status === 200
          ? undefined
          : await res
              .clone()
              .text()
              .then((text) => text.slice(0, 500))
              .catch(() => undefined);
      logInfo('fetch_jwks', {
        url,
        status: res.status,
        type: res.type,
        hadBypassSecret: Boolean(protectionBypassSecret),
        server: res.headers.get('server'),
        vercelId: res.headers.get('x-vercel-id'),
        bodyPreview,
      });
      return res;
    },
  });
  jwksCache.set(authUrl, jwks);
  return jwks;
}

/** Verifies a bearer JWT from api-auth.karasu256.com, for callers whose server never receives its session cookie. */
export async function verifyAppJwt(token: string, authUrl: string | undefined, protectionBypassSecret?: string): Promise<string | null> {
  if (!authUrl) {
    logError('verify_app_jwt', { result: 'failure', reason: 'missing_auth_url' });
    return null;
  }

  try {
    const { payload }: { payload: JWTPayload } = await jwtVerify(token, getJwks(authUrl, protectionBypassSecret));
    const sub = typeof payload.sub === 'string' ? payload.sub : null;
    if (!sub) {
      logError('verify_app_jwt', { result: 'failure', reason: 'missing_sub_claim' });
      return null;
    }
    logInfo('verify_app_jwt', { result: 'success', uid: sub });
    return sub;
  } catch (err) {
    logError('verify_app_jwt', { result: 'failure', error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

import { headers } from 'next/headers';
import { getSessionCookie } from 'better-auth/cookies';
import { vercelProtectionBypassHeaders } from './vercel-bypass';
import { logError, logInfo } from './log';

/** The subset of better-auth's `user` model that callers across apps rely on. */
export interface SessionUser {
  uid: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

interface GetSessionResponse {
  user?: { id: string; email?: string | null; name?: string | null; image?: string | null } | null;
}

/** Verifies the current session against api-auth.karasu256.com, since calling apps hold no auth credentials of their own. */
export async function getSessionUser(authApiUrl: string | undefined, protectionBypassSecret?: string): Promise<SessionUser | null> {
  if (!authApiUrl) {
    logInfo('get_session_user', { result: 'skipped', reason: 'missing_auth_url' });
    return null;
  }

  const requestHeaders = await headers();
  if (!getSessionCookie(requestHeaders)) {
    logInfo('get_session_user', { result: 'skipped', reason: 'no_session_cookie' });
    return null;
  }

  const url = `${authApiUrl}/api/auth/get-session`;
  try {
    const res = await fetch(url, {
      headers: { cookie: requestHeaders.get('cookie') ?? '', ...vercelProtectionBypassHeaders(protectionBypassSecret) },
      cache: 'no-store',
    });
    if (!res.ok) {
      logError('get_session_user', { result: 'failure', url, status: res.status });
      return null;
    }

    const data = (await res.json()) as GetSessionResponse;
    if (!data.user) {
      logError('get_session_user', { result: 'no_session' });
      return null;
    }

    logInfo('get_session_user', { result: 'success', uid: data.user.id });
    return {
      uid: data.user.id,
      email: data.user.email ?? null,
      name: data.user.name ?? null,
      image: data.user.image ?? null,
    };
  } catch (err) {
    logError('get_session_user', { result: 'error', url, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

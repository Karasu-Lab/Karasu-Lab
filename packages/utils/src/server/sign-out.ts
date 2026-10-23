'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { parseSetCookieHeader, toCookieOptions } from 'better-auth/cookies';

/**
 * Ends the better-auth session — the session every app trusts for "who is
 * logged in" — by forwarding this request's cookies to
 * api-auth.karasu256.com's `/api/auth/sign-out` and replaying the resulting
 * `Set-Cookie`s onto the local cookie store. Errors are swallowed: the
 * redirect to the auth app's sign-out page below must still proceed
 * even if the auth app is unreachable.
 */
async function endBetterAuthSession(authApiUrl: string, store: Awaited<ReturnType<typeof cookies>>): Promise<void> {
  try {
    const cookieHeader = store
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');
    const res = await fetch(`${authApiUrl}/api/auth/sign-out`, {
      method: 'POST',
      headers: { cookie: cookieHeader },
    });
    for (const setCookie of res.headers.getSetCookie()) {
      for (const [name, attributes] of parseSetCookieHeader(setCookie)) {
        store.set(name, attributes.value, toCookieOptions(attributes));
      }
    }
  } catch {}
}

/**
 * Ends the better-auth session, then redirects to the auth app's
 * sign-out page. Shared across apps so every subdomain signs out the same way.
 */
export async function signOutAction(): Promise<void> {
  const store = await cookies();
  const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? '';
  const authApiUrl = process.env.NEXT_PUBLIC_AUTH_API_URL ?? '';

  if (authApiUrl) {
    await endBetterAuthSession(authApiUrl, store);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const next = appUrl ? `?next=${encodeURIComponent(appUrl)}` : '';
  redirect(`${authUrl}/signout${next}`);
}

export interface SignInLookup {
  /** An account with this email address exists. */
  exists: boolean;
  /** The address's domain has an SSO provider registered. */
  sso: boolean;
  /** The account can sign in with a password (it has a credential account). */
  hasPassword: boolean;
}

/**
 * Asks api-auth how an email address can sign in, so the two-step form can
 * route it: to the domain's identity provider, to the password step, or to
 * an inline "no account" error. Backed by `GET /api/sign-in/lookup` in
 * api-auth, which answers with booleans only.
 */
export async function lookupSignIn(email: string): Promise<SignInLookup> {
  const base = (process.env.NEXT_PUBLIC_AUTH_API_URL ?? '').replace(/\/+$/, '');
  const res = await fetch(`${base}/api/sign-in/lookup?email=${encodeURIComponent(email)}`);
  if (!res.ok) throw new Error(`sign-in lookup failed: ${res.status}`);
  return (await res.json()) as SignInLookup;
}

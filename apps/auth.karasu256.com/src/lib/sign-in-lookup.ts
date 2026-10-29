/** How an email address can sign in, as reported by a 200 lookup response. */
export interface SignInLookup {
  /** The address's domain has an SSO provider registered. */
  sso: boolean;
  /** The account can sign in with a password (it has a credential account). */
  hasPassword: boolean;
  /** The account has at least one passkey registered. */
  hasPasskey: boolean;
}

/**
 * The outcome of a sign-in lookup, discriminated by the response's status
 * code (see `GET /api/sign-in/lookup` in api-auth): 200 found, 404 no
 * account and no SSO provider, 429 rate limited.
 */
export type SignInLookupResult =
  | { status: 'found'; lookup: SignInLookup }
  | { status: 'not_found' }
  | {
      status: 'rate_limited';
      /** The wait rounded up to whole minutes (at least 1). */
      retryAfterMinutes: number;
      /**
       * Whether the wait is exactly `retryAfterMinutes` minutes. The error
       * message branches on it: exact waits read "within N minutes", rounded
       * ones "in less than N minutes", so the bound shown is always true.
       */
      retryAfterExact: boolean;
    };

/**
 * Asks api-auth how an email address can sign in, so the two-step form can
 * route it: to the domain's identity provider, to the passkey step, to the
 * password step, or to an inline "no account" or "rate limited" error.
 */
export async function lookupSignIn(email: string): Promise<SignInLookupResult> {
  const base = (process.env.NEXT_PUBLIC_AUTH_API_URL ?? '').replace(/\/+$/, '');
  const res = await fetch(`${base}/api/sign-in/lookup?email=${encodeURIComponent(email)}`);

  if (res.status === 404) return { status: 'not_found' };

  if (res.status === 429) {
    const body = (await res.json().catch(() => null)) as { retryAfterSeconds?: number } | null;
    const headerSeconds = Number(res.headers.get('Retry-After'));
    const seconds = body?.retryAfterSeconds ?? (Number.isFinite(headerSeconds) && headerSeconds > 0 ? headerSeconds : 60);
    return {
      status: 'rate_limited',
      retryAfterMinutes: Math.max(1, Math.ceil(seconds / 60)),
      retryAfterExact: seconds % 60 === 0,
    };
  }

  if (!res.ok) throw new Error(`sign-in lookup failed: ${res.status}`);
  return { status: 'found', lookup: (await res.json()) as SignInLookup };
}

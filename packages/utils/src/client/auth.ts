import { createAuthClient } from 'better-auth/react';
import { oauthProviderClient } from '@better-auth/oauth-provider/client';
import { passkeyClient } from '@better-auth/passkey/client';
import { multiSessionClient } from 'better-auth/client/plugins';

/**
 * Options for {@link createAppAuthClient}.
 */
export interface CreateAppAuthClientOptions {
  /**
   * Base URL of the better-auth instance. Required when the caller is on a
   * different origin than the worker hosting better-auth (e.g. karasu256.com
   * calling api-auth.karasu256.com).
   */
  baseURL?: string;
}

/**
 * Creates a better-auth client configured with the `oauthProviderClient`
 * plugin, plus a helper to bridge a Firebase session into a better-auth
 * session.
 *
 * The monorepo's single better-auth instance only lives on the auth app
 * (`auth.karasu256.com`); Firebase is the source of truth for a user's
 * own session everywhere else. Any session-gated `authClient.oauth2.*` or
 * `authClient.linkSocial`/`signIn.social` call must first call
 * {@link bridgeFirebaseSession} to synthesize a better-auth session for the
 * current Firebase user via the auth app's `/api/auth/firebase-bridge`
 * endpoint.
 */
export function createAppAuthClient(options: CreateAppAuthClientOptions = {}) {
  const { baseURL } = options;

  const authClient = createAuthClient({
    baseURL,
    plugins: [oauthProviderClient(), multiSessionClient(), passkeyClient()],
  });

  /**
   * Ensures the browser holds a better-auth session for the current Firebase
   * user before calling any session-gated `authClient` endpoint.
   */
  async function bridgeFirebaseSession(): Promise<void> {
    const url = baseURL ? `${baseURL}/api/auth/firebase-bridge` : '/api/auth/firebase-bridge';

    await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
  }

  return { authClient, bridgeFirebaseSession };
}

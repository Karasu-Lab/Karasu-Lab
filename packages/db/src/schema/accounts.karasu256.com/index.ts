/**
 * Schema entry point for `accounts.karasu256.com`'s drizzle-kit migrations:
 * better-auth's own tables plus the OAuth 2.1/OIDC authorization server
 * tables it hosts on top of better-auth. Kept separate from the full
 * `schema/index.ts` barrel so this app's migration history never picks up
 * tables owned by other apps.
 */
export { users, type User, type NewUser } from '../users';
export { apiKeys, type ApiKey, type NewApiKey } from '../api-keys';
export { permissions, type PermissionRow, type NewPermissionRow } from '../permissions';
export { apiKeyPermissions, type ApiKeyPermission, type NewApiKeyPermission } from '../api-key-permissions';
export { passkeys, type Passkey, type NewPasskey } from '../passkeys';
export { sessions, type Session, type NewSession } from '../auth-sessions';
export { accounts, type Account, type NewAccount } from '../auth-accounts';
export { verifications, type Verification, type NewVerification } from '../auth-verifications';
export { jwks, type Jwk, type NewJwk } from '../auth-jwks';
export { oauthClients, type OAuthClient, type NewOAuthClient } from '../oauth-clients';
export { oauthRefreshTokens, type OAuthRefreshToken, type NewOAuthRefreshToken } from '../oauth-refresh-tokens';
export { oauthAccessTokens, type OAuthAccessToken, type NewOAuthAccessToken } from '../oauth-access-tokens';
export { oauthConsents, type OAuthConsent, type NewOAuthConsent } from '../oauth-consents';
export { oauthResources, type OAuthResource, type NewOAuthResource } from '../oauth-resources';
export { oauthClientResources, type OAuthClientResource, type NewOAuthClientResource } from '../oauth-client-resources';
export { oauthClientAssertions, type OAuthClientAssertion, type NewOAuthClientAssertion } from '../oauth-client-assertions';
export { ssoProviders, type SsoProvider, type NewSsoProvider } from '../sso-providers';

/**
 * Derives the SAML 2.0 Service Provider connection values that
 * sso.karasu256.com publishes for identity provider administrators.
 *
 * The values are not configured on this site: they follow from the
 * better-auth base URL on api-auth.karasu256.com, whose `@better-auth/sso`
 * plugin serves the SP metadata document and the assertion consumer
 * service. `{providerId}` is a literal placeholder, because each registered
 * SSO provider has its own ID (and therefore its own ACS URL).
 *
 * The published values are always absolute URLs: a bare path does not tell
 * an IdP administrator which host serves it, so when the auth API URL is
 * not configured the production api-auth origin is assumed.
 */
const DEFAULT_AUTH_API_URL = 'https://api-auth.karasu256.com';
export interface SamlConnectionInfo {
  /** SP metadata document URL, with the provider's ID as a query parameter. */
  metadataUrl: string;
  /** URL the IdP posts SAML responses to (the assertion consumer service). */
  acsUrl: string;
  /** SP entity ID, which the IdP sets as the audience of its assertions. */
  entityId: string;
}

export function getSamlConnectionInfo(authApiUrl: string): SamlConnectionInfo {
  const origin = authApiUrl.trim() === '' ? DEFAULT_AUTH_API_URL : authApiUrl.replace(/\/+$/, '');
  const base = `${origin}/api/auth`;
  const entityId = `${base}/sso/saml2/sp/metadata`;
  return {
    metadataUrl: `${entityId}?providerId={providerId}`,
    acsUrl: `${base}/sso/saml2/sp/acs/{providerId}`,
    entityId,
  };
}

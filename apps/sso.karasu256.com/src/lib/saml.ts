/**
 * Derives the SAML 2.0 Service Provider connection values that
 * sso.karasu256.com publishes for identity provider administrators.
 *
 * The values are not configured on this site: they follow from the
 * better-auth base URL on api-auth.karasu256.com, whose `@better-auth/sso`
 * plugin serves the SP metadata document and the assertion consumer
 * service. `{providerId}` is a literal placeholder, because each registered
 * SSO provider has its own ID (and therefore its own ACS URL).
 */
export interface SamlConnectionInfo {
  /** SP metadata document URL, with the provider's ID as a query parameter. */
  metadataUrl: string;
  /** URL the IdP posts SAML responses to (the assertion consumer service). */
  acsUrl: string;
  /** SP entity ID, which the IdP sets as the audience of its assertions. */
  entityId: string;
}

export function getSamlConnectionInfo(authApiUrl: string): SamlConnectionInfo {
  const base = `${authApiUrl.replace(/\/+$/, '')}/api/auth`;
  const entityId = `${base}/sso/saml2/sp/metadata`;
  return {
    metadataUrl: `${entityId}?providerId={providerId}`,
    acsUrl: `${base}/sso/saml2/sp/acs/{providerId}`,
    entityId,
  };
}

import { oauthProviderResourceClient } from '@better-auth/oauth-provider/resource-client';
import { permissionBitmask, type AbstractPermission } from '@Hashibutogarasu/api-permissions';
import { createRouteAuth, vercelProtectionBypassHeaders } from '@Hashibutogarasu/utils/server';

/**
 * better-auth's internal `baseURL` — and therefore the JWT `iss`/`aud` and
 * the JWKS location — includes the auth mount path (`/api/auth`), not just
 * the origin. `OAUTH_ISSUER_URL` is the bare origin; this appends the path
 * better-auth actually uses everywhere it needs the full issuer identifier.
 */
const OAUTH_ISSUER = `${process.env.OAUTH_ISSUER_URL}/api/auth`;

const resourceClient = oauthProviderResourceClient();

/** api.karasu256.com owns permission resolution, so keys are verified there rather than against accounts directly. */
async function validateApiKey(token: string): Promise<{ userId: string; permissions: AbstractPermission[] } | null> {
  try {
    const res = await fetch(`${process.env.API_URL}/api-keys/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...vercelProtectionBypassHeaders(process.env.VERCEL_PROTECTION_BYPASS_SECRET) },
      body: JSON.stringify({ key: token }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const { userId, permissions } = (await res.json()) as { userId: string; permissions: string };
    return { userId, permissions: permissionBitmask.parse(BigInt(permissions)) };
  } catch {
    return null;
  }
}

/**
 * Verifies a bearer token issued by auth.karasu256.com's OAuth/OIDC
 * authorization server. Access tokens are JWTs, so this is a local,
 * DB-independent verification against the authorization server's published
 * JWKS — see `@better-auth/oauth-provider`'s recommendations for why this is
 * preferred over an opaque-token DB lookup or remote introspection.
 */
async function validateOauthToken(token: string): Promise<{ userId: string; scopes: string[] } | null> {
  try {
    const payload = await resourceClient.getActions().verifyBearerToken(token, {
      verifyOptions: { audience: OAUTH_ISSUER, issuer: OAUTH_ISSUER },
      jwksUrl: `${OAUTH_ISSUER}/jwks`,
    });
    if (!payload.sub) return null;
    const scopes = typeof payload.scope === 'string' ? payload.scope.split(' ') : [];
    return { userId: payload.sub, scopes };
  } catch {
    return null;
  }
}

export const { APIKeyRoute, OauthAppRoute, RequirePermission } = createRouteAuth({
  validator: { validateApiKey, validateOauthToken },
});

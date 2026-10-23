import { headers } from 'next/headers';
import { buildSignedAuthRequest, sendSignedAuthRequest } from '@/lib/auth/remote';

export interface ProviderProfile {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}

/**
 * Fetches the current user's profile for a linked provider from
 * api-auth.karasu256.com, which alone can decrypt the stored provider tokens.
 *
 * @returns `null` when the provider isn't linked or its profile can't be resolved.
 */
export async function getProviderProfile(providerId: string): Promise<ProviderProfile | null> {
  const cookie = (await headers()).get('cookie');
  const request = buildSignedAuthRequest(`/api/users/me/providers/${encodeURIComponent(providerId)}/details`, { cookie });
  const res = await sendSignedAuthRequest(request).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json()) as ProviderProfile;
}

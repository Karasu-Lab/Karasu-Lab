import { createAppAuthClient } from '@Hashibutogarasu/utils/client';

export const { authClient, bridgeFirebaseSession } = createAppAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_API_URL,
});

export function getSignInUrl(redirectTo: string): string {
  const url = new URL('/sign-in', process.env.NEXT_PUBLIC_AUTH_URL);
  url.searchParams.set('redirectTo', redirectTo);
  return url.toString();
}

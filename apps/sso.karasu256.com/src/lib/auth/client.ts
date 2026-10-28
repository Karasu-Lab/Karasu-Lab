import { createAppAuthClient } from '@Hashibutogarasu/utils/client';

export const { authClient, bridgeFirebaseSession } = createAppAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_API_URL,
});

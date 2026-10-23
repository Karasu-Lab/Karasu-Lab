import { NextResponse } from 'next/server';

import { getSessionUser, type SessionUser } from '@Hashibutogarasu/utils/server';

type SessionResult = { user: SessionUser; error: null } | { user: null; error: NextResponse };

/**
 * Reads and verifies the session (checked remotely against
 * api-auth.karasu256.com's better-auth instance).
 * Returns the session user on success, or a 401 NextResponse on failure.
 * All Route Handlers that require authentication must call this first.
 */
export async function requireSession(): Promise<SessionResult> {
  const user = await getSessionUser(process.env.NEXT_PUBLIC_AUTH_API_URL);
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { user, error: null };
}

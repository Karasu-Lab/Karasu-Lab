import { eq } from 'drizzle-orm';
import { getDb } from '@Hashibutogarasu/db';
import { firebaseUsers } from '@Hashibutogarasu/db/schema';

/**
 * Returns the Firebase UID linked to a better-auth user via the
 * `firebase_user` table, or null when the user is not linked yet. Sign-in
 * does not depend on this link; callers must treat null as "no Firebase
 * user to talk to" and skip Firebase-side work.
 */
export async function getLinkedFirebaseUid(userId: string): Promise<string | null> {
  const [link] = await getDb()
    .select({ firebaseUid: firebaseUsers.firebaseUid })
    .from(firebaseUsers)
    .where(eq(firebaseUsers.userId, userId))
    .limit(1);
  return link?.firebaseUid ?? null;
}

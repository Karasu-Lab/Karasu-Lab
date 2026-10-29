import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteUploadedImage, uploadImage } from '@Hashibutogarasu/utils/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { getLinkedFirebaseUid } from '@/lib/auth/firebase-uid';
import { getProviderProfile } from '@/lib/auth/provider-profile';
import { requireSession } from '@/lib/api/require-session';
import { badRequest } from '@/lib/api/responses';

const putBodySchema = z.object({ providerId: z.string().min(1) });

/**
 * Removes the previous icon from the image API when it was hosted there and
 * differs from the value it's being replaced by.
 */
async function cleanupPreviousIcon(
  previousPhotoURL: string | undefined,
  nextPhotoURL: string | null,
  imageApiUrl: string | undefined,
  cookieHeader: string | null
): Promise<void> {
  if (!imageApiUrl || !cookieHeader || !previousPhotoURL || previousPhotoURL === nextPhotoURL) return;
  await deleteUploadedImage(previousPhotoURL, { imageApiUrl, cookieHeader });
}

/**
 * Uploads the authenticated user's icon via the image API and updates the
 * Firebase Auth `photoURL` to point at it, deleting the previous icon once
 * the new one is persisted.
 *
 * POST /api/user/icon
 */
export async function POST(request: NextRequest) {
  const { user, error } = await requireSession();
  if (error) return error;

  const imageApiUrl = process.env.CDN_URL;
  if (!imageApiUrl) {
    return NextResponse.json({ error: 'image_api_not_configured' }, { status: 500 });
  }

  const incoming = await request.formData();
  const file = incoming.get('file');
  if (!(file instanceof File)) return badRequest();

  const cookieHeader = (await headers()).get('cookie');
  if (!cookieHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await uploadImage(file, {
    imageApiUrl,
    cookieHeader,
    path: `users/${user.id}/avatar.png`,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { url } = result;

  // The Firebase link is optional: unlinked users just skip the photoURL
  // sync (their icon still uploads and is returned).
  const firebaseUid = await getLinkedFirebaseUid(user.id);
  if (firebaseUid) {
    const previous = await getAdminAuth().getUser(firebaseUid);
    await getAdminAuth().updateUser(firebaseUid, { photoURL: url });
    await cleanupPreviousIcon(previous.photoURL, url, imageApiUrl, cookieHeader);
  }

  return NextResponse.json({ photoURL: url });
}

/**
 * Sets the authenticated user's icon to a linked provider's avatar,
 * re-deriving the avatar URL from the provider account server-side rather
 * than trusting a client-supplied URL.
 *
 * PUT /api/user/icon
 */
export async function PUT(request: NextRequest) {
  const { user, error } = await requireSession();
  if (error) return error;

  const parsed = putBodySchema.safeParse(await request.json());
  if (!parsed.success) return badRequest();

  const profile = await getProviderProfile(parsed.data.providerId);
  if (!profile || !profile.avatarUrl) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const imageApiUrl = process.env.CDN_URL;
  const cookieHeader = (await headers()).get('cookie');

  const firebaseUid = await getLinkedFirebaseUid(user.id);
  if (firebaseUid) {
    const previous = await getAdminAuth().getUser(firebaseUid);
    await getAdminAuth().updateUser(firebaseUid, { photoURL: profile.avatarUrl });
    await cleanupPreviousIcon(previous.photoURL, profile.avatarUrl, imageApiUrl, cookieHeader);
  }

  return NextResponse.json({ photoURL: profile.avatarUrl });
}

/**
 * Clears the authenticated user's icon, removing it from the image API when
 * it was hosted there.
 *
 * DELETE /api/user/icon
 */
export async function DELETE() {
  const { user, error } = await requireSession();
  if (error) return error;

  const imageApiUrl = process.env.CDN_URL;
  const cookieHeader = (await headers()).get('cookie');

  const firebaseUid = await getLinkedFirebaseUid(user.id);
  if (firebaseUid) {
    const previous = await getAdminAuth().getUser(firebaseUid);
    await getAdminAuth().updateUser(firebaseUid, { photoURL: null });
    await cleanupPreviousIcon(previous.photoURL, null, imageApiUrl, cookieHeader);
  }

  return NextResponse.json({ photoURL: null });
}

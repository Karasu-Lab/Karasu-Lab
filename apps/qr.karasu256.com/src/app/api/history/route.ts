import { NextResponse } from 'next/server';
import { MissingEnvError, deleteUploadedImage, verifyAppJwt } from '@Hashibutogarasu/utils/server';
import { deleteQrGenerations } from '@/lib/history';

function getImageApiUrl(): string {
  const imageApiUrl = process.env.CDN_URL;
  if (!imageApiUrl) throw new MissingEnvError('CDN_URL');
  return imageApiUrl;
}

/**
 * Deletes the caller's own QR generation history rows, and their uploaded
 * images on the CDN. Ids the caller doesn't own are silently ignored. Runs
 * on the Node.js runtime, since the Postgres client requires a raw TCP
 * socket unavailable on the Edge runtime.
 */
export async function DELETE(request: Request) {
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const uid = bearerToken ? await verifyAppJwt(bearerToken, process.env.NEXT_PUBLIC_AUTH_API_URL, process.env.VERCEL_PROTECTION_BYPASS_SECRET) : null;
  if (!bearerToken || !uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? body.ids.filter((id): id is string => typeof id === 'string') : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: 'No ids provided' }, { status: 400 });
  }

  const imageApiUrl = getImageApiUrl();
  const urls = await deleteQrGenerations(uid, ids);
  await Promise.all(urls.map((url) => deleteUploadedImage(url, { imageApiUrl, token: bearerToken })));

  return NextResponse.json({ deletedCount: urls.length });
}

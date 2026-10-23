/**
 * Sets a password for the authenticated user's account via api-auth.karasu256.com's
 * server-only `auth.api.setPassword` wrapper.
 *
 * @throws {Error} With the server's error message, when the request fails.
 */
export async function setPassword(newPassword: string): Promise<void> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_AUTH_API_URL ?? ''}/api/auth/set-password`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPassword }),
  });
  if (!res.ok) {
    const { error } = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(error ?? 'Failed to set password');
  }
}

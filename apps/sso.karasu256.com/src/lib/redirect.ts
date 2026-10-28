export function resolveRedirectTo(raw: string | null | undefined, trustedOrigins: readonly string[], fallback: string): string {
  if (!raw) return fallback;

  if (raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\')) return raw;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return fallback;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return fallback;
  if (!trustedOrigins.includes(url.origin)) return fallback;
  return url.toString();
}

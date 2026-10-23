import { getServerConfig } from '@/lib/config';
import { resolveRedirectTo } from '@/lib/redirect';

type SearchParams = Record<string, string | string[] | undefined>;

const OAUTH_SIGNATURE_PARAMS = ['sig', 'exp', 'prompt'];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function getDefaultRedirectTo(): string {
  return `${process.env.NEXT_PUBLIC_ACCOUNTS_URL ?? ''}/settings`;
}

export function getRedirectTo(raw: string | string[] | undefined): string {
  return resolveRedirectTo(first(raw), getServerConfig().trustedOrigins, getDefaultRedirectTo());
}

export function getContinueTo(searchParams: SearchParams): string {
  if (first(searchParams.sig) && first(searchParams.client_id)) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      const v = first(value);
      if (v !== undefined && !OAUTH_SIGNATURE_PARAMS.includes(key)) params.set(key, v);
    }
    return `${process.env.NEXT_PUBLIC_AUTH_API_URL ?? ''}/api/auth/oauth2/authorize?${params.toString()}`;
  }
  return getRedirectTo(searchParams.redirectTo);
}

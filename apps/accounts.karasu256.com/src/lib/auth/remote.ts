import { MissingEnvError, signRequest, vercelProtectionBypassHeaders } from '@Hashibutogarasu/utils/server';

export interface SignedAuthRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface SignedAuthRequestOptions {
  method?: string;
  body?: string;
  cookie?: string | null;
  origin?: string;
  timestamp?: number;
}

export function authUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_AUTH_API_URL ?? ''}${path}`;
}

export function buildSignedAuthRequest(path: string, options: SignedAuthRequestOptions = {}): SignedAuthRequest {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) throw new MissingEnvError('INTERNAL_API_SECRET');

  const method = options.method ?? 'GET';
  const url = authUrl(path);

  return {
    method,
    url,
    body: options.body,
    headers: {
      ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(options.cookie ? { cookie: options.cookie } : {}),
      ...(options.origin ? { origin: options.origin } : {}),
      ...vercelProtectionBypassHeaders(process.env.VERCEL_PROTECTION_BYPASS_SECRET),
      ...signRequest({ secret, method, url, body: options.body, timestamp: options.timestamp }),
    },
  };
}

export function sendSignedAuthRequest(request: SignedAuthRequest): Promise<Response> {
  return fetch(request.url, { method: request.method, headers: request.headers, body: request.body, cache: 'no-store' });
}

export function authFetch(path: string, request: Request, options: Pick<SignedAuthRequestOptions, 'method' | 'body'> = {}): Promise<Response> {
  return sendSignedAuthRequest(
    buildSignedAuthRequest(path, { ...options, cookie: request.headers.get('cookie'), origin: new URL(request.url).origin })
  );
}

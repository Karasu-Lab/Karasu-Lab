import { createHash, randomBytes } from 'node:crypto';
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { ACCOUNTS_URL, AUTH_API_URL, AUTH_URL, MOCK_OAUTH_URL } from '../playwright.config';

export type MockMode = 'redirect' | 'tamper-state';

export interface TestUser {
  email: string;
  password: string;
}

export function uniqueEmail(label: string): string {
  return `e2e-${label}-${Date.now()}-${randomBytes(4).toString('hex')}@example.test`;
}

export function returnTarget(): string {
  return `${ACCOUNTS_URL}/settings/profile?from=e2e&nonce=${randomBytes(4).toString('hex')}`;
}

export function signInPath(redirectTo: string): string {
  return `/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`;
}

export async function configureMockOAuth(request: APIRequestContext, mode: MockMode, email?: string): Promise<void> {
  const res = await request.post(`${MOCK_OAUTH_URL}/control`, {
    data: { mode, ...(email ? { profile: { email, name: email } } : {}) },
  });
  expect(res.ok()).toBeTruthy();
}

export async function signUp(request: APIRequestContext, label: string): Promise<TestUser> {
  const user = { email: uniqueEmail(label), password: `pw-${randomBytes(8).toString('hex')}` };
  const res = await request.post(`${AUTH_API_URL}/api/auth/sign-up/email`, {
    headers: { Origin: AUTH_URL },
    data: { ...user, name: user.email },
  });
  expect(res.ok(), `sign-up failed for ${user.email}`).toBeTruthy();
  return user;
}

export async function fillEmailPassword(page: Page, user: TestUser): Promise<void> {
  await page.getByRole('textbox', { name: 'メールアドレス' }).fill(user.email);
  await page.getByLabel('パスワード', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'サインイン', exact: true }).click();
}

export async function sessionEmail(page: Page): Promise<string | null> {
  const res = await page.request.get(`${AUTH_API_URL}/api/auth/get-session`);
  expect(res.ok()).toBeTruthy();
  const session = (await res.json()) as { user?: { email: string } } | null;
  return session?.user?.email ?? null;
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function providerCallbackPattern(provider: 'google' | 'github'): RegExp {
  return new RegExp(`^${AUTH_API_URL}/api/auth/(oauth2/)?callback/${provider}\\?`);
}

export function recordProviderStates(page: Page, provider: 'google' | 'github') {
  const states: { sent: string | null; received: string | null; callbackUrl: string | null } = { sent: null, received: null, callbackUrl: null };
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.origin === MOCK_OAUTH_URL && url.pathname === `/${provider}/authorize`) states.sent = url.searchParams.get('state');
    if (providerCallbackPattern(provider).test(req.url())) {
      states.received = url.searchParams.get('state');
      states.callbackUrl = req.url();
    }
  });
  return states;
}

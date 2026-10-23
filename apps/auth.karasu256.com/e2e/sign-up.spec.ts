import { test, expect } from '@playwright/test';
import { ACCOUNTS_URL, AUTH_API_URL } from '../playwright.config';
import { signInPath } from './helpers';

const FIREBASE_AUTH_EMULATOR_URL = 'http://127.0.0.1:9099';
const FIREBASE_PROJECT_ID = 'demo-karasu256';

test('creates an account from the sign-up form', async ({ page }) => {
  const email = `e2e-sign-up-${Date.now()}@example.test`;
  const password = `pw-${crypto.randomUUID()}`;

  const target = `${ACCOUNTS_URL}/settings/profile`;
  await page.goto(signInPath(target));
  await page.getByRole('tab', { name: 'アカウント作成' }).click();
  await page.getByRole('textbox', { name: 'メールアドレス' }).fill(email);
  await page.getByLabel('パスワード', { exact: true }).fill(password);
  await page.getByRole('checkbox').first().click();
  await page.getByRole('button', { name: 'アカウント作成', exact: true }).click();
  await page.waitForURL(target);

  const sessionRes = await page.request.get(`${AUTH_API_URL}/api/auth/get-session`);
  expect(sessionRes.ok()).toBeTruthy();
  const session = (await sessionRes.json()) as { user: { id: string; email: string } };
  expect(session.user.email).toBe(email);

  const lookupRes = await page.request.post(
    `${FIREBASE_AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/accounts:lookup`,
    { headers: { Authorization: 'Bearer owner' }, data: { localId: [session.user.id] } }
  );
  expect(lookupRes.ok()).toBeTruthy();
  const lookup = (await lookupRes.json()) as { users?: { email: string }[] };
  expect(lookup.users?.[0]?.email).toBe(email);
});

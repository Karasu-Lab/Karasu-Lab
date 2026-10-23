import { test, expect } from '@playwright/test';

const AUTH_URL = 'http://localhost:3004';
const AUTH_API_URL = 'http://localhost:8790';

test('signs in on auth, returns to settings, and signs out', async ({ page, request }) => {
  const email = `e2e-sign-in-${Date.now()}@example.test`;
  const password = `pw-${crypto.randomUUID()}`;

  const signUpRes = await request.post(`${AUTH_API_URL}/api/auth/sign-up/email`, {
    headers: { Origin: AUTH_URL },
    data: { email, password, name: email },
  });
  expect(signUpRes.ok()).toBeTruthy();

  await page.goto('/settings/profile');
  await page.waitForURL(`${AUTH_URL}/sign-in?**`);
  await page.getByRole('textbox', { name: 'メールアドレス' }).fill(email);
  await page.getByLabel('パスワード', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'サインイン', exact: true }).click();
  await page.waitForURL('/settings/profile');

  const sidebarFooter = page.locator('[data-slot="sidebar-footer"]');
  await expect(sidebarFooter.getByText(email).first()).toBeVisible();

  await sidebarFooter.getByText(email).first().click();
  await page.getByRole('menuitem', { name: 'サインアウト' }).click();
  await page.waitForURL(`${AUTH_URL}/sign-in?**`);

  const sessionRes = await page.request.get(`${AUTH_API_URL}/api/auth/get-session`);
  expect(sessionRes.ok()).toBeTruthy();
  expect(await sessionRes.json()).toBeNull();
});

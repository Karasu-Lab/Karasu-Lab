import { test, expect } from '@playwright/test';

const AUTH_URL = 'http://localhost:3004';
const AUTH_API_URL = 'http://localhost:8790';
const CDN_URL = 'http://localhost:8788';

test('generates a QR code for a signed-in user and serves it from the CDN', async ({ page }) => {
  const email = `e2e-qr-${Date.now()}@example.test`;
  const signUpRes = await page.request.post(`${AUTH_API_URL}/api/auth/sign-up/email`, {
    headers: { Origin: AUTH_URL },
    data: { email, password: `pw-${crypto.randomUUID()}`, name: email },
  });
  expect(signUpRes.ok()).toBeTruthy();
  const { user } = (await signUpRes.json()) as { user: { id: string } };

  await page.goto('/');
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('app-jwt'))).not.toBeNull();

  const qrResponse = page.waitForResponse((res) => res.url().endsWith('/api/qr') && res.request().method() === 'POST');
  await page.getByRole('button', { name: '再生成' }).click();
  const res = await qrResponse;
  expect(res.ok()).toBeTruthy();

  const qr = (await res.json()) as { url: string };
  expect(qr.url).toMatch(new RegExp(`^${CDN_URL}/qr/${user.id}/\\d+\\.png$`));
  await expect(page.getByRole('img', { name: 'QRコード' })).toHaveAttribute('src', qr.url);

  const imageRes = await page.request.get(qr.url);
  expect(imageRes.ok()).toBeTruthy();
  expect(imageRes.headers()['content-type']).toBe('image/png');
});

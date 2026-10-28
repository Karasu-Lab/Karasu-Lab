import { expect, test } from '@playwright/test';

test.describe('SSO sign-in page', () => {
  test('root redirects to the sign-in page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test('shows the SSO form and the SAML connection information', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.getByRole('textbox', { name: '仕事用メールアドレス' })).toBeVisible();
    await expect(page.getByRole('button', { name: /SSOで続行/ })).toBeVisible();
    await expect(page.getByText('SAML接続情報')).toBeVisible();
    await expect(page.getByText(/\/api\/auth\/sso\/saml2\/sp\/metadata/)).toBeVisible();
    await expect(page.getByText(/\/api\/auth\/sso\/saml2\/sp\/acs\/\{providerId\}/)).toBeVisible();
  });

  test('rejects an email whose domain has no SSO provider', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByRole('textbox', { name: '仕事用メールアドレス' }).fill('someone@unconfigured.example');
    await page.getByRole('button', { name: /SSOで続行/ }).click();
    await expect(page.getByText(/このドメイン向けのSSOは設定されていません/)).toBeVisible();
  });
});

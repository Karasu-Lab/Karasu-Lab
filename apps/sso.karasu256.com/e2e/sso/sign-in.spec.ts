import { expect, test } from '@playwright/test';

test.describe('SSO sign-in page', () => {
  test('root redirects to the sign-in page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test('shows the email step and opens the SAML connection information from the info button', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.getByRole('textbox', { name: 'メールアドレス' })).toBeVisible();
    await expect(page.getByRole('button', { name: '次へ', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'SAML接続情報' }).click();
    await expect(page.getByText('SAML接続情報')).toBeVisible();
    // The metadata URL specifically (with its query): the entity ID
    // element contains the same path, so a bare path pattern matches both.
    await expect(page.getByText(/\/api\/auth\/sso\/saml2\/sp\/metadata\?providerId=/)).toBeVisible();
    await expect(page.getByText(/\/api\/auth\/sso\/saml2\/sp\/acs\/\{providerId\}/)).toBeVisible();
  });

  test('shows an inline error for an email with no account', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByRole('textbox', { name: 'メールアドレス' }).fill('someone@unconfigured.example');
    await page.getByRole('button', { name: '次へ', exact: true }).click();
    await expect(page.getByText('このメールアドレスのアカウントが見つかりませんでした')).toBeVisible();
  });
});

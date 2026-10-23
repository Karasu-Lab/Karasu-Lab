import { test, expect, type APIRequestContext, type CDPSession, type Page } from '@playwright/test';
import { ACCOUNTS_URL, AUTH_API_URL, AUTH_URL, MOCK_OAUTH_URL } from '../playwright.config';
import {
  configureMockOAuth,
  createPkcePair,
  fillEmailPassword,
  recordProviderStates,
  returnTarget,
  sessionEmail,
  signInPath,
  signUp,
  uniqueEmail,
} from './helpers';

test.afterEach(async ({ request }) => {
  await configureMockOAuth(request, 'redirect');
});

async function addVirtualAuthenticator(page: Page): Promise<CDPSession> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  return cdp;
}

test('email/password sign-in returns to the original app', async ({ page, request }) => {
  const user = await signUp(request, 'email');
  const target = returnTarget();

  await page.goto(signInPath(target));
  await fillEmailPassword(page, user);

  await page.waitForURL(target);
  expect(await sessionEmail(page)).toBe(user.email);
});

for (const provider of ['google', 'github'] as const) {
  test(`${provider} sign-in round-trips state and returns to the original app`, async ({ page, request }) => {
    const email = uniqueEmail(provider);
    await configureMockOAuth(request, 'redirect', email);
    const states = recordProviderStates(page, provider);
    const target = returnTarget();

    await page.goto(signInPath(target));
    await page.getByRole('button', { name: provider === 'google' ? 'Google' : 'GitHub' }).click();

    await page.waitForURL(target);
    expect(states.sent).toBeTruthy();
    expect(states.received).toBe(states.sent);
    expect(await sessionEmail(page)).toBe(email);
  });
}

test('passkey sign-in returns to the original app', async ({ page, request }) => {
  const user = await signUp(request, 'passkey');
  await addVirtualAuthenticator(page);

  await page.goto(signInPath(`${ACCOUNTS_URL}/settings/security`));
  await fillEmailPassword(page, user);
  await page.waitForURL(`${ACCOUNTS_URL}/settings/security`);

  await page.getByRole('button', { name: 'パスキーを登録' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('パスキー名').fill('e2e');
  await dialog.getByRole('button', { name: 'パスキーを登録' }).click();
  await expect(dialog).not.toBeAttached({ timeout: 15_000 });

  await page.context().clearCookies();
  const target = returnTarget();
  await page.goto(signInPath(target));
  await page.getByRole('button', { name: 'パスキーでサインイン' }).click();

  await page.waitForURL(target);
  expect(await sessionEmail(page)).toBe(user.email);
});

test.describe('OAuth authorize flow', () => {
  const redirectUri = `${MOCK_OAUTH_URL}/client/callback`;

  async function createClient(request: Parameters<typeof signUp>[0]) {
    await signUp(request, 'oauth-owner');
    const res = await request.post(`${AUTH_API_URL}/api/auth/oauth2/create-client`, {
      headers: { Origin: AUTH_URL },
      data: { client_name: 'e2e client', redirect_uris: [redirectUri], scope: 'openid profile email' },
    });
    expect(res.ok()).toBeTruthy();
    return (await res.json()) as { client_id: string; client_secret: string };
  }

  function authorizeUrl(clientId: string, clientState: string, challenge: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      state: clientState,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    return `${AUTH_API_URL}/api/auth/oauth2/authorize?${params.toString()}`;
  }

  async function finishAtClient(
    page: Page,
    playwright: { request: { newContext: () => Promise<APIRequestContext> } },
    client: { client_id: string; client_secret: string },
    clientState: string,
    verifier: string
  ) {
    await page.waitForURL(/\/oauth\/consent/);
    await page.getByRole('button', { name: '許可する' }).click();
    await page.waitForURL((url) => url.toString().startsWith(redirectUri));

    const returned = new URL(page.url());
    expect(returned.searchParams.get('state')).toBe(clientState);
    const code = returned.searchParams.get('code');
    expect(code).toBeTruthy();

    const clientServer = await playwright.request.newContext();
    const tokenRes = await clientServer.post(`${AUTH_API_URL}/api/auth/oauth2/token`, {
      form: {
        grant_type: 'authorization_code',
        code: code!,
        redirect_uri: redirectUri,
        client_id: client.client_id,
        client_secret: client.client_secret,
        code_verifier: verifier,
      },
    });
    expect(tokenRes.ok(), await tokenRes.text()).toBeTruthy();
    expect(((await tokenRes.json()) as { access_token?: string }).access_token).toBeTruthy();
  }

  test('email/password sign-in continues to consent and returns the client state', async ({ page, request, playwright }) => {
    const client = await createClient(request);
    const user = await signUp(await playwright.request.newContext(), 'oauth-user');
    const { verifier, challenge } = createPkcePair();
    const clientState = `client-${Date.now()}`;

    await page.goto(authorizeUrl(client.client_id, clientState, challenge));
    await page.waitForURL(/\/sign-in\?.*sig=/);
    await fillEmailPassword(page, user);

    await finishAtClient(page, playwright, client, clientState, verifier);
  });

  test('google sign-in inside the authorize flow returns the client state', async ({ page, request, playwright }) => {
    const client = await createClient(request);
    await configureMockOAuth(request, 'redirect', uniqueEmail('oauth-google'));
    const states = recordProviderStates(page, 'google');
    const { verifier, challenge } = createPkcePair();
    const clientState = `client-${Date.now()}`;

    await page.goto(authorizeUrl(client.client_id, clientState, challenge));
    await page.waitForURL(/\/sign-in\?.*sig=/);
    await page.getByRole('button', { name: 'Google' }).click();

    await finishAtClient(page, playwright, client, clientState, verifier);
    expect(states.received).toBe(states.sent);
  });
});

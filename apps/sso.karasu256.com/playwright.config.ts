import { defineConfig, devices } from '@playwright/test';

export const SSO_URL = 'http://localhost:3007';
export const AUTH_API_URL = 'http://localhost:8790';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: SSO_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter api-auth.karasu256.com dev',
      url: `${AUTH_API_URL}/api/auth/ok`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm dev',
      url: `${SSO_URL}/sign-in`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      // The app's own .env.development leaves this empty, which makes the
      // client call its own origin for /api/auth/*. The variable holds
      // the api-auth ORIGIN in this app (the /api/auth path is appended
      // by the client and the URL helpers), so pass the origin of the
      // local stack's api-auth on 8790.
      env: {
        NEXT_PUBLIC_AUTH_API_URL: AUTH_API_URL,
      },
    },
    {
      // The throwaway SAML IdP that e2e/sso/saml-roundtrip.spec.ts runs
      // its round-trip against. Local only, like the rest of this stack.
      command: 'node e2e/sso/test-idp.mjs',
      url: 'http://127.0.0.1:7000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        IDP_PORT: '7000',
        AUTH_API_URL: `${AUTH_API_URL}/api/auth`,
        TEST_PROVIDER_ID: 'pw-saml-test',
      },
    },
  ],
});

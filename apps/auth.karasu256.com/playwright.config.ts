import { defineConfig, devices } from '@playwright/test';

export const AUTH_URL = 'http://localhost:3004';
export const AUTH_API_URL = 'http://localhost:8790';
export const ACCOUNTS_URL = 'http://localhost:3001';
export const MOCK_OAUTH_URL = 'http://localhost:3099';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: AUTH_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node e2e/mock-oauth-server.mjs',
      url: `${MOCK_OAUTH_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'pnpm --filter api-auth.karasu256.com dev',
      url: `${AUTH_API_URL}/api/auth/ok`,
      env: { E2E_MOCK_OAUTH_URL: MOCK_OAUTH_URL, CLOUDFLARE_INCLUDE_PROCESS_ENV: 'true' },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm dev',
      url: `${AUTH_URL}/sign-in`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter accounts.karasu256.com dev',
      url: `${ACCOUNTS_URL}/.well-known/webauthn`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});

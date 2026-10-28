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
    },
  ],
});

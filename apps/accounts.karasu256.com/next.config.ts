import fs from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { parse as parseYaml } from 'yaml';

/**
 * The hosts of `trustedOrigins` in `config/config.development.yml`, which the dev server must accept
 * HMR and dev resource requests from when the app is reached through the local cloudflared tunnel.
 */
const developmentTrustedHosts: string[] = (
  (parseYaml(fs.readFileSync(path.join(process.cwd(), 'config', 'config.development.yml'), 'utf-8')) as { trustedOrigins?: string[] })
    .trustedOrigins ?? []
).map((origin) => new URL(origin).hostname);

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Build-time values inlined into the server bundle so each deployment stays pinned
 * to the database it was built against, even if the runtime environment changes later.
 */
const buildTimeEnv: Record<string, string> = process.env.DATABASE_URL ? { DATABASE_URL: process.env.DATABASE_URL } : {};

const nextConfig: NextConfig = {
  transpilePackages: ['@Hashibutogarasu/db', '@Hashibutogarasu/ui', '@Hashibutogarasu/utils', '@Hashibutogarasu/flags'],
  devIndicators: false,
  allowedDevOrigins: developmentTrustedHosts,
  env: buildTimeEnv,
};

export default withNextIntl(nextConfig);

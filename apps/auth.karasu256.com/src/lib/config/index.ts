import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

const configFileSchema = z.object({
  trustedOrigins: z.array(z.string().url()).min(1),
});

export type ServerConfig = z.infer<typeof configFileSchema>;

let cached: ServerConfig | undefined;

/**
 * Selects the environment-specific config file name: `config.preview.yml` on
 * Vercel Preview deployments (`VERCEL_ENV=preview`, served only from
 * dev-auth.karasu256.com), otherwise `config.production.yml` or
 * `config.development.yml` by `NODE_ENV`.
 */
function getEnvConfigFileName(): string {
  if (process.env.VERCEL_ENV === 'preview') return 'config.preview.yml';
  return process.env.NODE_ENV === 'production' ? 'config.production.yml' : 'config.development.yml';
}

/**
 * Returns the validated server configuration read from the
 * environment-specific `config/*.yml` file. The trusted origins are the only
 * redirect targets the sign-in and sign-out pages accept. The result is
 * cached for the lifetime of the Node.js process.
 *
 * @throws when the config file is missing or fails validation.
 */
export function getServerConfig(): ServerConfig {
  if (cached !== undefined) return cached;

  const raw = fs.readFileSync(path.join(process.cwd(), 'config', getEnvConfigFileName()), 'utf-8');
  cached = configFileSchema.parse(parseYaml(raw));
  return cached;
}

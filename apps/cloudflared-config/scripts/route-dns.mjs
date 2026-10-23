import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const configPath = fileURLToPath(new URL('../config.yml', import.meta.url));
const { tunnel, ingress } = parseYaml(fs.readFileSync(configPath, 'utf-8'));

/**
 * `--overwrite-dns` makes a hostname that already points at this tunnel a no-op, and a failure stops the tunnel from
 * starting: an ingress rule without a CNAME looks like a working route but cannot be resolved by any client.
 */
for (const { hostname } of ingress) {
  if (!hostname) continue;
  execFileSync('cloudflared', ['tunnel', '--config', configPath, 'route', 'dns', '--overwrite-dns', tunnel, hostname], { stdio: 'inherit' });
}

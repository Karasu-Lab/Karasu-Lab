import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Creates a new Drizzle client with the given connection URL.
 * Useful in environments where the URL comes from a binding (e.g. Cloudflare Hyperdrive)
 * rather than an environment variable. Unlike `./client`, this module does not import
 * `server-only`, so it can be bundled into a Cloudflare Worker.
 */
export function createDb(url: string): Db {
  const sql = postgres(url, { max: 1 });
  return drizzle(sql, { schema });
}

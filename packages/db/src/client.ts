import 'server-only';
import { createDb, type Db } from './create-db';

export { createDb };

let _db: Db | undefined;

/**
 * Returns a singleton Drizzle client using DATABASE_URL.
 * Sets max connections to 1 to avoid pool exhaustion in serverless environments.
 */
export function getDb(): Db {
  if (!_db) {
    _db = createDb(process.env.DATABASE_URL!);
  }
  return _db;
}

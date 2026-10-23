import type { NodeEnv } from '@Hashibutogarasu/types';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: NodeEnv;
      NEXT_PUBLIC_AUTH_URL: string;
      NEXT_PUBLIC_AUTH_API_URL: string;
      /**
       * Server-only base URL of the image API Worker (see `qr.ts`'s
       * `getImageApiUrl` and `R2StorageProvider`). Deliberately not
       * `NEXT_PUBLIC_*`: that prefix gets inlined into the bundle at build
       * time, which risks baking in a stale value per environment; this is
       * read from `process.env` at request time on the server and passed
       * down to the client via `R2StorageProvider`'s props instead.
       */
      CDN_URL: string;
      FIREBASE_ADMIN_PROJECT_ID: string;
      FIREBASE_ADMIN_CLIENT_EMAIL: string;
      FIREBASE_ADMIN_PRIVATE_KEY: string;
    }
  }
}

export {};

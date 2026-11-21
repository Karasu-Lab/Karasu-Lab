# Karasu Lab

This is my website workdirectory managed by pnpm.

# Features

- [x] Base authentication
- [x] Scoped API Key OAuth
- [x] Single sign-on (SAML 2.0 / OIDC) via sso.karasu256.com

## How to use

### Install dependencies

```
pnpm install
```

or

```
pnpm i
```

### Build

```
pnpm build
```

## Minecraft Authentication

Links a Minecraft account to a signed-in user through a 6-character code. `mc-auth.karasu256.com` issues the code, and `api-auth.karasu256.com` stores the link.

### Flow

1. A Minecraft client connects to the TCP gateway on port 25565. The gateway verifies the player with Mojang, then calls `POST /api/mc/challenge`, which creates a session (valid for 15 minutes) and returns the code and the kick message.
2. The gateway kicks the player with the code and sends a `kick` event to `POST /`. The code is then stored as a salted hash and the raw code is discarded. Server list pings are answered with the online player count.
3. The user enters the code in the account linking dialog of `accounts.karasu256.com`, which calls `GET /api/mc/verify?code=`.
4. `mc-auth.karasu256.com` checks the better-auth session and asks `api-auth.karasu256.com` to link the Minecraft account.

`/api/mc/challenge` and `POST /` only accept requests signed with `INTERNAL_API_SECRET`.

### Ports

| Service                  | Port  | Note                                          |
| ------------------------ | ----- | --------------------------------------------- |
| Minecraft TCP gateway    | 25565 | Started with `mc-auth.karasu256.com`          |
| `mc-auth.karasu256.com`  | 8793  | Inspector port 9235                           |
| `api-auth.karasu256.com` | 8790  |                                               |
| `api.karasu256.com`      | 8789  |                                               |
| `accounts.karasu256.com` | 3001  | Connects to the local services above          |
| `auth.karasu256.com`     | 3004  | Connects to the local services above          |
| PostgreSQL               | 5433  | Docker                                        |
| Redis REST               | 8079  | Docker, token `local-development-redis-token` |

The local D1 database is created by the `d1-migrate` Docker service from `apps/mc-auth.karasu256.com/drizzle/migrations`.

### Run

Enter the Nix dev shell (`nix develop`, or direnv), then run:

```
pnpm dev:mc
```

This starts the Docker daemon (rootless) if it is not running, then the Docker services, and finally the five dev servers through turbo. The local connection settings are committed in each app's `wrangler.jsonc` (`env.local`) and `.env.development`, so no extra files are needed.

To delete the Docker volumes (for example to recreate the local database), run:

```
pnpm dev:volume-purge
```

To delete all local data (the Docker volumes and the local D1 and other local Cloudflare state under `apps/*/.wrangler/state`), run:

```
pnpm dev:purge
```

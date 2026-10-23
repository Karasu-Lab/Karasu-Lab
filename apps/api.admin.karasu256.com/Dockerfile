FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache git && corepack enable && corepack prepare pnpm@11.12.0 --activate

FROM base AS pruner
WORKDIR /app
RUN pnpm add -g turbo@latest
COPY . .
RUN turbo prune api.admin.karasu256.com --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .
RUN pnpm --filter api.admin.karasu256.com run build

FROM base AS deployer
WORKDIR /app
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .
RUN pnpm --filter api.admin.karasu256.com deploy --prod /app/deploy

FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=deployer --chown=nestjs:nodejs /app/deploy/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api.admin.karasu256.com/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api.admin.karasu256.com/configs ./configs

USER nestjs
EXPOSE 3006
ENV NODE_ENV=production
CMD ["node", "dist/main"]

FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc* ./
COPY packages/types/package.json ./packages/types/
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/
RUN pnpm install --frozen-lockfile

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc* ./
COPY packages/types/package.json ./packages/types/
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/
RUN pnpm install --prod --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY packages/types/package.json ./packages/types/
COPY packages/types/src ./packages/types/src/
COPY packages/types/tsconfig.json ./packages/types/
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/
COPY apps/backend/src ./apps/backend/src/
COPY apps/backend/prisma ./apps/backend/prisma/
COPY apps/backend/tsconfig.json ./apps/backend/
COPY apps/backend/tsconfig.build.json ./apps/backend/
COPY apps/backend/nest-cli.json ./apps/backend/
RUN pnpm --filter @xuno/types build
RUN pnpm --filter @xuno/shared build
RUN pnpm --filter @xuno/backend build
RUN pnpm --filter @xuno/backend db:generate

FROM node:20-alpine AS runner
LABEL version="1.0.0"
LABEL description="XunO Backend - AI-driven personal styling platform"
LABEL maintainer="XunO Team"

RUN apk add --no-cache tini curl

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/prisma ./prisma
COPY --from=builder /app/packages/types/dist ./node_modules/@xuno/types/dist
COPY --from=builder /app/packages/types/package.json ./node_modules/@xuno/types/package.json
COPY --from=builder /app/packages/shared ./packages/shared
COPY scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh && chown nestjs:nodejs /app/docker-entrypoint.sh

RUN chown -R nestjs:nodejs /app

USER nestjs
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/api/v1/health || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/app/docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]

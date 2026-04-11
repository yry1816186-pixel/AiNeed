# Locked base image version for reproducibility and security
FROM node:20.11.0-alpine3.19 AS base

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/types/package.json ./packages/types/
COPY apps/backend/package.json ./apps/backend/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @aineed/types build
RUN pnpm --filter @aineed/backend build
RUN pnpm --filter @aineed/backend db:generate

FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/node_modules ./node_modules
COPY --from=builder /app/apps/backend/prisma ./prisma
COPY --from=builder /app/packages/types/dist ./node_modules/@aineed/types/dist
COPY --from=builder /app/packages/types/package.json ./node_modules/@aineed/types/package.json

RUN chown -R nestjs:nodejs /app

USER nestjs
EXPOSE 3001
CMD ["node", "dist/main.js"]

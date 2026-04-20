#!/bin/bash
set -euo pipefail

echo "=== AiNeed Dev Environment ==="

# Start infrastructure services
docker compose -f docker-compose.dev.yml up -d postgres redis minio qdrant

# Wait for postgres
echo "Waiting for PostgreSQL..."
until docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
  sleep 1
done

# Run migrations
cd apps/backend
npx prisma migrate dev
cd ../..

# Start backend in background
pnpm --filter backend dev &
BACKEND_PID=$!

# Start mobile dev
echo "Starting mobile dev server..."
cd apps/mobile
npx expo start

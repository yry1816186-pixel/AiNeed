#!/bin/bash
set -euo pipefail

echo "=== AiNeed Production Deploy ==="

# 1. Check environment
if [ ! -f .env ]; then
  echo "ERROR: .env file not found. Copy .env.example and fill in values."
  exit 1
fi

# 2. Pull latest code (if git repo)
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Pulling latest code..."
  git pull origin main
fi

# 3. Install dependencies
echo "Installing dependencies..."
pnpm install --frozen-lockfile

# 4. Run database migrations
echo "Running database migrations..."
cd apps/backend
npx prisma migrate deploy
cd ../..

# 5. Build all services
echo "Building services..."
pnpm --filter backend build
pnpm --filter admin build

# 6. Docker compose up
echo "Starting services..."
docker compose -f docker-compose.yml up -d --build

# 7. Wait for health checks
echo "Waiting for services to be healthy..."
sleep 10

# Verify backend
BACKEND_HEALTH=$(curl -sf http://localhost:3001/health | head -1 || echo "FAIL")
if [[ "$BACKEND_HEALTH" == *"ok"* ]] || [[ "$BACKEND_HEALTH" == *"healthy"* ]]; then
  echo "Backend: OK"
else
  echo "Backend: waiting..."
  sleep 15
  curl -sf http://localhost:3001/health || echo "Backend health check failed"
fi

echo "=== Deploy complete ==="
echo "Backend:  http://localhost:3001"
echo "Admin:    http://localhost:3002"
echo "API Docs: http://localhost:3001/api/docs"

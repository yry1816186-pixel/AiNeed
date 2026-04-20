#!/bin/bash
set -euo pipefail

echo "=== AiNeed Rollback ==="

# Rollback to previous docker images
docker compose down

# Rollback database
if [ "${1:-}" = "--db" ]; then
  echo "Rolling back last migration..."
  cd apps/backend
  npx prisma migrate resolve --rolled-back $(npx prisma migrate status 2>&1 | grep "Database schema is up to date" > /dev/null && echo "none" || npx prisma migrate status 2>&1 | grep -oP '^\d{14}.*(?=.*applied)' | head -1)
  cd ../..
fi

# Start previous version
git checkout HEAD~1 -- .
docker compose -f docker-compose.yml up -d --build

echo "=== Rollback complete ==="

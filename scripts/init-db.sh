#!/bin/bash
set -euo pipefail

echo "=== AiNeed Database Initialization ==="

cd "$(dirname "$0")/../apps/backend"

echo "Waiting for PostgreSQL..."
until npx prisma db push --accept-data-loss 2>/dev/null; do
  echo "  PostgreSQL not ready, retrying in 2s..."
  sleep 2
done

echo "Running migrations..."
npx prisma migrate deploy

echo "Running seed..."
npx prisma db seed

echo ""
echo "=== Database initialized ==="
echo "Run 'npx prisma studio' to view data at http://localhost:5555"

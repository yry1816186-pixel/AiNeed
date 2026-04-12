#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/apps/backend"

if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "ERROR: $BACKEND_DIR/.env not found."
  exit 1
fi

source "$BACKEND_DIR/.env"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set in .env"
  exit 1
fi

ENV="${APP_ENV:-development}"

echo "========================================="
echo "  AiNeed V3 - Database Migrate"
echo "  Environment: $ENV"
echo "========================================="
echo ""

cd "$BACKEND_DIR"

if [ "$ENV" = "production" ]; then
  echo "Running production migration (prisma migrate deploy)..."
  npx prisma migrate deploy 2>&1
else
  echo "Running development migration (prisma migrate dev)..."
  MIGRATION_NAME="${1:-}"
  if [ -n "$MIGRATION_NAME" ]; then
    npx prisma migrate dev --name "$MIGRATION_NAME" --create-only 2>&1
    echo ""
    echo "Migration files created. Review them, then run:"
    echo "  npx prisma migrate dev"
  else
    npx prisma migrate dev 2>&1
  fi
fi

echo ""
echo "Generating Prisma client..."
npx prisma generate 2>&1

echo ""
echo "========================================="
echo "  Migration complete!"
echo "========================================="

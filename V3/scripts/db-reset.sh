#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/apps/backend"

if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "ERROR: $BACKEND_DIR/.env not found. Copy .env.example and configure DATABASE_URL."
  exit 1
fi

source "$BACKEND_DIR/.env"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set in .env"
  exit 1
fi

DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "========================================="
echo "  AiNeed V3 - Database Reset"
echo "========================================="
echo "  Host:   $DB_HOST:$DB_PORT"
echo "  User:   $DB_USER"
echo "  DB:     $DB_NAME"
echo "========================================="
echo ""
echo "WARNING: This will DELETE all data and recreate the database!"
read -rp "Type 'yes' to continue: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "[1/4] Dropping database..."
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" 2>/dev/null || {
  echo "  Could not drop via psql, trying Prisma..."
}

echo "[2/4] Creating database..."
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\";" 2>/dev/null || {
  echo "  Database may already exist, continuing..."
}

echo "[3/4] Running migrations..."
cd "$BACKEND_DIR"
npx prisma migrate deploy 2>&1

echo "[4/4] Seeding data..."
npx tsx prisma/seed.ts 2>&1

echo ""
echo "========================================="
echo "  Database reset complete!"
echo "========================================="

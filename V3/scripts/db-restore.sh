#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/apps/backend"
BACKUP_DIR="$PROJECT_ROOT/backups"

if [ -z "${1:-}" ]; then
  echo "Usage: ./db-restore.sh <backup_file>"
  echo ""
  echo "Available backups:"
  if ls "$BACKUP_DIR"/*.sql.gz 1>/dev/null 2>&1; then
    ls -lht "$BACKUP_DIR"/*.sql.gz | awk '{print "  " $NF " (" $5 ", " $6 " " $7 ")"}'
  else
    echo "  No backups found in $BACKUP_DIR/"
  fi
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "ERROR: $BACKEND_DIR/.env not found."
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
echo "  AiNeed V3 - Database Restore"
echo "========================================="
echo "  Host:   $DB_HOST:$DB_PORT"
echo "  DB:     $DB_NAME"
echo "  File:   $BACKUP_FILE"
echo "========================================="
echo ""
echo "WARNING: This will OVERWRITE the current database!"
read -rp "Type 'yes' to continue: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "Restoring from backup..."

if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" | PGPASSWORD="$DB_PASS" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -v ON_ERROR_STOP=0 \
    2>&1 | tail -5
else
  PGPASSWORD="$DB_PASS" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -v ON_ERROR_STOP=0 \
    -f "$BACKUP_FILE" \
    2>&1 | tail -5
fi

echo ""
echo "========================================="
echo "  Restore complete!"
echo "  Run 'npx prisma generate' if needed."
echo "========================================="

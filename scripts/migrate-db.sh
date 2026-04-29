#!/bin/bash
set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "=== DRY RUN MODE — no changes will be applied ==="
fi

echo "=== Prisma Migration Runner ==="

SCHEMA_PATH="apps/backend/prisma/schema.prisma"

echo "[1/4] Checking migration status..."
npx prisma migrate status --schema="$SCHEMA_PATH" 2>&1 || true

echo "[2/4] Checking for pending migrations..."
PENDING=$(npx prisma migrate diff \
  --from-schema-datasource "$SCHEMA_PATH" \
  --to-schema-datamodel "$SCHEMA_PATH" \
  --script 2>/dev/null | wc -l)

if [ "$PENDING" -le 1 ]; then
  echo "  No pending migrations. Database is up to date."
  exit 0
fi

echo "  Found ${PENDING} lines of pending migration SQL."

echo "[3/4] Creating pre-migration backup..."
bash scripts/backup-db.sh
echo "  Backup created."

if [ "$DRY_RUN" = true ]; then
  echo "[4/4] DRY RUN — would run: npx prisma migrate deploy --schema=$SCHEMA_PATH"
  echo "=== Dry run complete (no changes applied) ==="
  exit 0
fi

echo "[4/4] Applying migrations..."
npx prisma migrate deploy --schema="$SCHEMA_PATH"
echo "  Migrations applied."

echo "[5/5] Regenerating Prisma client..."
npx prisma generate --schema="$SCHEMA_PATH"
echo "  Client regenerated."

echo "=== Migration complete ==="

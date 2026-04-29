#!/bin/bash
set -euo pipefail

PREVIOUS_TAG="${1:?Usage: $0 <previous_image_tag> [--with-db-restore <backup_dir>]}"
WITH_DB=false
BACKUP_DIR=""

shift
while [[ $# -gt 0 ]]; do
  case $1 in
    --with-db-restore)
      WITH_DB=true
      BACKUP_DIR="${2:?Missing backup directory}"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }

echo "=== Deployment Rollback ==="
echo "Reverting to image tag: ${PREVIOUS_TAG}"

COMPOSE_FILE="docker-compose.production.yml"

echo "[1/4] Stopping current deployment..."
docker compose -f "$COMPOSE_FILE" stop backend ai-service
log_info "Services stopped"

if [ "$WITH_DB" = true ]; then
  echo "[2/4] Restoring database from: ${BACKUP_DIR}"
  bash scripts/restore-db.sh "$BACKUP_DIR"
  log_info "Database restored"
else
  echo "[2/4] Database rollback skipped (use --with-db-restore to restore)"
fi

echo "[3/4] Deploying previous image: ghcr.io/${GHCR_OWNER:-xuno}/xuno-backend:${PREVIOUS_TAG}"
BACKEND_IMAGE="ghcr.io/${GHCR_OWNER:-xuno}/xuno-backend:${PREVIOUS_TAG}" \
  AI_SERVICE_IMAGE="ghcr.io/${GHCR_OWNER:-xuno}/xuno-ai-service:${PREVIOUS_TAG}" \
  docker compose -f "$COMPOSE_FILE" up -d backend ai-service
log_info "Previous image deployed"

echo "[4/4] Running health checks..."
sleep 5
bash scripts/verify-deploy.sh "$COMPOSE_FILE"

echo "=== Rollback complete. Services running on tag: ${PREVIOUS_TAG} ==="

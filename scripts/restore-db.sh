#!/bin/bash
set -euo pipefail

BACKUP_DIR="${1:?Usage: $0 <backup_directory>}"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "ERROR: Backup directory not found: $BACKUP_DIR"
    exit 1
fi

TIMESTAMP=$(basename "$BACKUP_DIR")

PG_CONTAINER="${PG_CONTAINER:-prod-postgres}"
PG_DB="${POSTGRES_DB:-xuno}"
QDRANT_CONTAINER="${QDRANT_CONTAINER:-prod-qdrant}"
QDRANT_COLLECTION="${QDRANT_COLLECTION_CLOTHING:-xuno_clothing}"
NEO4J_CONTAINER="${NEO4J_CONTAINER:-prod-neo4j}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }

echo "=== Database Restore from: ${TIMESTAMP} ==="
echo "WARNING: This will overwrite current data. Press Ctrl+C to abort."
sleep 5

# Pre-flight checks
echo ""
echo "--- Pre-flight Checks ---"
ERRORS=0

MANIFEST="${BACKUP_DIR}/manifest.json"
if [ -f "$MANIFEST" ]; then
    log_info "Backup manifest found: $(cat "$MANIFEST" | jq -r '.backup_name // "unknown"')"
fi

BACKUP_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
log_info "Backup size: ${BACKUP_SIZE}"

# Check available disk space (need at least 2x backup size)
AVAIL_KB=$(df -k "$(dirname "${BACKUP_DIR}")" | tail -1 | awk '{print $4}')
BACKUP_KB=$(du -sk "${BACKUP_DIR}" | cut -f1)
if [ "$((BACKUP_KB * 2))" -gt "$AVAIL_KB" ]; then
    log_error "Insufficient disk space. Need at least 2x backup size."
    log_error "Available: $((AVAIL_KB / 1024))MB, Backup: $((BACKUP_KB / 1024))MB"
    exit 1
fi
log_info "Disk space: $((AVAIL_KB / 1024))MB available (sufficient)"

# Verify checksums
log_info "Verifying backup checksums..."
for SHA_FILE in "${BACKUP_DIR}"/*.sha256; do
    [ -f "$SHA_FILE" ] || continue
    if sha256sum -c "$SHA_FILE" &>/dev/null; then
        log_info "Checksum OK: $(basename "${SHA_FILE}" .sha256)"
    else
        log_error "Checksum FAILED: $(basename "${SHA_FILE}" .sha256)"
        ERRORS=$((ERRORS + 1))
    fi
done

if [ ${ERRORS} -gt 0 ]; then
    log_error "Pre-flight checks failed with ${ERRORS} error(s). Aborting."
    exit 1
fi

echo ""
echo "--- Starting Restore ---"

# PostgreSQL restore
PG_DUMP=$(ls "${BACKUP_DIR}"/postgres-*.sql.gz 2>/dev/null | head -1)
if [ -n "$PG_DUMP" ] && [ -f "$PG_DUMP" ]; then
    echo "[1/3] Restoring PostgreSQL..."

    if docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
        # Create pre-restore safety backup
        PRE_RESTORE="/tmp/pre_restore_postgres_$(date +%Y%m%d_%H%M%S).sql.gz"
        log_info "Creating pre-restore safety backup..."
        docker exec "${PG_CONTAINER}" pg_dump -U "${POSTGRES_USER:-xuno}" -d "${PG_DB}" \
            --format=plain --no-owner --no-acl 2>/dev/null | gzip > "${PRE_RESTORE}" || true

        # Terminate existing connections
        docker exec "${PG_CONTAINER}" psql -U "${POSTGRES_USER:-xuno}" -c \
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${PG_DB}' AND pid <> pg_backend_pid();" 2>/dev/null || true

        # Restore
        zcat "$PG_DUMP" | docker exec -i "${PG_CONTAINER}" psql -U "${POSTGRES_USER:-xuno}" -d "${PG_DB}" 2>/dev/null || {
            log_error "PostgreSQL restore failed"
            ERRORS=$((ERRORS + 1))
        }

        # Verify
        TABLE_COUNT=$(docker exec "${PG_CONTAINER}" psql -U "${POSTGRES_USER:-xuno}" -d "${PG_DB}" \
            -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
        log_info "PostgreSQL restored. Tables: ${TABLE_COUNT}"
    else
        log_warn "PostgreSQL container not running, skipping"
    fi
else
    log_warn "No PostgreSQL backup found, skipping"
fi

# Qdrant restore
QDR_SNAP=$(ls "${BACKUP_DIR}"/qdrant-*.snapshot 2>/dev/null | head -1)
if [ -n "$QDR_SNAP" ] && [ -f "$QDR_SNAP" ]; then
    echo "[2/3] Restoring Qdrant..."

    # Delete existing collection
    curl -s -X DELETE "http://localhost:6333/collections/${QDRANT_COLLECTION}" || true

    # Recreate collection
    curl -s -X PUT "http://localhost:6333/collections/${QDRANT_COLLECTION}" \
        -H "Content-Type: application/json" \
        -d '{"vectors": {"size": 768, "distance": "Cosine"}}'

    sleep 2

    # Upload snapshot via Qdrant recovery upload
    curl -s -X POST "http://localhost:6333/collections/${QDRANT_COLLECTION}/snapshots/upload" \
        -F "snapshot=@${QDR_SNAP}" || {
        log_error "Qdrant snapshot upload failed"
        ERRORS=$((ERRORS + 1))
    }

    # Verify
    POINT_COUNT=$(curl -s "http://localhost:6333/collections/${QDRANT_COLLECTION}" | jq -r '.result.points_count // 0' 2>/dev/null || echo "unknown")
    log_info "Qdrant restored. Points: ${POINT_COUNT}"
else
    log_warn "No Qdrant backup found, skipping"
fi

# Neo4j restore
NEO_DUMP=$(ls "${BACKUP_DIR}"/neo4j-*.dump 2>/dev/null | head -1)
if [ -n "$NEO_DUMP" ] && [ -f "$NEO_DUMP" ]; then
    echo "[3/3] Restoring Neo4j..."

    if docker ps --format '{{.Names}}' | grep -q "^${NEO4J_CONTAINER}$"; then
        docker cp "$NEO_DUMP" "${NEO4J_CONTAINER}:/tmp/neo4j.dump"
        docker exec "${NEO4J_CONTAINER}" neo4j-admin database restore neo4j \
            --from-path=/tmp/ --overwrite-destination 2>/dev/null || \
            docker exec "${NEO4J_CONTAINER}" neo4j-admin load \
            --database=neo4j --from=/tmp/neo4j.dump --force 2>/dev/null || {
            log_error "Neo4j restore failed"
            ERRORS=$((ERRORS + 1))
        }
        docker exec "${NEO4J_CONTAINER}" rm -f /tmp/neo4j.dump 2>/dev/null || true
        log_info "Neo4j restored"
    else
        log_warn "Neo4j container not running, skipping"
    fi
else
    log_warn "No Neo4j backup found, skipping"
fi

echo ""
echo "=== Restore complete ==="
echo "Errors: ${ERRORS}"
echo ""
echo "Restart affected services:"
echo "  docker compose -f docker-compose.production.yml restart backend ai-service"
echo ""
echo "Verify restore:"
echo "  curl -s http://localhost:3001/api/v1/health"

if [ ${ERRORS} -eq 0 ]; then
    exit 0
else
    exit 1
fi

#!/bin/bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/backups}/${TIMESTAMP}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
BACKUP_DEST="${BACKUP_DEST:-local}"

PG_CONTAINER="${PG_CONTAINER:-prod-postgres}"
PG_DB="${POSTGRES_DB:-xuno}"
QDRANT_CONTAINER="${QDRANT_CONTAINER:-prod-qdrant}"
QDRANT_COLLECTION="${QDRANT_COLLECTION_CLOTHING:-xuno_clothing}"
NEO4J_CONTAINER="${NEO4J_CONTAINER:-prod-neo4j}"
MINIO_CONTAINER="${MINIO_CONTAINER:-prod-minio}"
MINIO_BACKUP_BUCKET="${MINIO_BACKUP_BUCKET:-xuno-backups}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }

mkdir -p "${BACKUP_DIR}"

echo "=== Database Backup: ${TIMESTAMP} ==="
echo "Backup directory: ${BACKUP_DIR}"
echo "Retention: ${RETENTION_DAYS} days"

ERRORS=0

# PostgreSQL backup
echo "[1/3] Backing up PostgreSQL..."
if docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
    BACKUP_FILE="${BACKUP_DIR}/postgres-${TIMESTAMP}.sql.gz"
    if docker exec "${PG_CONTAINER}" pg_dump -U "${POSTGRES_USER:-xuno}" -d "${PG_DB}" \
        --format=plain --no-owner --no-acl | gzip > "${BACKUP_FILE}"; then
        SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
        sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"
        log_info "PostgreSQL backup: ${SIZE} -> $(basename "${BACKUP_FILE}")"
    else
        log_error "PostgreSQL backup failed"
        ERRORS=$((ERRORS + 1))
    fi
else
    log_warn "PostgreSQL container '${PG_CONTAINER}' not running, skipping"
fi

# Qdrant snapshot
echo "[2/3] Creating Qdrant snapshot..."
if docker ps --format '{{.Names}}' | grep -q "^${QDRANT_CONTAINER}$"; then
    SNAPSHOT_RESULT=$(curl -s -w "\n%{http_code}" -X POST \
        "http://localhost:6333/collections/${QDRANT_COLLECTION}/snapshots" \
        -H "Content-Type: application/json")
    HTTP_CODE=$(echo "$SNAPSHOT_RESULT" | tail -1)
    BODY=$(echo "$SNAPSHOT_RESULT" | sed '$d')

    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        SNAPSHOT_NAME=$(echo "$BODY" | jq -r '.result.name // empty' 2>/dev/null || true)
        if [ -n "$SNAPSHOT_NAME" ]; then
            QDRANT_FILE="${BACKUP_DIR}/qdrant-${QDRANT_COLLECTION}-${TIMESTAMP}.snapshot"
            if curl -s -f "http://localhost:6333/collections/${QDRANT_COLLECTION}/snapshots/${SNAPSHOT_NAME}" \
                -o "${QDRANT_FILE}"; then
                SIZE=$(du -h "${QDRANT_FILE}" | cut -f1)
                sha256sum "${QDRANT_FILE}" > "${QDRANT_FILE}.sha256"
                log_info "Qdrant backup: ${SIZE} -> $(basename "${QDRANT_FILE}")"
            else
                log_error "Failed to download Qdrant snapshot"
                ERRORS=$((ERRORS + 1))
            fi
        else
            log_warn "Qdrant snapshot created but could not parse snapshot name"
            ERRORS=$((ERRORS + 1))
        fi
    else
        log_error "Qdrant snapshot API returned HTTP ${HTTP_CODE}"
        ERRORS=$((ERRORS + 1))
    fi
else
    log_warn "Qdrant container '${QDRANT_CONTAINER}' not running, skipping"
fi

# Neo4j backup
echo "[3/3] Backing up Neo4j..."
if docker ps --format '{{.Names}}' | grep -q "^${NEO4J_CONTAINER}$"; then
    NEO4J_FILE="${BACKUP_DIR}/neo4j-${TIMESTAMP}.dump"
    docker exec "${NEO4J_CONTAINER}" neo4j-admin database dump neo4j --to-path=/tmp/ 2>/dev/null || \
        docker exec "${NEO4J_CONTAINER}" neo4j-admin dump --database=neo4j --to=/tmp/neo4j.dump 2>/dev/null || true
    docker cp "${NEO4J_CONTAINER}:/tmp/neo4j.dump" "${NEO4J_FILE}" 2>/dev/null || true
    docker exec "${NEO4J_CONTAINER}" rm -f /tmp/neo4j.dump 2>/dev/null || true

    if [ -f "${NEO4J_FILE}" ] && [ -s "${NEO4J_FILE}" ]; then
        SIZE=$(du -h "${NEO4J_FILE}" | cut -f1)
        sha256sum "${NEO4J_FILE}" > "${NEO4J_FILE}.sha256"
        log_info "Neo4j backup: ${SIZE} -> $(basename "${NEO4J_FILE}")"
    else
        log_warn "Neo4j dump file empty or missing — Neo4j may not be configured in this environment"
        rm -f "${NEO4J_FILE}" 2>/dev/null || true
    fi
else
    log_warn "Neo4j container '${NEO4J_CONTAINER}' not running, skipping"
fi

# Upload to MinIO (off-instance storage)
if [ "${BACKUP_DEST}" = "minio" ]; then
    echo "Uploading to MinIO (off-instance storage)..."
    if docker ps --format '{{.Names}}' | grep -q "^${MINIO_CONTAINER}$"; then
        docker exec "${MINIO_CONTAINER}" mc alias set local http://localhost:9000 \
            "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}" 2>/dev/null || true
        docker exec "${MINIO_CONTAINER}" mc mb "local/${MINIO_BACKUP_BUCKET}" 2>/dev/null || true

        BACKUP_TAR="${BACKUP_DIR}.tar.gz"
        tar -czf "${BACKUP_TAR}" -C "$(dirname "${BACKUP_DIR}")" "$(basename "${BACKUP_DIR}")"

        docker cp "${BACKUP_TAR}" "${MINIO_CONTAINER}:/tmp/backup.tar.gz"
        docker exec "${MINIO_CONTAINER}" mc cp "/tmp/backup.tar.gz" \
            "local/${MINIO_BACKUP_BUCKET}/backups/${TIMESTAMP}.tar.gz"
        docker exec "${MINIO_CONTAINER}" rm -f /tmp/backup.tar.gz

        log_info "Backup uploaded to MinIO: ${MINIO_BACKUP_BUCKET}/backups/${TIMESTAMP}.tar.gz"
    else
        log_warn "MinIO container not running, skipping off-instance upload"
    fi
fi

# Create manifest
cat > "${BACKUP_DIR}/manifest.json" << EOF
{
    "backup_name": "xuno_db_${TIMESTAMP}",
    "timestamp": "${TIMESTAMP}",
    "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "hostname": "$(hostname)",
    "services": {
        "postgresql": {"container": "${PG_CONTAINER}", "database": "${PG_DB}"},
        "qdrant": {"container": "${QDRANT_CONTAINER}", "collection": "${QDRANT_COLLECTION}"},
        "neo4j": {"container": "${NEO4J_CONTAINER}"}
    },
    "retention_days": ${RETENTION_DAYS},
    "destination": "${BACKUP_DEST}",
    "files": [
$(find "${BACKUP_DIR}" -maxdepth 1 -type f \( -name "*.sql.gz" -o -name "*.snapshot" -o -name "*.dump" \) -exec basename {} \; | sed 's/^/        "/;s/$/",/' | sed '$ s/,$//')
    ]
}
EOF

# Retention cleanup
find "$(dirname "${BACKUP_DIR}")" -maxdepth 1 -type d -name "20*" -mtime +${RETENTION_DAYS} \
    -exec rm -rf {} \; 2>/dev/null || true

echo "=== Backup complete: ${BACKUP_DIR} ==="
echo "Errors: ${ERRORS}"

if [ ${ERRORS} -eq 0 ]; then
    exit 0
else
    exit 1
fi

#!/bin/bash
# =============================================================================
# xuno Backup Script
# =============================================================================
# This script performs comprehensive backups of:
# - PostgreSQL database
# - Redis data
# - MinIO object storage
# - Qdrant vector database
#
# Usage: ./backup.sh [OPTIONS]
# Options:
#   --full         Perform full backup (default)
#   --db-only      Backup only databases
#   --incremental  Perform incremental backup (not implemented yet)
#   --upload       Upload backup to cloud storage (requires S3 credentials)
#   -h, --help     Show this help message
#
# Environment Variables:
#   BACKUP_DIR           - Backup directory (default: /backups)
#   POSTGRES_PASSWORD    - PostgreSQL password
#   REDIS_PASSWORD       - Redis password
#   MINIO_ACCESS_KEY     - MinIO access key
#   MINIO_SECRET_KEY     - MinIO secret key
#   AWS_ACCESS_KEY_ID    - AWS access key for S3 upload
#   AWS_SECRET_ACCESS_KEY - AWS secret key for S3 upload
#   S3_BUCKET            - S3 bucket name for backup uploads
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="xuno_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Parse arguments
FULL_BACKUP=true
DB_ONLY=false
UPLOAD_TO_S3=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --full)
            FULL_BACKUP=true
            shift
            ;;
        --db-only)
            DB_ONLY=true
            FULL_BACKUP=false
            shift
            ;;
        --incremental)
            log_warn "Incremental backup not yet implemented. Performing full backup."
            shift
            ;;
        --upload)
            UPLOAD_TO_S3=true
            shift
            ;;
        -h|--help)
            head -30 "$0" | tail -25
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Create backup directory
mkdir -p "${BACKUP_PATH}"
log_info "Backup directory: ${BACKUP_PATH}"

# =============================================================================
# PostgreSQL Backup
# =============================================================================
backup_postgres() {
    log_info "Starting PostgreSQL backup..."

    local CONTAINER_NAME="stylemind-postgres"
    local DB_NAME="stylemind"
    local BACKUP_FILE="${BACKUP_PATH}/postgres_${TIMESTAMP}.sql.gz"

    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_error "PostgreSQL container '${CONTAINER_NAME}' is not running"
        return 1
    fi

    # Create database backup with pg_dump
    docker exec "${CONTAINER_NAME}" pg_dump -U postgres -d "${DB_NAME}" --format=plain --no-owner --no-acl | gzip > "${BACKUP_FILE}"

    if [[ -f "${BACKUP_FILE}" ]]; then
        local SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
        log_info "PostgreSQL backup completed: ${BACKUP_FILE} (${SIZE})"

        # Create checksum
        sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"
    else
        log_error "PostgreSQL backup failed"
        return 1
    fi
}

# =============================================================================
# Redis Backup
# =============================================================================
backup_redis() {
    log_info "Starting Redis backup..."

    local CONTAINER_NAME="stylemind-redis"
    local BACKUP_FILE="${BACKUP_PATH}/redis_${TIMESTAMP}.rdb"

    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_error "Redis container '${CONTAINER_NAME}' is not running"
        return 1
    fi

    # Trigger Redis BGSAVE
    docker exec "${CONTAINER_NAME}" redis-cli -a "${REDIS_PASSWORD}" BGSAVE

    # Wait for background save to complete
    sleep 5

    # Check BGSAVE status
    local bgsave_status=$(docker exec "${CONTAINER_NAME}" redis-cli -a "${REDIS_PASSWORD}" LASTSAVE)
    log_info "Redis last save timestamp: ${bgsave_status}"

    # Copy RDB file from container
    docker cp "${CONTAINER_NAME}:/data/dump.rdb" "${BACKUP_FILE}"

    if [[ -f "${BACKUP_FILE}" ]]; then
        local SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
        log_info "Redis backup completed: ${BACKUP_FILE} (${SIZE})"

        # Create checksum
        sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"
    else
        log_error "Redis backup failed"
        return 1
    fi
}

# =============================================================================
# MinIO Backup
# =============================================================================
backup_minio() {
    if [[ "${DB_ONLY}" == "true" ]]; then
        log_info "Skipping MinIO backup (--db-only mode)"
        return 0
    fi

    log_info "Starting MinIO backup..."

    local CONTAINER_NAME="stylemind-minio"
    local BACKUP_FILE="${BACKUP_PATH}/minio_${TIMESTAMP}.tar.gz"
    local BUCKET_NAME="stylemind"

    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_error "MinIO container '${CONTAINER_NAME}' is not running"
        return 1
    fi

    # Use mc (MinIO Client) to mirror data
    # First, configure mc alias
    docker exec "${CONTAINER_NAME}" mc alias set local http://localhost:9000 "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}" 2>/dev/null || true

    # Alternative: Use rclone or direct file copy
    # Create temporary directory for MinIO data
    local TEMP_DIR="${BACKUP_PATH}/minio_temp"
    mkdir -p "${TEMP_DIR}"

    # Copy data from MinIO container
    docker cp "${CONTAINER_NAME}:/data" "${TEMP_DIR}/"

    # Create compressed archive
    tar -czf "${BACKUP_FILE}" -C "${TEMP_DIR}" data

    # Cleanup
    rm -rf "${TEMP_DIR}"

    if [[ -f "${BACKUP_FILE}" ]]; then
        local SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
        log_info "MinIO backup completed: ${BACKUP_FILE} (${SIZE})"

        # Create checksum
        sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"
    else
        log_error "MinIO backup failed"
        return 1
    fi
}

# =============================================================================
# Qdrant Backup
# =============================================================================
backup_qdrant() {
    if [[ "${DB_ONLY}" == "true" ]]; then
        log_info "Skipping Qdrant backup (--db-only mode)"
        return 0
    fi

    log_info "Starting Qdrant backup..."

    local CONTAINER_NAME="stylemind-qdrant"
    local BACKUP_FILE="${BACKUP_PATH}/qdrant_${TIMESTAMP}.tar.gz"

    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_error "Qdrant container '${CONTAINER_NAME}' is not running"
        return 1
    fi

    # Create snapshot via API
    curl -s -X POST "http://localhost:6333/collections/stylemind/snapshots" || log_warn "Could not create Qdrant snapshot via API"

    # Copy Qdrant storage directory
    local TEMP_DIR="${BACKUP_PATH}/qdrant_temp"
    mkdir -p "${TEMP_DIR}"

    docker cp "${CONTAINER_NAME}:/qdrant/storage" "${TEMP_DIR}/"

    # Create compressed archive
    tar -czf "${BACKUP_FILE}" -C "${TEMP_DIR}" storage

    # Cleanup
    rm -rf "${TEMP_DIR}"

    if [[ -f "${BACKUP_FILE}" ]]; then
        local SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
        log_info "Qdrant backup completed: ${BACKUP_FILE} (${SIZE})"

        # Create checksum
        sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"
    else
        log_error "Qdrant backup failed"
        return 1
    fi
}

# =============================================================================
# Upload to S3
# =============================================================================
upload_to_s3() {
    if [[ "${UPLOAD_TO_S3}" != "true" ]]; then
        return 0
    fi

    if [[ -z "${S3_BUCKET:-}" ]]; then
        log_warn "S3_BUCKET not set, skipping upload"
        return 0
    fi

    log_info "Uploading backup to S3..."

    # Check if AWS CLI is available
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found, cannot upload to S3"
        return 1
    fi

    local S3_PATH="s3://${S3_BUCKET}/backups/${BACKUP_NAME}"

    # Upload all backup files
    aws s3 cp "${BACKUP_PATH}" "${S3_PATH}/" --recursive

    log_info "Backup uploaded to: ${S3_PATH}"
}

# =============================================================================
# Cleanup Old Backups
# =============================================================================
cleanup_old_backups() {
    log_info "Cleaning up backups older than ${RETENTION_DAYS} days..."

    local DELETED_COUNT=0

    # Find and delete old backup directories
    while IFS= read -r dir; do
        if [[ -d "$dir" ]]; then
            rm -rf "$dir"
            DELETED_COUNT=$((DELETED_COUNT + 1))
            log_info "Deleted old backup: $dir"
        fi
    done < <(find "${BACKUP_DIR}" -maxdepth 1 -type d -name "xuno_backup_*" -mtime +${RETENTION_DAYS})

    log_info "Cleanup completed. Deleted ${DELETED_COUNT} old backup(s)"
}

# =============================================================================
# Create Backup Manifest
# =============================================================================
create_manifest() {
    local MANIFEST_FILE="${BACKUP_PATH}/manifest.json"

    cat > "${MANIFEST_FILE}" << EOF
{
    "backup_name": "${BACKUP_NAME}",
    "timestamp": "${TIMESTAMP}",
    "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "type": "$([ "${FULL_BACKUP}" == "true" ] && echo "full" || echo "partial")",
    "hostname": "$(hostname)",
    "files": [
$(find "${BACKUP_PATH}" -type f -name "*.gz" -o -name "*.rdb" | xargs -I {} basename {} | sed 's/^/        "/;s/$/",/' | sed '$ s/,$//')
    ],
    "sizes": {
$(find "${BACKUP_PATH}" -type f \( -name "*.gz" -o -name "*.rdb" \) -exec sh -c 'echo "        \"$(basename {})\": \"$(du -h {} | cut -f1)\","' \; | sed '$ s/,$//')
    },
    "checksums": {
$(find "${BACKUP_PATH}" -type f -name "*.sha256" -exec sh -c 'echo "        \"$(basename {} .sha256)\": \"$(cut -d" " -f1 < {})\","' \; | sed '$ s/,$//')
    }
}
EOF

    log_info "Backup manifest created: ${MANIFEST_FILE}"
}

# =============================================================================
# Main Execution
# =============================================================================
main() {
    log_info "=========================================="
    log_info "Starting xuno Backup"
    log_info "=========================================="
    log_info "Backup type: $([ "${FULL_BACKUP}" == "true" ] && echo "Full" || echo "Database only")"
    log_info "Timestamp: ${TIMESTAMP}"

    local ERRORS=0

    # Run backups
    backup_postgres || ERRORS=$((ERRORS + 1))
    backup_redis || ERRORS=$((ERRORS + 1))

    if [[ "${FULL_BACKUP}" == "true" ]]; then
        backup_minio || ERRORS=$((ERRORS + 1))
        backup_qdrant || ERRORS=$((ERRORS + 1))
    fi

    # Create manifest
    create_manifest

    # Upload to S3 if requested
    upload_to_s3 || log_warn "S3 upload failed"

    # Cleanup old backups
    cleanup_old_backups

    # Calculate total backup size
    local TOTAL_SIZE=$(du -sh "${BACKUP_PATH}" | cut -f1)

    log_info "=========================================="
    log_info "Backup Summary"
    log_info "=========================================="
    log_info "Backup location: ${BACKUP_PATH}"
    log_info "Total size: ${TOTAL_SIZE}"
    log_info "Errors: ${ERRORS}"

    if [[ ${ERRORS} -eq 0 ]]; then
        log_info "Backup completed successfully!"
        exit 0
    else
        log_error "Backup completed with ${ERRORS} error(s)"
        exit 1
    fi
}

# Run main function
main "$@"

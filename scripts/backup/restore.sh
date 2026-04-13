#!/bin/bash
# =============================================================================
# xuno Restore Script
# =============================================================================
# This script restores backups of:
# - PostgreSQL database
# - Redis data
# - MinIO object storage
# - Qdrant vector database
#
# Usage: ./restore.sh [OPTIONS] <backup_path>
# Options:
#   --postgres     Restore PostgreSQL only
#   --redis        Restore Redis only
#   --minio        Restore MinIO only
#   --qdrant       Restore Qdrant only
#   --all          Restore all services (default)
#   --verify       Verify backup integrity before restore
#   -h, --help     Show this help message
#
# Example:
#   ./restore.sh --postgres /backups/xuno_backup_20240315_120000
#   ./restore.sh --all /backups/xuno_backup_20240315_120000
# =============================================================================

set -euo pipefail

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

# Default options
RESTORE_POSTGRES=false
RESTORE_REDIS=false
RESTORE_MINIO=false
RESTORE_QDRANT=false
VERIFY_BACKUP=false
BACKUP_PATH=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --postgres)
            RESTORE_POSTGRES=true
            shift
            ;;
        --redis)
            RESTORE_REDIS=true
            shift
            ;;
        --minio)
            RESTORE_MINIO=true
            shift
            ;;
        --qdrant)
            RESTORE_QDRANT=true
            shift
            ;;
        --all)
            RESTORE_POSTGRES=true
            RESTORE_REDIS=true
            RESTORE_MINIO=true
            RESTORE_QDRANT=true
            shift
            ;;
        --verify)
            VERIFY_BACKUP=true
            shift
            ;;
        -h|--help)
            head -30 "$0" | tail -25
            exit 0
            ;;
        -*)
            log_error "Unknown option: $1"
            exit 1
            ;;
        *)
            BACKUP_PATH="$1"
            shift
            ;;
    esac
done

# If no specific service selected, restore all
if [[ "${RESTORE_POSTGRES}" == "false" && "${RESTORE_REDIS}" == "false" && "${RESTORE_MINIO}" == "false" && "${RESTORE_QDRANT}" == "false" ]]; then
    RESTORE_POSTGRES=true
    RESTORE_REDIS=true
    RESTORE_MINIO=true
    RESTORE_QDRANT=true
fi

# Validate backup path
if [[ -z "${BACKUP_PATH}" ]]; then
    log_error "Backup path is required"
    echo "Usage: $0 [OPTIONS] <backup_path>"
    exit 1
fi

if [[ ! -d "${BACKUP_PATH}" ]]; then
    log_error "Backup directory not found: ${BACKUP_PATH}"
    exit 1
fi

# Confirmation prompt
confirm_restore() {
    echo ""
    echo "=========================================="
    echo "RESTORE WARNING"
    echo "=========================================="
    echo "This will OVERWRITE existing data in the following services:"
    [[ "${RESTORE_POSTGRES}" == "true" ]] && echo "  - PostgreSQL"
    [[ "${RESTORE_REDIS}" == "true" ]] && echo "  - Redis"
    [[ "${RESTORE_MINIO}" == "true" ]] && echo "  - MinIO"
    [[ "${RESTORE_QDRANT}" == "true" ]] && echo "  - Qdrant"
    echo ""
    echo "Backup: ${BACKUP_PATH}"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [[ "${confirm}" != "yes" ]]; then
        log_info "Restore cancelled"
        exit 0
    fi
}

# Verify backup integrity
verify_backup() {
    log_info "Verifying backup integrity..."

    local ERRORS=0

    # Verify PostgreSQL backup
    if [[ "${RESTORE_POSTGRES}" == "true" ]]; then
        local PG_BACKUP=$(find "${BACKUP_PATH}" -name "postgres_*.sql.gz" | head -1)
        if [[ -n "${PG_BACKUP}" && -f "${PG_BACKUP}.sha256" ]]; then
            if sha256sum -c "${PG_BACKUP}.sha256" &>/dev/null; then
                log_info "PostgreSQL backup verified: $(basename ${PG_BACKUP})"
            else
                log_error "PostgreSQL backup checksum failed"
                ERRORS=$((ERRORS + 1))
            fi
        else
            log_warn "PostgreSQL backup or checksum not found"
        fi
    fi

    # Verify Redis backup
    if [[ "${RESTORE_REDIS}" == "true" ]]; then
        local REDIS_BACKUP=$(find "${BACKUP_PATH}" -name "redis_*.rdb" | head -1)
        if [[ -n "${REDIS_BACKUP}" && -f "${REDIS_BACKUP}.sha256" ]]; then
            if sha256sum -c "${REDIS_BACKUP}.sha256" &>/dev/null; then
                log_info "Redis backup verified: $(basename ${REDIS_BACKUP})"
            else
                log_error "Redis backup checksum failed"
                ERRORS=$((ERRORS + 1))
            fi
        else
            log_warn "Redis backup or checksum not found"
        fi
    fi

    if [[ ${ERRORS} -gt 0 ]]; then
        log_error "Backup verification failed with ${ERRORS} error(s)"
        exit 1
    fi

    log_info "Backup verification passed"
}

# =============================================================================
# PostgreSQL Restore
# =============================================================================
restore_postgres() {
    log_info "Starting PostgreSQL restore..."

    local CONTAINER_NAME="stylemind-postgres"
    local DB_NAME="stylemind"
    local BACKUP_FILE=$(find "${BACKUP_PATH}" -name "postgres_*.sql.gz" | head -1)

    if [[ -z "${BACKUP_FILE}" ]]; then
        log_error "PostgreSQL backup file not found in ${BACKUP_PATH}"
        return 1
    fi

    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_error "PostgreSQL container '${CONTAINER_NAME}' is not running"
        return 1
    fi

    # Create pre-restore backup
    log_info "Creating pre-restore backup..."
    docker exec "${CONTAINER_NAME}" pg_dump -U postgres -d "${DB_NAME}" --format=plain --no-owner --no-acl | gzip > "/tmp/pre_restore_postgres_$(date +%Y%m%d_%H%M%S).sql.gz"

    # Drop existing connections
    log_info "Terminating existing connections..."
    docker exec "${CONTAINER_NAME}" psql -U postgres -c "
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();
    "

    # Restore database
    log_info "Restoring database from ${BACKUP_FILE}..."
    zcat "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U postgres -d "${DB_NAME}"

    # Verify restore
    local TABLE_COUNT=$(docker exec "${CONTAINER_NAME}" psql -U postgres -d "${DB_NAME}" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
    log_info "PostgreSQL restore completed. Tables restored: ${TABLE_COUNT}"

    return 0
}

# =============================================================================
# Redis Restore
# =============================================================================
restore_redis() {
    log_info "Starting Redis restore..."

    local CONTAINER_NAME="stylemind-redis"
    local BACKUP_FILE=$(find "${BACKUP_PATH}" -name "redis_*.rdb" | head -1)

    if [[ -z "${BACKUP_FILE}" ]]; then
        log_error "Redis backup file not found in ${BACKUP_PATH}"
        return 1
    fi

    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_error "Redis container '${CONTAINER_NAME}' is not running"
        return 1
    fi

    # Stop Redis to safely restore
    log_info "Stopping Redis for restore..."
    docker exec "${CONTAINER_NAME}" redis-cli -a "${REDIS_PASSWORD}" SHUTDOWN NOSAVE || true

    # Wait for container to stop
    sleep 3

    # Copy RDB file to container
    log_info "Restoring Redis data from ${BACKUP_FILE}..."
    docker cp "${BACKUP_FILE}" "${CONTAINER_NAME}:/data/dump.rdb"

    # Restart container
    log_info "Restarting Redis..."
    docker restart "${CONTAINER_NAME}"

    # Wait for Redis to be ready
    sleep 5

    # Verify restore
    local KEY_COUNT=$(docker exec "${CONTAINER_NAME}" redis-cli -a "${REDIS_PASSWORD}" DBSIZE | grep -oE '[0-9]+')
    log_info "Redis restore completed. Keys restored: ${KEY_COUNT}"

    return 0
}

# =============================================================================
# MinIO Restore
# =============================================================================
restore_minio() {
    log_info "Starting MinIO restore..."

    local CONTAINER_NAME="stylemind-minio"
    local BACKUP_FILE=$(find "${BACKUP_PATH}" -name "minio_*.tar.gz" | head -1)

    if [[ -z "${BACKUP_FILE}" ]]; then
        log_error "MinIO backup file not found in ${BACKUP_PATH}"
        return 1
    fi

    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_error "MinIO container '${CONTAINER_NAME}' is not running"
        return 1
    fi

    # Create temporary directory
    local TEMP_DIR="/tmp/minio_restore_$$"
    mkdir -p "${TEMP_DIR}"

    # Extract backup
    log_info "Extracting MinIO backup..."
    tar -xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"

    # Copy data to container
    log_info "Restoring MinIO data from ${BACKUP_FILE}..."
    docker cp "${TEMP_DIR}/data/." "${CONTAINER_NAME}:/data/"

    # Cleanup
    rm -rf "${TEMP_DIR}"

    # Restart MinIO
    docker restart "${CONTAINER_NAME}"

    # Wait for MinIO to be ready
    sleep 5

    log_info "MinIO restore completed"

    return 0
}

# =============================================================================
# Qdrant Restore
# =============================================================================
restore_qdrant() {
    log_info "Starting Qdrant restore..."

    local CONTAINER_NAME="stylemind-qdrant"
    local BACKUP_FILE=$(find "${BACKUP_PATH}" -name "qdrant_*.tar.gz" | head -1)

    if [[ -z "${BACKUP_FILE}" ]]; then
        log_error "Qdrant backup file not found in ${BACKUP_PATH}"
        return 1
    fi

    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_error "Qdrant container '${CONTAINER_NAME}' is not running"
        return 1
    fi

    # Create temporary directory
    local TEMP_DIR="/tmp/qdrant_restore_$$"
    mkdir -p "${TEMP_DIR}"

    # Extract backup
    log_info "Extracting Qdrant backup..."
    tar -xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"

    # Stop Qdrant for safe restore
    docker stop "${CONTAINER_NAME}"

    # Copy data to container
    log_info "Restoring Qdrant data from ${BACKUP_FILE}..."
    docker cp "${TEMP_DIR}/storage/." "${CONTAINER_NAME}:/qdrant/storage/"

    # Cleanup
    rm -rf "${TEMP_DIR}"

    # Restart Qdrant
    docker start "${CONTAINER_NAME}"

    # Wait for Qdrant to be ready
    sleep 5

    # Verify restore
    local COLLECTION_INFO=$(curl -s "http://localhost:6333/collections/stylemind" | grep -o '"result":{[^}]*}' || echo "unknown")
    log_info "Qdrant restore completed. Collection info: ${COLLECTION_INFO}"

    return 0
}

# =============================================================================
# Main Execution
# =============================================================================
main() {
    log_info "=========================================="
    log_info "Starting xuno Restore"
    log_info "=========================================="
    log_info "Backup path: ${BACKUP_PATH}"
    log_info "Services to restore:"
    [[ "${RESTORE_POSTGRES}" == "true" ]] && log_info "  - PostgreSQL"
    [[ "${RESTORE_REDIS}" == "true" ]] && log_info "  - Redis"
    [[ "${RESTORE_MINIO}" == "true" ]] && log_info "  - MinIO"
    [[ "${RESTORE_QDRANT}" == "true" ]] && log_info "  - Qdrant"

    # Confirm restore
    confirm_restore

    # Verify backup if requested
    if [[ "${VERIFY_BACKUP}" == "true" ]]; then
        verify_backup
    fi

    local ERRORS=0

    # Run restores
    if [[ "${RESTORE_POSTGRES}" == "true" ]]; then
        restore_postgres || ERRORS=$((ERRORS + 1))
    fi

    if [[ "${RESTORE_REDIS}" == "true" ]]; then
        restore_redis || ERRORS=$((ERRORS + 1))
    fi

    if [[ "${RESTORE_MINIO}" == "true" ]]; then
        restore_minio || ERRORS=$((ERRORS + 1))
    fi

    if [[ "${RESTORE_QDRANT}" == "true" ]]; then
        restore_qdrant || ERRORS=$((ERRORS + 1))
    fi

    log_info "=========================================="
    log_info "Restore Summary"
    log_info "=========================================="
    log_info "Errors: ${ERRORS}"

    if [[ ${ERRORS} -eq 0 ]]; then
        log_info "Restore completed successfully!"
        exit 0
    else
        log_error "Restore completed with ${ERRORS} error(s)"
        exit 1
    fi
}

# Run main function
main "$@"

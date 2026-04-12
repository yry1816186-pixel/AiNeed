#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${1:-docker-compose.prod.yml}"
PROJECT_NAME="aineed"
BACKUP_DIR="/opt/aineed/backups"
TARGET_VERSION="${2:-}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ROLLBACK] $*"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*" >&2
    exit 1
}

check_prerequisites() {
    command -v docker >/dev/null 2>&1 || error "docker is not installed"
    command -v docker compose >/dev/null 2>&1 || error "docker compose is not installed"
    [ -f "$COMPOSE_FILE" ] || error "compose file not found: $COMPOSE_FILE"
}

find_previous_state() {
    local state_files
    state_files=$(find "$BACKUP_DIR" -name "state_*.txt" -type f | sort | tail -2)

    if [ -z "$state_files" ]; then
        error "no previous deployment state found in $BACKUP_DIR"
    fi

    local previous_state
    if [ -n "$TARGET_VERSION" ]; then
        previous_state="${BACKUP_DIR}/state_${TARGET_VERSION}.txt"
        [ -f "$previous_state" ] || error "target state not found: $previous_state"
    else
        previous_state=$(echo "$state_files" | head -1)
    fi

    echo "$previous_state"
}

find_previous_backup() {
    local backup_files
    backup_files=$(find "$BACKUP_DIR" -name "pg_backup_*.sql.gz" -type f | sort | tail -2)

    if [ -z "$backup_files" ]; then
        log "no database backups found, skipping database restore"
        return 1
    fi

    local previous_backup
    if [ -n "$TARGET_VERSION" ]; then
        previous_backup="${BACKUP_DIR}/pg_backup_${TARGET_VERSION}.sql.gz"
        if [ ! -f "$previous_backup" ]; then
            log "target backup not found: $previous_backup, using most recent"
            previous_backup=$(echo "$backup_files" | head -1)
        fi
    else
        previous_backup=$(echo "$backup_files" | head -1)
    fi

    echo "$previous_backup"
}

confirm_rollback() {
    echo ""
    echo "=========================================="
    echo "  ROLLBACK WARNING"
    echo "=========================================="
    echo "  This will revert the deployment to a previous state."
    echo "  Current running services will be stopped and restarted."
    echo ""

    local previous_state
    previous_state=$(find_previous_state)
    echo "  Rolling back to state: $(basename "$previous_state")"

    local previous_backup
    if previous_backup=$(find_previous_backup); then
        echo "  Database backup to restore: $(basename "$previous_backup")"
    else
        echo "  Database: no backup available for restore"
    fi

    echo ""
    read -r -p "  Are you sure you want to proceed? [y/N] " response
    case "$response" in
        [yY][eE][sS]|[yY])
            log "rollback confirmed"
            ;;
        *)
            log "rollback cancelled"
            exit 0
            ;;
    esac
}

stop_services() {
    log "stopping all services..."
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down --timeout 30
    log "all services stopped"
}

restore_database() {
    local backup_file
    if ! backup_file=$(find_previous_backup); then
        return
    fi

    log "starting postgresql separately for restore..."
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d postgres
    sleep 10

    local pg_container
    pg_container=$(docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps -q postgres 2>/dev/null | head -1)

    if [ -z "$pg_container" ]; then
        error "failed to start postgres container for restore"
    fi

    local retries=0
    while [ $retries -lt 30 ]; do
        if docker exec "$pg_container" pg_isready -U aineed -d aineed_prod >/dev/null 2>&1; then
            break
        fi
        retries=$((retries + 1))
        log "waiting for postgres to be ready... ($retries/30)"
        sleep 2
    done

    log "restoring database from: $backup_file"
    gunzip -c "$backup_file" | docker exec -i "$pg_container" psql -U aineed -d aineed_prod
    log "database restore completed"

    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" stop postgres
}

restart_services() {
    log "restarting all services with previous configuration..."
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d
    log "services restarted"
}

verify_health() {
    log "verifying service health..."
    local retries=0
    local max_retries=60

    while [ $retries -lt $max_retries ]; do
        local unhealthy
        unhealthy=$(docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps --format json 2>/dev/null | grep -v '"Health":"healthy"' | grep -c "Health" || echo "0")

        if [ "$unhealthy" -eq 0 ]; then
            log "all services are healthy after rollback"
            return 0
        fi

        retries=$((retries + 1))
        log "waiting for services... ($retries/$max_retries) unhealthy: $unhealthy"
        sleep 5
    done

    error "services did not become healthy after rollback, manual intervention required"
}

print_summary() {
    log "=== rollback summary ==="
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps
    log "rollback completed at $(date '+%Y-%m-%d %H:%M:%S')"
}

main() {
    log "starting rollback with compose file: $COMPOSE_FILE"
    check_prerequisites
    confirm_rollback
    stop_services
    restore_database
    restart_services
    verify_health
    print_summary
}

main "$@"

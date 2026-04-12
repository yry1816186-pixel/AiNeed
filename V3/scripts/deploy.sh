#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${1:-docker-compose.prod.yml}"
PROJECT_NAME="aineed"
BACKUP_DIR="/opt/aineed/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CURRENT_IMAGE_TAG="${2:-latest}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [DEPLOY] $*"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*" >&2
    exit 1
}

check_prerequisites() {
    command -v docker >/dev/null 2>&1 || error "docker is not installed"
    command -v docker compose >/dev/null 2>&1 || error "docker compose is not installed"
    [ -f "$COMPOSE_FILE" ] || error "compose file not found: $COMPOSE_FILE"
    [ -f ".env" ] || error ".env file not found in current directory"
}

save_current_state() {
    local state_file="${BACKUP_DIR}/state_${TIMESTAMP}.txt"
    mkdir -p "$BACKUP_DIR"
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" images > "$state_file" 2>/dev/null || true
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps --format json > "${state_file}.ps" 2>/dev/null || true
    log "current state saved to $state_file"
}

backup_database() {
    local backup_file="${BACKUP_DIR}/pg_backup_${TIMESTAMP}.sql.gz"
    mkdir -p "$BACKUP_DIR"

    local pg_container
    pg_container=$(docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps -q postgres 2>/dev/null | head -1)

    if [ -n "$pg_container" ]; then
        log "backing up postgresql database..."
        docker exec "$pg_container" pg_dump -U aineed -d aineed_prod --no-owner --no-privileges | gzip > "$backup_file"
        local backup_size
        backup_size=$(du -h "$backup_file" | cut -f1)
        log "database backup completed: $backup_file ($backup_size)"

        local backup_count
        backup_count=$(find "$BACKUP_DIR" -name "pg_backup_*.sql.gz" | wc -l)
        if [ "$backup_count" -gt 10 ]; then
            find "$BACKUP_DIR" -name "pg_backup_*.sql.gz" -type f | sort | head -n -10 | xargs rm -f
            log "cleaned up old backups, keeping latest 10"
        fi
    else
        log "postgres container not running, skipping database backup"
    fi
}

pull_images() {
    log "pulling latest images..."
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" pull 2>/dev/null || true
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" build --no-cache backend
    log "images pulled and built successfully"
}

run_migrations() {
    log "running database migrations..."
    local backend_container
    backend_container=$(docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps -q backend 2>/dev/null | head -1)

    if [ -n "$backend_container" ]; then
        docker exec "$backend_container" npx prisma migrate deploy 2>/dev/null || true
    fi

    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" run --rm -e DATABASE_URL="${DATABASE_URL}" backend npx prisma migrate deploy
    log "database migrations completed"
}

rolling_update() {
    log "starting rolling update..."

    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d --no-deps --build backend
    log "backend service updated, waiting for health check..."

    local retries=0
    local max_retries=30
    while [ $retries -lt $max_retries ]; do
        local health_status
        health_status=$(docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps --format json backend 2>/dev/null | grep -o '"Health":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "unknown")

        if [ "$health_status" = "healthy" ]; then
            log "backend is healthy"
            break
        fi

        retries=$((retries + 1))
        log "waiting for backend health check... ($retries/$max_retries) status: $health_status"
        sleep 5
    done

    if [ $retries -eq $max_retries ]; then
        error "backend failed to become healthy within timeout, initiating rollback"
        rollback_emergency
    fi

    log "updating remaining services..."
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d
    log "all services updated"
}

wait_for_healthy() {
    log "waiting for all services to become healthy..."
    local retries=0
    local max_retries=60

    while [ $retries -lt $max_retries ]; do
        local unhealthy
        unhealthy=$(docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps --format json 2>/dev/null | grep -v '"Health":"healthy"' | grep -c "Health" || echo "0")

        if [ "$unhealthy" -eq 0 ]; then
            log "all services are healthy"
            return 0
        fi

        retries=$((retries + 1))
        log "waiting for services... ($retries/$max_retries) unhealthy: $unhealthy"
        sleep 5
    done

    error "not all services became healthy within timeout"
}

rollback_emergency() {
    log "emergency rollback initiated..."
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down
    local last_backup
    last_backup=$(find "$BACKUP_DIR" -name "pg_backup_*.sql.gz" -type f | sort | tail -1)
    if [ -n "$last_backup" ]; then
        log "last database backup available: $last_backup"
    fi
    error "deployment failed, manual intervention required"
}

print_summary() {
    log "=== deployment summary ==="
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps
    log "deployment completed successfully at $(date '+%Y-%m-%d %H:%M:%S')"
}

main() {
    log "starting deployment with compose file: $COMPOSE_FILE"
    check_prerequisites
    save_current_state
    backup_database
    pull_images
    run_migrations
    rolling_update
    wait_for_healthy
    print_summary
}

main "$@"

#!/bin/bash
set -euo pipefail

COMPOSE_FILE="${1:-docker-compose.production.yml}"
TIMEOUT="${2:-120}"
RETRY_INTERVAL=10

echo "=== Post-Deploy Smoke Test ==="
echo "Compose file: $COMPOSE_FILE"
echo "Timeout: ${TIMEOUT}s"
echo ""

elapsed=0
while [ $elapsed -lt $TIMEOUT ]; do
  RUNNING=$(docker compose -f "$COMPOSE_FILE" ps --services --filter "status=running" 2>/dev/null | wc -l || echo "0")
  TOTAL=$(docker compose -f "$COMPOSE_FILE" config --services 2>/dev/null | wc -l || echo "0")

  if [ "$RUNNING" -eq "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then
    echo "All $TOTAL services running"
    break
  fi

  echo "Waiting for services... ($RUNNING/$TOTAL running, ${elapsed}s elapsed)"
  sleep $RETRY_INTERVAL
  elapsed=$((elapsed + RETRY_INTERVAL))

  if [ $elapsed -ge $TIMEOUT ]; then
    echo "FAIL: Timeout waiting for services ($RUNNING/$TOTAL running after ${TIMEOUT}s)"
    docker compose -f "$COMPOSE_FILE" ps
    exit 1
  fi
done

HEALTH_FAIL=0

echo ""
echo "Health checks:"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/health --max-time 10 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "  Backend health: OK (HTTP $HTTP_CODE)"
else
  echo "  Backend health: FAIL (HTTP $HTTP_CODE)"
  HEALTH_FAIL=1
fi

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8002/health --max-time 10 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "  AI service health: OK (HTTP $HTTP_CODE)"
else
  echo "  AI service health: FAIL (HTTP $HTTP_CODE)"
  HEALTH_FAIL=1
fi

echo ""
echo "Container status:"
docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}"

echo ""
if [ "$HEALTH_FAIL" -ne 0 ]; then
  echo "=== Smoke Test FAILED ==="
  exit 1
fi

echo "=== Smoke Test PASSED ==="
exit 0

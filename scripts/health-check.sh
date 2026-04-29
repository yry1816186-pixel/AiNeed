#!/usr/bin/env bash
set -euo pipefail

SERVICES_OK=0
SERVICES_FAIL=0

check_service() {
  local name="$1"
  local url="$2"

  if command -v curl &>/dev/null; then
    if curl -sf -o /dev/null -m 5 "$url" 2>/dev/null; then
      echo "  ✅ $name — healthy"
      ((SERVICES_OK++))
    else
      echo "  ❌ $name — unhealthy ($url)"
      ((SERVICES_FAIL++))
    fi
  else
    echo "  ⚠️  $name — skipped (curl not found)"
  fi
}

check_tcp() {
  local name="$1"
  local host="$2"
  local port="$3"

  if bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null; then
    echo "  ✅ $name — healthy (port $port)"
    ((SERVICES_OK++))
  else
    echo "  ❌ $name — unhealthy ($host:$port)"
    ((SERVICES_FAIL++))
  fi
}

echo "🔍 XUNO Backend Health Check"
echo "================================"

echo ""
echo "Infrastructure:"
check_tcp "PostgreSQL" "localhost" "5432"
check_tcp "Redis"      "localhost" "6379"
check_tcp "MinIO"      "localhost" "9000"
check_tcp "Qdrant"     "localhost" "6333"

echo ""
echo "Application:"
check_service "FastAPI AI"  "http://localhost:8002/health"
check_service "NestJS API"  "http://localhost:3001/api/v1/health"

echo ""
echo "================================"
echo "  ✅ $SERVICES_OK healthy"
echo "  ❌ $SERVICES_FAIL unhealthy"
echo ""

if [ "$SERVICES_FAIL" -gt 0 ]; then
  exit 1
fi
exit 0

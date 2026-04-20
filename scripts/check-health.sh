#!/bin/bash
echo "=== AiNeed Health Check ==="

check() {
  local name=$1 url=$2
  local status=$(curl -sf -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  if [ "$status" = "200" ]; then
    echo "✓ $name ($url): $status"
  else
    echo "✗ $name ($url): $status"
  fi
}

check "Backend"    "http://localhost:3001/api/v1/health"
check "Admin"      "http://localhost:3002"
check "PostgreSQL" "http://localhost:5432" 2>/dev/null || echo "  (direct TCP check needed)"
check "Redis"      "http://localhost:6379" 2>/dev/null || echo "  (direct TCP check needed)"
check "MinIO"      "http://localhost:9001"

echo ""
echo "Docker containers:"
docker compose ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null || echo "  Docker not running"

#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3001}"
HOST="${HOST:-localhost}"
BASE_URL="http://${HOST}:${PORT}/api/v1/health"
TIMEOUT=5

usage() {
  echo "Usage: $0 [live|ready|full]"
  echo ""
  echo "  live  - Liveness probe (is the process running?)"
  echo "  ready - Readiness probe (are dependencies available?)"
  echo "  full  - Full health check with all dependency details (default)"
  exit 1
}

check_endpoint() {
  local endpoint="$1"
  local expected_status="${2:-200}"

  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$endpoint" 2>/dev/null) || {
    echo "UNREACHABLE"
    return 1
  }

  if [ "$http_code" = "$expected_status" ]; then
    echo "OK"
    return 0
  else
    echo "HTTP_${http_code}"
    return 1
  fi
}

MODE="${1:-full}"

case "$MODE" in
  live)
    result=$(check_endpoint "${BASE_URL}/live")
    if [ "$result" = "OK" ]; then
      echo "LIVE"
      exit 0
    else
      echo "NOT LIVE (${result})"
      exit 1
    fi
    ;;

  ready)
    result=$(check_endpoint "${BASE_URL}/ready")
    if [ "$result" = "OK" ]; then
      echo "READY"
      exit 0
    else
      echo "NOT READY (${result})"
      exit 1
    fi
    ;;

  full)
    response=$(curl -s --max-time "$TIMEOUT" "$BASE_URL" 2>/dev/null) || {
      echo "UNREACHABLE: Backend at ${BASE_URL}"
      exit 1
    }

    status=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null || echo "parse_error")

    if [ "$status" = "healthy" ]; then
      echo "HEALTHY"
      echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
      exit 0
    elif [ "$status" = "degraded" ]; then
      echo "DEGRADED"
      echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
      exit 0
    else
      echo "UNHEALTHY (status: ${status})"
      echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
      exit 1
    fi
    ;;

  -h|--help|help)
    usage
    ;;

  *)
    echo "Unknown mode: $MODE"
    usage
    ;;
esac

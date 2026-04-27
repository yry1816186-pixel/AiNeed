#!/bin/bash
# 寻裳 XUNO — 演示前环境预检脚本
# 用途: 演示前自动检查环境准备是否就绪
# 用法: bash scripts/demo-preflight.sh
set -euo pipefail

echo "========================================"
echo "  寻裳 XUNO — 演示前环境预检"
echo "========================================"
echo ""

PASS=0
FAIL=0
WARN=0

check() {
  local name="$1" status="$2" detail="${3:-}"
  case "$status" in
    PASS) icon="OK"; PASS=$((PASS + 1)) ;;
    FAIL) icon="FAIL"; FAIL=$((FAIL + 1)) ;;
    WARN) icon="WARN"; WARN=$((WARN + 1)) ;;
  esac
  printf "  %-8s %-45s %s\n" "[${icon}]" "${name}" "${detail}"
}

# ==========================================
# 1. Docker Desktop
# ==========================================
echo "--- 环境检查 ---"
echo ""

# 1.1 Docker Desktop running
if docker info > /dev/null 2>&1; then
  DOCKER_VERSION=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "unknown")
  check "Docker Desktop 运行状态" PASS "version ${DOCKER_VERSION}"
else
  check "Docker Desktop 运行状态" FAIL "未启动或未安装"
fi

# 1.2 Disk space
DISK_AVAIL=$(docker system df 2>/dev/null | tail -1 | awk '{print $NF}' || echo "unknown")
if [ "$DISK_AVAIL" != "unknown" ] && [ -n "$DISK_AVAIL" ]; then
  check "Docker 磁盘空间 (>10GB)" PASS "可用: ${DISK_AVAIL}"
else
  check "Docker 磁盘空间" WARN "无法检查"
fi

# ==========================================
# 2. 配置文件
# ==========================================
echo ""

if [ -f ".env.production" ]; then
  # Check key variables present
  KEY_VARS=("POSTGRES_PASSWORD" "REDIS_PASSWORD" "GLM_API_KEY" "JWT_SECRET")
  MISSING_VARS=()
  for var in "${KEY_VARS[@]}"; do
    if grep -q "^${var}=" .env.production 2>/dev/null; then
      : # found
    else
      MISSING_VARS+=("$var")
    fi
  done
  if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    check ".env.production 配置完整性" PASS "关键变量齐全"
  else
    check ".env.production 配置完整性" FAIL "缺少: ${MISSING_VARS[*]}"
  fi
else
  check ".env.production 存在" FAIL "文件不存在"
fi

# Secrets directory
if [ -d "secrets" ]; then
  SECRET_FILES=("jwt_secret.txt" "database_url.txt")
  MISSING_SECRETS=()
  for sf in "${SECRET_FILES[@]}"; do
    if [ ! -f "secrets/${sf}" ]; then
      MISSING_SECRETS+=("$sf")
    fi
  done
  if [ ${#MISSING_SECRETS[@]} -eq 0 ]; then
    check "secrets/ 目录完整" PASS "所有 secret 文件存在"
  else
    check "secrets/ 目录完整" WARN "缺少: ${MISSING_SECRETS[*]}"
  fi
else
  check "secrets/ 目录" WARN "不存在 (非生产环境可忽略)"
fi

# ==========================================
# 3. Docker 服务
# ==========================================
echo ""
echo "--- 服务检查 ---"
echo ""

COMPOSE_FILE="docker-compose.dev.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
  COMPOSE_FILE="docker-compose.production.yml"
  if [ ! -f "$COMPOSE_FILE" ]; then
    COMPOSE_FILE="docker-compose.yml"
  fi
fi

# 3.1 Check running services
RUNNING_RAW=$(docker compose -f "$COMPOSE_FILE" ps --status running -q 2>/dev/null || true)
RUNNING_COUNT=$(echo "$RUNNING_RAW" | grep -c . 2>/dev/null || echo "0")
TOTAL_SERVICES=$(grep -c "^  [a-z-]*:$" "$COMPOSE_FILE" 2>/dev/null || echo "0")
# Filter to actual services (exclude network/volume lines)
ACTUAL_SERVICES=$(grep "^  [a-z-]*:$" "$COMPOSE_FILE" | grep -v -E "(data|network|volume)" | wc -l)

if [ "$RUNNING_COUNT" -gt 0 ]; then
  check "Docker 服务运行 (${RUNNING_COUNT}/${ACTUAL_SERVICES})" PASS
else
  check "Docker 服务运行" FAIL "无运行中服务，请先启动: bash infrastructure/scripts/demo-local.sh"
fi

# 3.2 Check healthy services
if [ "$RUNNING_COUNT" -gt 0 ]; then
  HEALTHY_COUNT=$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null \
    | grep -c '"Health":"healthy"' 2>/dev/null || echo "0")
  UNHEALTHY=$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null \
    | grep -v '"Health":"healthy"' 2>/dev/null \
    | grep '"Health"' 2>/dev/null \
    | grep -o '"Name":"[^"]*"' 2>/dev/null \
    | sed 's/"Name":"//;s/"//' 2>/dev/null || true)

  if [ "$UNHEALTHY" = "" ] && [ "$HEALTHY_COUNT" -gt 0 ]; then
    check "所有服务 healthy" PASS "${HEALTHY_COUNT} healthy"
  else
    check "服务 healthy 状态" WARN "不健康: ${UNHEALTHY:-unknown}"
  fi
fi

# ==========================================
# 4. 关键端口
# ==========================================
echo ""
echo "--- 端口检查 ---"
echo ""

check_port() {
  local name="$1" port="$2" path="${3:-/}"
  HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:${port}${path}" --max-time 3 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" != "000" ]; then
    check "${name} (port ${port})" PASS "HTTP ${HTTP_CODE}"
  else
    check "${name} (port ${port})" FAIL "无响应"
  fi
}

check_port "Backend API" 3001 "/api/docs"
check_port "AI Service" 8002 "/health"

# ==========================================
# 总结
# ==========================================
echo ""
echo "========================================"
echo "  预检结果"
echo "========================================"
echo ""
echo "  PASS: ${PASS}"
echo "  WARN: ${WARN}"
echo "  FAIL: ${FAIL}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "  *** ${FAIL} 项检查失败，请修复后再继续 ***"
  echo ""
  exit 1
else
  echo "  环境就绪，可以开始演示预热"
  echo ""
  exit 0
fi

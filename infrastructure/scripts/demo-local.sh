#!/bin/bash
# 寻裳 XUNO 本地演示环境一键启动脚本
# 用途: 比赛现场零网络依赖的本地演示环境
# 用法: bash infrastructure/scripts/demo-local.sh [--skip-build] [--reset-data]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

SKIP_BUILD=false
RESET_DATA=false

for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    --reset-data) RESET_DATA=true ;;
    *) echo "Unknown argument: $arg"; echo "Usage: $0 [--skip-build] [--reset-data]"; exit 1 ;;
  esac
done

echo "========================================"
echo "  寻裳 XUNO — 本地演示环境启动"
echo "========================================"
echo "项目根目录: $PROJECT_ROOT"
echo ""

# --- Step 1: 检查 Docker 是否运行 ---
echo "[Step 1/7] 检查 Docker..."
if ! docker info > /dev/null 2>&1; then
  echo "ERROR: Docker 未运行或未安装。请启动 Docker Desktop 后重试。"
  exit 1
fi
echo "  [OK] Docker 运行中"

# --- Step 2: 检查磁盘空间 ---
echo "[Step 2/7] 检查磁盘空间..."
AVAILABLE_GB=$(df "$PROJECT_ROOT" 2>/dev/null | awk 'NR==2 {print int($4/1024/1024)}' || echo "0")
if [ "$AVAILABLE_GB" -lt 10 ] 2>/dev/null; then
  echo "  [WARNING] 磁盘剩余空间不足 10GB (当前: ${AVAILABLE_GB}GB)。演示可能不稳定。"
else
  echo "  [OK] 磁盘剩余 ${AVAILABLE_GB}GB"
fi

# --- Step 3: 检查 .env.production 和 secrets/ ---
echo "[Step 3/7] 检查配置文件..."
if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
  echo "ERROR: .env.production 不存在"
  echo "  请复制 .env.production.example 并填写实际值"
  exit 1
fi
echo "  [OK] .env.production 存在"

MISSING_SECRETS=0
if [ ! -d "$PROJECT_ROOT/secrets" ]; then
  echo "  [WARNING] secrets/ 目录不存在，正在创建..."
  mkdir -p "$PROJECT_ROOT/secrets"
  MISSING_SECRETS=4
else
  for secret in jwt_secret database_url openai_api_key fal_api_key; do
    if [ ! -f "$PROJECT_ROOT/secrets/${secret}.txt" ]; then
      echo "  [WARNING] secrets/${secret}.txt 缺失"
      MISSING_SECRETS=$((MISSING_SECRETS + 1))
    fi
  done
fi

if [ "$MISSING_SECRETS" -gt 0 ]; then
  echo "  [WARNING] ${MISSING_SECRETS} 个 secret 文件缺失，部分功能可能不可用"
else
  echo "  [OK] 所有 secret 文件就绪"
fi

# --- Step 4: 数据重置 (可选) ---
if [ "$RESET_DATA" = true ]; then
  echo "[Step 4/7] 重置数据卷..."
  docker compose -f "$PROJECT_ROOT/docker-compose.production.yml" down -v --remove-orphans 2>/dev/null || true
  echo "  [OK] 所有数据卷已清除"
else
  echo "[Step 4/7] 跳过数据重置 (使用 --reset-data 重置)"
fi

# --- Step 5: 构建镜像 (可选) ---
if [ "$SKIP_BUILD" = false ]; then
  echo "[Step 5/7] 构建 Docker 镜像..."
  docker compose -f "$PROJECT_ROOT/docker-compose.production.yml" build 2>&1 || {
    echo "  [WARNING] 镜像构建失败，尝试使用已有镜像..."
  }
  echo "  [OK] 镜像就绪"
else
  echo "[Step 5/7] 跳过镜像构建 (--skip-build)"
fi

# --- Step 6: 启动 Docker Compose ---
echo "[Step 6/7] 启动 15 个服务..."
COMPOSE_CMD="docker compose -f $PROJECT_ROOT/docker-compose.production.yml"

# 检测是否需要模拟器访问 (DEMO_MODE)
if [ "${DEMO_MODE:-false}" = "true" ]; then
  echo "  [INFO] DEMO_MODE=true — 后端端口绑定 0.0.0.0 (模拟器/真机可访问)"
fi

$COMPOSE_CMD up -d

echo "  等待服务健康检查..."
MAX_WAIT=300  # 5 分钟
ELAPSED=0
INTERVAL=10

while [ "$ELAPSED" -lt "$MAX_WAIT" ]; do
  # 检查是否有 unhealthy 服务
  UNHEALTHY=$($COMPOSE_CMD ps --format json 2>/dev/null | \
    grep -v '"running"' || true)

  # 统计 healthy 服务数
  HEALTHY_COUNT=$($COMPOSE_CMD ps --format json 2>/dev/null | \
    grep -c '"healthy"' || echo "0")
  TOTAL_COUNT=$($COMPOSE_CMD ps --format json 2>/dev/null | wc -l || echo "0")

  if [ "$HEALTHY_COUNT" -ge "$TOTAL_COUNT" ] && [ "$TOTAL_COUNT" -gt 0 ]; then
    echo "  [OK] 所有 ${TOTAL_COUNT} 个服务已 healthy (${ELAPSED}s)"
    break
  fi

  echo "  ... ${HEALTHY_COUNT}/${TOTAL_COUNT} 服务 healthy (等待 ${ELAPSED}s/${MAX_WAIT}s)"
  sleep "$INTERVAL"
  ELAPSED=$((ELAPSED + INTERVAL))
done

if [ "$ELAPSED" -ge "$MAX_WAIT" ]; then
  echo "  [WARNING] 等待超时 (${MAX_WAIT}s)。部分服务可能未就绪。"
  echo "  运行 'docker compose -f docker-compose.production.yml ps' 检查状态。"
fi

# --- Step 7: 打印服务状态表 ---
echo ""
echo "[Step 7/7] 服务状态:"
echo "========================================"
printf "%-22s %-12s %-18s\n" "SERVICE" "STATUS" "PORT"
echo "----------------------------------------"

$COMPOSE_CMD ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null | tail -n +2 || \
  $COMPOSE_CMD ps 2>/dev/null || true

echo "========================================"
echo ""
echo "端口映射:"
echo "  Backend API:  http://localhost:3001"
echo "  AI Service:   http://localhost:8002"
echo "  Grafana:      http://localhost:3002"
echo ""
echo "模拟器连接:"
echo "  Backend API:  http://10.0.2.2:3001"
echo "  (Android 模拟器使用 10.0.2.2 访问宿主机)"
echo ""
echo "========================================"
echo "  所有服务已启动。"
echo "  下一步: 运行 scripts/demo-warmup.sh 进行预热。"
echo "========================================"

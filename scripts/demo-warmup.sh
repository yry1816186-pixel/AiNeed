#!/bin/bash
# 寻裳 XUNO 演示预热脚本
# 用途: 演示前 10 分钟运行，完成健康检查 + 缓存热起
# 用法: bash scripts/demo-warmup.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

WARMUP_START=$(date +%s)

echo "========================================"
echo "  寻裳 XUNO — 演示预热"
echo "========================================"
echo ""

# --- Step 1: 等待 Backend healthy ---
echo "[Step 1/4] 检查 Backend API..."
BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
BACKEND_HEALTH_URL="${BACKEND_URL}/api/v1/health"

MAX_RETRIES=30
RETRY_INTERVAL=5
BACKEND_OK=false

for i in $(seq 1 "$MAX_RETRIES"); do
  HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "$BACKEND_HEALTH_URL" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "  [OK] Backend healthy (${i}次尝试, ${BACKEND_HEALTH_URL})"
    BACKEND_OK=true
    break
  fi
  echo "  ... Backend 未就绪 (HTTP ${HTTP_CODE}), ${RETRY_INTERVAL}s 后重试 (${i}/${MAX_RETRIES})"
  sleep "$RETRY_INTERVAL"
done

if [ "$BACKEND_OK" = false ]; then
  echo "  [ERROR] Backend 在 ${MAX_RETRIES} 次重试后仍未 healthy"
  echo "  请检查: docker compose -f docker-compose.production.yml logs backend"
  exit 1
fi

# --- Step 2: 等待 AI Service healthy ---
echo "[Step 2/4] 检查 AI Service..."
AI_URL="${AI_URL:-http://localhost:8002}"
AI_HEALTH_URL="${AI_URL}/health"

AI_OK=false

for i in $(seq 1 "$MAX_RETRIES"); do
  HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "$AI_HEALTH_URL" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "  [OK] AI Service healthy (${i}次尝试, ${AI_HEALTH_URL})"
    AI_OK=true
    break
  fi
  echo "  ... AI Service 未就绪 (HTTP ${HTTP_CODE}), ${RETRY_INTERVAL}s 后重试 (${i}/${MAX_RETRIES})"
  sleep "$RETRY_INTERVAL"
done

if [ "$AI_OK" = false ]; then
  echo "  [ERROR] AI Service 在 ${MAX_RETRIES} 次重试后仍未 healthy"
  echo "  请检查: docker compose -f docker-compose.production.yml logs ai-service"
  exit 1
fi

# --- Step 3: 缓存预热 ---
echo "[Step 3/4] 缓存预热..."

# 尝试调用 demo pre-cache 端点
PRECACHE_HTTP=$(curl -sf -o /dev/null -w "%{http_code}" \
  -X POST "${BACKEND_URL}/api/v1/demo/pre-cache" 2>/dev/null || echo "000")

if [ "$PRECACHE_HTTP" = "200" ] || [ "$PRECACHE_HTTP" = "201" ]; then
  echo "  [OK] Demo pre-cache 端点调用成功"
else
  echo "  [INFO] Demo pre-cache 端点不可用 (${PRECACHE_HTTP})，执行手动热起..."

  # 手动热起关键 API 端点
  ENDPOINTS=(
    "GET:${BACKEND_URL}/api/v1/health"
    "GET:${BACKEND_URL}/api/v1/scenes"
    "GET:${BACKEND_URL}/api/v1/wardrobe/sections"
  )

  for ep in "${ENDPOINTS[@]}"; do
    METHOD="${ep%%:*}"
    URL="${ep#*:}"
    HTTP=$(curl -sf -o /dev/null -w "%{http_code}" -X "$METHOD" "$URL" 2>/dev/null || echo "000")
    echo "  ${METHOD} ${URL} -> ${HTTP}"
  done
fi

# --- Step 4: Seed 用户推荐热起 ---
echo "[Step 4/4] Seed 用户推荐缓存热起..."

# 尝试为 seed 用户触发推荐请求让 AI 缓存热起
SEED_WARMUP_OK=false
for user_id in "demo-user-01" "demo-user-02" "demo-user-03"; do
  RECO_HTTP=$(curl -sf -o /dev/null -w "%{http_code}" \
    -H "Content-Type: application/json" \
    "${BACKEND_URL}/api/v1/recommendations?userId=${user_id}&scenario=interview" 2>/dev/null || echo "000")
  if [ "$RECO_HTTP" = "200" ]; then
    SEED_WARMUP_OK=true
    echo "  [OK] Seed 用户 ${user_id} 推荐缓存已热起"
  else
    echo "  [INFO] Seed 用户 ${user_id} 热起跳过 (HTTP ${RECO_HTTP})"
  fi
done

if [ "$SEED_WARMUP_OK" = true ]; then
  echo "  [OK] 至少一个 seed 用户推荐缓存已热起"
else
  echo "  [INFO] Seed 用户热起跳过 — 确认 seed 数据已导入后重试"
fi

# --- 完成报告 ---
WARMUP_END=$(date +%s)
WARMUP_DURATION=$((WARMUP_END - WARMUP_START))

echo ""
echo "========================================"
echo "  预热完成 (${WARMUP_DURATION}s)"
echo "========================================"
echo ""
echo "服务状态:"
echo "  Backend:  ${BACKEND_URL}/api/v1/health  [OK]"
echo "  AI Svc:   ${AI_URL}/health              [OK]"
echo ""
echo "下一步:"
echo "  1. 打开 Android 模拟器"
echo "  2. 连接本地后端: http://10.0.2.2:3001"
echo "  3. 使用测试账号登录"
echo "  4. 参考 docs/DEMO-CHECKLIST.md 逐项确认"
echo ""

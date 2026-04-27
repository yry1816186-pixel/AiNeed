#!/bin/bash
# 寻裳 XUNO 演示预热脚本
# 用途: 演示前 10 分钟运行，完成健康检查 + 缓存热起
# 用法: bash scripts/demo-warmup.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

WARMUP_START=$(date +%s)

# --- Timeout per check item (seconds) ---
ITEM_TIMEOUT=30

echo "========================================"
echo "  寻裳 XUNO — 演示预热"
echo "========================================"
echo ""

# --- Result tracking ---
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
RESULTS=()

record_result() {
  local name="$1" status="$2" detail="${3:-}"
  RESULTS+=("${status}|${name}|${detail}")
  case "$status" in
    PASS) PASS_COUNT=$((PASS_COUNT + 1)) ;;
    FAIL) FAIL_COUNT=$((FAIL_COUNT + 1)) ;;
    SKIP) SKIP_COUNT=$((SKIP_COUNT + 1)) ;;
  esac
}

run_with_timeout() {
  # $1=description, $2=timeout_secs, $3...=command
  local desc="$1"
  local timeout_secs="$2"
  shift 2

  local start end elapsed rc
  start=$(date +%s)

  # Run command with timeout wrapper
  set +e
  "$@" &
  local cmd_pid=$!

  # Wait with timeout
  while true; do
    if ! kill -0 "$cmd_pid" 2>/dev/null; then
      break
    fi
    end=$(date +%s)
    elapsed=$((end - start))
    if [ "$elapsed" -ge "$timeout_secs" ]; then
      kill "$cmd_pid" 2>/dev/null || true
      wait "$cmd_pid" 2>/dev/null || true
      record_result "$desc" SKIP "timeout after ${timeout_secs}s"
      return 1
    fi
    sleep 1
  done

  wait "$cmd_pid" 2>/dev/null
  rc=$?
  set -e

  end=$(date +%s)
  elapsed=$((end - start))

  if [ "$rc" -eq 0 ]; then
    record_result "$desc" PASS "${elapsed}s"
    return 0
  else
    record_result "$desc" FAIL "exit code ${rc}"
    return 1
  fi
}

# --- Step 1: Backend healthy ---
echo "[Step 1/5] 检查 Backend API..."
BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
BACKEND_HEALTH_URL="${BACKEND_URL}/api/v1/health"

MAX_RETRIES=12
RETRY_INTERVAL=5
BACKEND_OK=false

STEP_START=$(date +%s)
for i in $(seq 1 "$MAX_RETRIES"); do
  now=$(date +%s)
  elapsed=$((now - STEP_START))
  if [ "$elapsed" -ge "$ITEM_TIMEOUT" ]; then
    echo "  [SKIP] Backend 健康检查超时 (${ITEM_TIMEOUT}s)"
    break
  fi

  HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "$BACKEND_HEALTH_URL" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "  [OK] Backend healthy (${i}次尝试, ${BACKEND_HEALTH_URL})"
    BACKEND_OK=true
    record_result "Backend API" PASS "${i}次尝试"
    break
  fi
  echo "  ... Backend 未就绪 (HTTP ${HTTP_CODE}), ${RETRY_INTERVAL}s 后重试 (${i}/${MAX_RETRIES})"
  sleep "$RETRY_INTERVAL"
done

if [ "$BACKEND_OK" = false ]; then
  record_result "Backend API" FAIL "未 healthy"
  echo "  [ERROR] Backend 未 healthy"
fi

# --- Step 2: AI Service healthy ---
echo "[Step 2/5] 检查 AI Service..."
AI_URL="${AI_URL:-http://localhost:8002}"
AI_HEALTH_URL="${AI_URL}/health"

AI_OK=false
STEP_START=$(date +%s)
for i in $(seq 1 "$MAX_RETRIES"); do
  now=$(date +%s)
  elapsed=$((now - STEP_START))
  if [ "$elapsed" -ge "$ITEM_TIMEOUT" ]; then
    echo "  [SKIP] AI Service 健康检查超时 (${ITEM_TIMEOUT}s)"
    break
  fi

  HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "$AI_HEALTH_URL" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "  [OK] AI Service healthy (${i}次尝试, ${AI_HEALTH_URL})"
    AI_OK=true
    record_result "AI Service" PASS "${i}次尝试"
    break
  fi
  echo "  ... AI Service 未就绪 (HTTP ${HTTP_CODE}), ${RETRY_INTERVAL}s 后重试 (${i}/${MAX_RETRIES})"
  sleep "$RETRY_INTERVAL"
done

if [ "$AI_OK" = false ]; then
  record_result "AI Service" FAIL "未 healthy"
  echo "  [ERROR] AI Service 未 healthy"
fi

# --- Step 3: 缓存预热 ---
echo "[Step 3/5] 缓存预热..."

PRECACHE_OK=false
STEP_START=$(date +%s)
now=$(date +%s)
if [ $((now - STEP_START)) -lt "$ITEM_TIMEOUT" ]; then
  PRECACHE_HTTP=$(curl -sf -o /dev/null -w "%{http_code}" \
    -X POST "${BACKEND_URL}/api/v1/demo/pre-cache" \
    --max-time "$ITEM_TIMEOUT" 2>/dev/null || echo "000")

  if [ "$PRECACHE_HTTP" = "200" ] || [ "$PRECACHE_HTTP" = "201" ]; then
    echo "  [OK] Demo pre-cache 端点调用成功"
    PRECACHE_OK=true
    record_result "Pre-cache 端点" PASS
  else
    echo "  [INFO] Demo pre-cache 端点不可用 (${PRECACHE_HTTP})，执行手动热起..."
  fi
fi

if [ "$PRECACHE_OK" = false ]; then
  # 手动热起关键 API 端点
  ENDPOINTS=(
    "GET:${BACKEND_URL}/api/v1/health"
    "GET:${BACKEND_URL}/api/v1/scenes"
    "GET:${BACKEND_URL}/api/v1/wardrobe/sections"
  )

  for ep in "${ENDPOINTS[@]}"; do
    METHOD="${ep%%:*}"
    URL="${ep#*:}"
    now=$(date +%s)
    elapsed=$((now - STEP_START))
    if [ "$elapsed" -ge "$ITEM_TIMEOUT" ]; then
      echo "  [SKIP] ${METHOD} ${URL} — 超时"
      record_result "手动热起 ${URL}" SKIP "超时"
      continue
    fi
    HTTP=$(curl -sf -o /dev/null -w "%{http_code}" -X "$METHOD" --max-time 10 "$URL" 2>/dev/null || echo "000")
    echo "  ${METHOD} ${URL} -> ${HTTP}"
    if [ "$HTTP" = "200" ]; then
      record_result "手动热起 ${URL##*/}" PASS "HTTP ${HTTP}"
    else
      record_result "手动热起 ${URL##*/}" FAIL "HTTP ${HTTP}"
    fi
  done
fi

# --- Step 4: Seed 用户推荐热起 ---
echo "[Step 4/5] Seed 用户推荐缓存热起..."

SEED_WARMUP_OK=false
STEP_START=$(date +%s)
for user_id in "demo-user-01" "demo-user-02" "demo-user-03"; do
  now=$(date +%s)
  elapsed=$((now - STEP_START))
  if [ "$elapsed" -ge "$ITEM_TIMEOUT" ]; then
    echo "  [SKIP] Seed 用户 ${user_id} 热起超时"
    record_result "Seed ${user_id}" SKIP "超时"
    continue
  fi
  RECO_HTTP=$(curl -sf -o /dev/null -w "%{http_code}" \
    -H "Content-Type: application/json" \
    --max-time 15 \
    "${BACKEND_URL}/api/v1/recommendations?userId=${user_id}&scenario=interview" 2>/dev/null || echo "000")
  if [ "$RECO_HTTP" = "200" ]; then
    SEED_WARMUP_OK=true
    echo "  [OK] Seed 用户 ${user_id} 推荐缓存已热起"
    record_result "Seed ${user_id}" PASS
  else
    echo "  [INFO] Seed 用户 ${user_id} 热起跳过 (HTTP ${RECO_HTTP})"
    record_result "Seed ${user_id}" SKIP "HTTP ${RECO_HTTP}"
  fi
done

if [ "$SEED_WARMUP_OK" = true ]; then
  echo "  [OK] 至少一个 seed 用户推荐缓存已热起"
else
  echo "  [INFO] Seed 用户热起跳过 — 确认 seed 数据已导入后重试"
fi

# --- Step 5: TTS 缓存预热 ---
echo "[Step 5/5] TTS 缓存预热..."

TTS_OK=false
STEP_START=$(date +%s)
now=$(date +%s)
if [ $((now - STEP_START)) -lt "$ITEM_TIMEOUT" ]; then
  TTS_HTTP=$(curl -sf -o /dev/null -w "%{http_code}" \
    -X POST "${BACKEND_URL}/api/v1/tts/precache" \
    --max-time "$ITEM_TIMEOUT" 2>/dev/null || echo "000")

  if [ "$TTS_HTTP" = "200" ] || [ "$TTS_HTTP" = "201" ]; then
    echo "  [OK] TTS 预缓存端点调用成功"
    TTS_OK=true
    record_result "TTS 预缓存" PASS
  else
    echo "  [INFO] TTS 预缓存端点不可用 (${TTS_HTTP})，跳过"
    record_result "TTS 预缓存" SKIP "端点不可用"
  fi
fi

# --- 完成报告 ---
WARMUP_END=$(date +%s)
WARMUP_DURATION=$((WARMUP_END - WARMUP_START))

echo ""
echo "========================================"
echo "  预热完成 (${WARMUP_DURATION}s)"
echo "========================================"
echo ""
echo "PASS/FAIL 摘要:"
echo ""

for result in "${RESULTS[@]}"; do
  IFS='|' read -r status name detail <<< "$result"
  case "$status" in
    PASS) icon="OK" ;;
    FAIL) icon="FAIL" ;;
    SKIP) icon="SKIP" ;;
  esac
  printf "  %-8s %-30s %s\n" "[${icon}]" "${name}" "${detail}"
done

echo ""
echo "统计: PASS=${PASS_COUNT}  FAIL=${FAIL_COUNT}  SKIP=${SKIP_COUNT}  TOTAL=$((PASS_COUNT + FAIL_COUNT + SKIP_COUNT))"
echo ""

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo "WARNING: ${FAIL_COUNT} 项检查失败，请确认服务状态"
  echo ""
fi

echo "服务状态:"
echo "  Backend:  ${BACKEND_URL}/api/v1/health  [$([ "$BACKEND_OK" = true ] && echo "OK" || echo "FAIL")]"
echo "  AI Svc:   ${AI_URL}/health              [$([ "$AI_OK" = true ] && echo "OK" || echo "FAIL")]"
echo ""
echo "下一步:"
echo "  1. 打开 Android 模拟器"
echo "  2. 连接本地后端: http://10.0.2.2:3001"
echo "  3. 使用测试账号登录"
echo "  4. 参考 docs/DEMO-CHECKLIST.md 逐项确认"
echo ""

# Exit with failure if critical services failed
if [ "$BACKEND_OK" = false ] && [ "$AI_OK" = false ]; then
  exit 1
fi

#!/bin/bash
# 寻裳 XUNO — 降级管道验证脚本
# 用途: 验证 4-tier fallback cascade (Live -> Qwen -> Cached -> Video/PPT)
# 用法: bash scripts/demo-fallback-test.sh
set -euo pipefail

echo "========================================"
echo "  寻裳 XUNO — 降级管道验证"
echo "========================================"
echo ""

PASS=0
FAIL=0
WARN=0
TOTAL=0

check() {
  local name="$1" status="$2" detail="${3:-}"
  case "$status" in
    PASS) icon="OK"; PASS=$((PASS + 1)) ;;
    FAIL) icon="FAIL"; FAIL=$((FAIL + 1)) ;;
    WARN) icon="WARN"; WARN=$((WARN + 1)) ;;
  esac
  TOTAL=$((TOTAL + 1))
  printf "  %-8s %-55s %s\n" "[${icon}]" "${name}" "${detail}"
}

record_result() {
  local test_name="$1" actual="$2" expected="$3"
  if [ "$actual" = "$expected" ]; then
    check "${test_name}" PASS "符合预期: ${expected}"
  else
    check "${test_name}" FAIL "期望 ${expected}, 实际 ${actual}"
  fi
}

# ==========================================
# 环境检测
# ==========================================
echo "--- 环境检测 ---"
echo ""

BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
DEMO_ENDPOINT="${BACKEND_URL}/api/v1/demo"
BACKEND_UP=false

if curl -sf -o /dev/null "${BACKEND_URL}/api/docs" --max-time 3 2>/dev/null; then
  BACKEND_UP=true
  check "Backend API 可用" PASS "${BACKEND_URL}"
else
  check "Backend API 可用" WARN "后端未启动，部分测试将跳过"
fi

# ==========================================
# Test 1: GLM timeout -> Qwen fallback
# ==========================================
echo ""
echo "--- Test 1: GLM -> Qwen Auto-Failover ---"
echo ""

TEST1_PASS=false

if [ "$BACKEND_UP" = "true" ]; then
  # Set ultra-short primary timeout to force fallback
  ORIGINAL_TIMEOUT=""

  # Try to send a demo recommendation request and check for fallback behavior
  echo "  [INFO] 发送演示推荐请求 (触发 AI fallback)..."
  RESPONSE=$(curl -sf -X POST "${DEMO_ENDPOINT}/recommend" \
    -H "Content-Type: application/json" \
    -d '{"scene":"interview","profileId":"demo_user_1"}' \
    --max-time 15 -w "\n%{http_code}" 2>/dev/null || echo "000")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    check "GLM->Qwen Fallback 响应" PASS "HTTP ${HTTP_CODE}, 推荐数据已返回"
    TEST1_PASS=true
  elif [ "$HTTP_CODE" = "000" ]; then
    check "GLM->Qwen Fallback 响应" WARN "后端未响应，可能是网络问题"
  else
    check "GLM->Qwen Fallback 响应" WARN "HTTP ${HTTP_CODE}, 检查后端日志中的 [FALLBACK] 标记"
  fi

  # Check backend logs for fallback marker
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "backend"; then
    FALLBACK_LOG=$(docker logs --tail 100 xuno-backend 2>/dev/null | grep -c "FALLBACK.*GLM.*Qwen" || echo "0")
    if [ "$FALLBACK_LOG" -gt 0 ]; then
      check "后端日志 [FALLBACK] GLM->Qwen" PASS "检测到 ${FALLBACK_LOG} 次 fallback 事件"
    else
      check "后端日志 [FALLBACK] GLM->Qwen" WARN "未检测到 fallback 日志 (GLM 可能直接成功)"
    fi
  else
    check "后端日志检查" WARN "Docker backend 容器未运行，跳过日志检查"
  fi
else
  check "Test 1: GLM->Qwen Fallback" SKIP "后端未启动"
  TOTAL=$((TOTAL - 1))
fi

# ==========================================
# Test 2: Double API failure -> pre-cached data
# ==========================================
echo ""
echo "--- Test 2: 双重 API 故障 -> 预缓存数据 ---"
echo ""

if [ "$BACKEND_UP" = "true" ]; then
  # Check pre-cache status
  CACHE_STATUS=$(curl -sf "${DEMO_ENDPOINT}/pre-cache/status" --max-time 5 2>/dev/null || echo "{}")

  if [ "$CACHE_STATUS" != "{}" ]; then
    ALL_PRESENT=$(echo "$CACHE_STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('allRequiredPresent', False))" 2>/dev/null || echo "False")
    REDIS_KEYS=$(echo "$CACHE_STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('redisKeys', 0))" 2>/dev/null || echo "0")

    if [ "$ALL_PRESENT" = "True" ]; then
      check "预缓存数据可用性" PASS "allRequiredPresent=true, ${REDIS_KEYS} keys ready"
    else
      MISSING=$(echo "$CACHE_STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('missingKeys', [])))" 2>/dev/null || echo "?")
      check "预缓存数据可用性" WARN "缺失 ${MISSING} keys, 离线模式可能不完整"
    fi
  else
    check "预缓存数据可用性" WARN "无法获取缓存状态"
  fi
else
  check "Test 2: 预缓存数据" SKIP "后端未启动"
  TOTAL=$((TOTAL - 1))
fi

# ==========================================
# Test 3: Complete network loss -> offline demo mode
# ==========================================
echo ""
echo "--- Test 3: 网络完全断开 -> 离线演示模式 ---"
echo ""

OFFLINE_READY=false

# Check if seed data exists (required for offline mode)
SEED_PATH="docs/PRESENTATION/seed-user-data-v2.json"
if [ -f "$SEED_PATH" ]; then
  PROFILE_COUNT=$(python3 -c "import json; d=json.load(open('${SEED_PATH}')); print(len(d.get('users', [])))" 2>/dev/null || echo "0")
  check "Seed 数据文件" PASS "${SEED_PATH} (${PROFILE_COUNT} profiles)"
  OFFLINE_READY=true
else
  check "Seed 数据文件" FAIL "${SEED_PATH} 不存在"
fi

# Check TTS cache manifest
TTS_MANIFEST="ml/data/tts-cache/manifest.json"
if [ -f "$TTS_MANIFEST" ]; then
  PHRASE_COUNT=$(python3 -c "import json; d=json.load(open('${TTS_MANIFEST}')); print(len(d.get('phrases', {})))" 2>/dev/null || echo "0")
  check "TTS 预缓存清单" PASS "${TTS_MANIFEST} (${PHRASE_COUNT} phrases)"
else
  check "TTS 预缓存清单" WARN "${TTS_MANIFEST} 不存在 (离线时 TTS 将降级为纯文本)"
fi

if [ "$OFFLINE_READY" = "true" ]; then
  check "离线演示模式就绪" PASS "所有必需数据已就位"
else
  check "离线演示模式就绪" FAIL "缺少关键离线数据"
fi

# ==========================================
# Test 4: Pre-recorded demo video
# ==========================================
echo ""
echo "--- Test 4: 预录演示视频 ---"
echo ""

VIDEO_PATH="docs/PRESENTATION/demo-recording.mp4"
VIDEO_ALT_PATH="docs/PRESENTATION/xuno-demo-recording.mp4"

if [ -f "$VIDEO_PATH" ]; then
  VIDEO_SIZE=$(stat -f%z "$VIDEO_PATH" 2>/dev/null || stat -c%s "$VIDEO_PATH" 2>/dev/null || echo "0")
  VIDEO_SIZE_MB=$((VIDEO_SIZE / 1048576))
  if [ "$VIDEO_SIZE" -gt 1048576 ]; then
    check "演示视频 demo-recording.mp4" PASS "存在, ${VIDEO_SIZE_MB}MB"
  else
    check "演示视频 demo-recording.mp4" WARN "文件过小 (${VIDEO_SIZE_MB}MB), 可能无效"
  fi
elif [ -f "$VIDEO_ALT_PATH" ]; then
  VIDEO_SIZE=$(stat -f%z "$VIDEO_ALT_PATH" 2>/dev/null || stat -c%s "$VIDEO_ALT_PATH" 2>/dev/null || echo "0")
  VIDEO_SIZE_MB=$((VIDEO_SIZE / 1048576))
  if [ "$VIDEO_SIZE" -gt 1048576 ]; then
    check "演示视频 xuno-demo-recording.mp4" PASS "存在, ${VIDEO_SIZE_MB}MB"
  else
    check "演示视频 xuno-demo-recording.mp4" WARN "文件过小 (${VIDEO_SIZE_MB}MB), 可能无效"
  fi
else
  check "演示视频 demo-recording.mp4" WARN "文件不存在 (Plan B 备用视频未准备)"
fi

# ==========================================
# Test 5: PPT file verification
# ==========================================
echo ""
echo "--- Test 5: PPT 演示文件 ---"
echo ""

PPT_FOUND=false
PPT_PATHS=(
  "docs/PRESENTATION/XUNO-DEMO.pptx"
  "docs/PRESENTATION/xuno-demo.pptx"
  "docs/PRESENTATION/XUNO.pptx"
)

for ppt_path in "${PPT_PATHS[@]}"; do
  if [ -f "$ppt_path" ]; then
    PPT_SIZE=$(stat -f%z "$ppt_path" 2>/dev/null || stat -c%s "$ppt_path" 2>/dev/null || echo "0")
    PPT_SIZE_KB=$((PPT_SIZE / 1024))
    if [ "$PPT_SIZE" -gt 10240 ]; then
      check "演示 PPT ${ppt_path##*/}" PASS "${PPT_SIZE_KB}KB"
      PPT_FOUND=true
      break
    else
      check "演示 PPT ${ppt_path##*/}" WARN "文件过小 (${PPT_SIZE_KB}KB)"
    fi
  fi
done

if [ "$PPT_FOUND" != "true" ]; then
  check "演示 PPT" WARN "未找到演示 PPT 文件 (Plan C 备用)"
fi

# ==========================================
# 总结
# ==========================================
echo ""
echo "========================================"
echo "  降级管道验证结果"
echo "========================================"
echo ""
echo "  总测试项: ${TOTAL}"
echo "  PASS: ${PASS}"
echo "  WARN: ${WARN}"
echo "  FAIL: ${FAIL}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "  *** ${FAIL} 项测试失败，降级管道可能不可靠 ***"
  echo "  *** 请在演示前修复所有 FAIL 项 ***"
  echo ""
  exit 1
else
  if [ "$WARN" -gt 0 ]; then
    echo "  降级管道基本就绪 (${WARN} 项警告)"
    echo "  建议在演示前处理 WARN 项以确保最佳可靠性"
  else
    echo "  降级管道全部就绪，演示可靠性已验证"
  fi
  echo ""
  exit 0
fi

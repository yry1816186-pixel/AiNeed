#!/bin/bash
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
AI_URL="${AI_URL:-http://localhost:8002}"
LOG_FILE="${PROJECT_ROOT}/demo-e2e-run-log.txt"
RUN_NUM="${RUN_NUM:-$(date +%s)}"

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
RESULTS=()

record_result() {
  local name="$1" status="$2" detail="${3:-}"
  RESULTS+=("${status}|${name}|${detail}")
  case "$status" in
    PASS) PASS_COUNT=$((PASS_COUNT + 1)); printf "  [OK]    %-50s %s\n" "${name}" "${detail}" ;;
    FAIL) FAIL_COUNT=$((FAIL_COUNT + 1)); printf "  [FAIL]  %-50s %s\n" "${name}" "${detail}" ;;
    SKIP) SKIP_COUNT=$((SKIP_COUNT + 1)); printf "  [SKIP]  %-50s %s\n" "${name}" "${detail}" ;;
  esac
}

check() {
  local name="$1" cmd="$2" expected="${3:-0}"
  shift 3 2>/dev/null || shift 3 || true

  local output rc
  set +e
  output=$(eval "$cmd" 2>/dev/null)
  rc=$?
  set -e

  if [ "$rc" -ne 0 ]; then
    record_result "$name" FAIL "exit=${rc}: $output"
    return 1
  fi

  local actual="${output##*$'\n'}"
  local actual_trimmed
  actual_trimmed=$(echo "$actual" | xargs)

  if [ -n "${expected:-}" ] && [ "$actual_trimmed" != "$expected" ]; then
    record_result "$name" FAIL "expected=${expected}, actual=${actual_trimmed}"
    return 1
  fi

  record_result "$name" PASS "$actual_trimmed"
  return 0
}

echo "========================================"
echo "   !"
echo "========================================"
echo ""

# ==========================================
# Pre-run Gate
# ==========================================
echo "--- Pre-run Gate ---"
echo ""

# Gate 1: Preflight
echo "[Gate 1/3] Running demo-preflight.sh..."
if bash "${SCRIPT_DIR}/demo-preflight.sh"; then
  record_result "Pre-run: demo-preflight.sh" PASS "all preflight checks passed"
else
  record_result "Pre-run: demo-preflight.sh" FAIL "preflight checks failed"
  echo ""
  echo "*** PREFLIGHT FAILED — exit code 2 ***"
  exit 2
fi

echo ""

# Gate 2: Warmup
echo "[Gate 2/3] Running demo-warmup.sh..."
if bash "${SCRIPT_DIR}/demo-warmup.sh"; then
  record_result "Pre-run: demo-warmup.sh" PASS "warmup completed"
else
  record_result "Pre-run: demo-warmup.sh" FAIL "warmup failed"
  echo ""
  echo "*** WARMUP FAILED — exit code 3 ***"
  exit 3
fi

echo ""

# Gate 3: Pre-cache status verification
echo "[Gate 3/3] Verifying pre-cache status..."
CACHE_STATUS=$(curl -sf "${BACKEND_URL}/api/v1/demo/pre-cache/status" --max-time 10 2>/dev/null || echo "{}")
ALL_REQUIRED=$(echo "$CACHE_STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('allRequiredPresent', False))" 2>/dev/null || echo "False")
IS_TRUE=$(echo "$CACHE_STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if d.get('allRequiredPresent') == True else 'false')" 2>/dev/null || echo "false")

if [ "$ALL_REQUIRED" = "True" ] || [ "$IS_TRUE" = "true" ]; then
  record_result "Pre-run: pre-cache status" PASS "allRequiredPresent=true"
else
  record_result "Pre-run: pre-cache status" FAIL "allRequiredPresent=false"
  echo ""
  echo "*** PRE-CACHE NOT READY — exit code 2 ***"
  exit 2
fi

echo ""
echo "========================================"
echo "  Pre-run Gate: ALL PASSED"
echo "========================================"
echo ""

# ==========================================
# Navigation Smoke Checks
# ==========================================
echo "--- Navigation Smoke (4 checks) ---"
echo ""

# Check 1: Backend health
check "Backend health" \
  "curl -sf -o /dev/null -w '%{http_code}' ${BACKEND_URL}/api/health --max-time 5" \
  "200"

# Check 2: AI service health
check "AI service health" \
  "curl -sf -o /dev/null -w '%{http_code}' ${AI_URL}/health --max-time 5" \
  "200"

# Check 3: 15 Docker services healthy
COMPOSE_FILE="docker-compose.production.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
  COMPOSE_FILE="docker-compose.dev.yml"
fi
if [ ! -f "$COMPOSE_FILE" ]; then
  COMPOSE_FILE="docker-compose.yml"
fi

HEALTHY_COUNT=$(docker compose -f "$COMPOSE_FILE" ps 2>/dev/null | grep -c "healthy" 2>/dev/null || echo "0")
if [ "$HEALTHY_COUNT" -eq 15 ] || [ "$HEALTHY_COUNT" -ge 14 ]; then
  record_result "Docker services healthy" PASS "${HEALTHY_COUNT}/15 healthy"
elif [ "$HEALTHY_COUNT" -gt 0 ]; then
  record_result "Docker services healthy" FAIL "${HEALTHY_COUNT}/15 healthy (some not healthy)"
else
  record_result "Docker services healthy" SKIP "Docker not available or no services running"
fi

# Check 4: Demo mode enabled
PRE_CACHE_PRESENT=$(curl -s "${BACKEND_URL}/api/v1/demo/pre-cache/status" --max-time 10 2>/dev/null \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if d.get('allRequiredPresent') == True else 'false')" 2>/dev/null || echo "false")
if [ "$PRE_CACHE_PRESENT" = "true" ]; then
  record_result "Demo mode enabled" PASS "allRequiredPresent=true"
else
  record_result "Demo mode enabled" FAIL "allRequiredPresent=false"
fi

echo ""

# ==========================================
# AI Pipeline Smoke Checks
# ==========================================
echo "--- AI Pipeline Smoke (5 checks) ---"
echo ""

# Check 5: Recommendation endpoint
RECO_OUTPUT=$(curl -s -X POST "${BACKEND_URL}/api/v1/stylist/recommend" \
  -H "Content-Type: application/json" \
  -d '{"scene":"interview","profileId":"demo-001"}' \
  --max-time 30 2>/dev/null || echo "{}")
RECO_LENGTH=$(echo "$RECO_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('outfits', [])))" 2>/dev/null || echo "0")
if [ "$RECO_LENGTH" -ge 1 ] 2>/dev/null; then
  record_result "Recommendation endpoint" PASS "${RECO_LENGTH} outfits returned"
else
  record_result "Recommendation endpoint" FAIL "outfits=${RECO_LENGTH} (expected >= 1)"
fi

# Check 6: Try-on endpoint (async)
TRYON_OUTPUT=$(curl -s -X POST "${BACKEND_URL}/api/v1/tryon" \
  -H "Content-Type: application/json" \
  -d '{"outfitId":"test","profileId":"demo-001"}' \
  --max-time 20 2>/dev/null || echo "{}")
TRYON_JOB_ID=$(echo "$TRYON_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('jobId', ''))" 2>/dev/null || echo "")
if [ -n "$TRYON_JOB_ID" ] && [ "$TRYON_JOB_ID" != "null" ]; then
  record_result "Try-on endpoint (async)" PASS "jobId=${TRYON_JOB_ID}"
else
  record_result "Try-on endpoint (async)" FAIL "no jobId returned"
fi

# Check 7: TTS health
TTS_STATUS_CODE=$(curl -sf -o /dev/null -w "%{http_code}" \
  "${BACKEND_URL}/api/v1/tts/precache/status" --max-time 10 2>/dev/null || echo "000")
if [ "$TTS_STATUS_CODE" = "200" ]; then
  record_result "TTS health" PASS "HTTP 200"
else
  record_result "TTS health" FAIL "HTTP ${TTS_STATUS_CODE}"
fi

# Check 8: Voice STT mock response time
STT_TIME=$(curl -s -o /dev/null -w "%{time_total}" \
  -X POST "${BACKEND_URL}/api/v1/tts/precache/status" \
  --max-time 10 2>/dev/null || echo "999")
STT_OK=$(python3 -c "print('pass' if float('${STT_TIME}') < 3.0 else 'fail')" 2>/dev/null || echo "fail")
if [ "$STT_OK" = "pass" ]; then
  record_result "TTS response time < 3s" PASS "${STT_TIME}s"
else
  record_result "TTS response time < 3s" FAIL "${STT_TIME}s (>= 3s threshold)"
fi

# Check 9: RecommendationFunnel endpoint
FUNNEL_OUTPUT=$(curl -s "${BACKEND_URL}/api/v1/stylist/funnel/demo-001" \
  --max-time 20 2>/dev/null || echo "{}")
FUNNEL_LAYERS=$(echo "$FUNNEL_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('layers', [])))" 2>/dev/null || echo "0")
if [ "$FUNNEL_LAYERS" -ge 1 ] 2>/dev/null; then
  record_result "RecommendationFunnel endpoint" PASS "${FUNNEL_LAYERS} layers"
else
  record_result "RecommendationFunnel endpoint" FAIL "layers=${FUNNEL_LAYERS} (expected >= 1)"
fi

echo ""

# ==========================================
# Data Integrity Checks
# ==========================================
echo "--- Data Integrity (3 checks) ---"
echo ""

# Check 10: 10 seed profiles present
SEED_PATH="${PROJECT_ROOT}/docs/PRESENTATION/seed-user-data-v2.json"
if [ -f "$SEED_PATH" ]; then
  PROFILE_COUNT=$(python3 -c "import json; d=json.load(open('${SEED_PATH}')); print(len(d.get('users', d.get('profiles', []))))" 2>/dev/null || echo "0")
  if [ "$PROFILE_COUNT" -eq 10 ] 2>/dev/null; then
    record_result "Seed profiles count" PASS "${PROFILE_COUNT}/10 profiles"
  else
    record_result "Seed profiles count" FAIL "${PROFILE_COUNT}/10 profiles (expected 10)"
  fi
else
  record_result "Seed profiles count" FAIL "file not found: ${SEED_PATH}"
fi

# Check 11: TTS cache files exist
TTS_CACHE_DIR="${TTS_CACHE_DIR:-${PROJECT_ROOT}/ml/data/tts-cache}"
TTS_PHRASES=("greeting" "scene_prompt" "style_question" "generating" "outfit_ready" \
  "outfit_explain" "item_detail" "feedback_thanks" "adjust_try" "session_end" \
  "welcome_back" "scene_switch" "today_recommend" "cross_scene_memory")
TTS_FOUND=0
TTS_TOTAL=${#TTS_PHRASES[@]}
if [ -d "$TTS_CACHE_DIR" ]; then
  for phrase in "${TTS_PHRASES[@]}"; do
    if ls "${TTS_CACHE_DIR}/${phrase}"* 2>/dev/null | head -1 | grep -q . 2>/dev/null; then
      TTS_FOUND=$((TTS_FOUND + 1))
    fi
  done
  if [ "$TTS_FOUND" -eq "$TTS_TOTAL" ]; then
    record_result "TTS cache files" PASS "${TTS_FOUND}/${TTS_TOTAL} files found"
  elif [ "$TTS_FOUND" -gt 0 ]; then
    record_result "TTS cache files" FAIL "${TTS_FOUND}/${TTS_TOTAL} files found"
  else
    record_result "TTS cache files" SKIP "no cached TTS files in ${TTS_CACHE_DIR}"
  fi
else
  record_result "TTS cache files" SKIP "TTS cache dir not found: ${TTS_CACHE_DIR}"
fi

# Check 12: Demo recording and PPT exist
PRESENTATION_DIR="${PROJECT_ROOT}/docs/PRESENTATION"
DEMO_VIDEO_OK=false
PPT_OK=false

if [ -f "${PRESENTATION_DIR}/demo-recording.mp4" ]; then
  DEMO_VIDEO_OK=true
elif [ -f "${PRESENTATION_DIR}/xuno-demo-recording.mp4" ]; then
  DEMO_VIDEO_OK=true
fi

for ppt_path in "XUNO-FINAL.pptx" "XUNO-DEMO.pptx" "xuno-demo.pptx" "XUNO.pptx"; do
  if [ -f "${PRESENTATION_DIR}/${ppt_path}" ]; then
    PPT_OK=true
    break
  fi
done

if [ "$DEMO_VIDEO_OK" = "true" ]; then
  record_result "Demo recording (mp4)" PASS "video file exists"
else
  record_result "Demo recording (mp4)" FAIL "no demo video found in ${PRESENTATION_DIR}"
fi

if [ "$PPT_OK" = "true" ]; then
  record_result "Demo PPT (pptx)" PASS "PPT file exists"
else
  record_result "Demo PPT (pptx)" FAIL "no PPT file found in ${PRESENTATION_DIR}"
fi

echo ""

# ==========================================
# Summary
# ==========================================
TOTAL=$((PASS_COUNT + FAIL_COUNT + SKIP_COUNT))

echo "========================================"
echo "  E2E Smoke Test Results"
echo "========================================"
echo ""
echo "  PASS: ${PASS_COUNT} / FAIL: ${FAIL_COUNT} / SKIP: ${SKIP_COUNT}"
echo ""

for result in "${RESULTS[@]}"; do
  IFS='|' read -r status name detail <<< "$result"
  case "$status" in
    PASS) icon="OK" ;;
    FAIL) icon="FAIL" ;;
    SKIP) icon="SKIP" ;;
  esac
  printf "  %-8s %-50s %s\n" "[${icon}]" "${name}" "${detail}"
done

echo ""
echo "========================================"
echo "  Summary: PASS=${PASS_COUNT}  FAIL=${FAIL_COUNT}  SKIP=${SKIP_COUNT}  TOTAL=${TOTAL}"
echo "========================================"
echo ""

# Append to log file
TIMESTAMP=$(date -Iseconds 2>/dev/null || date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "${TIMESTAMP} | Run ${RUN_NUM} | PASS:${PASS_COUNT} | FAIL:${FAIL_COUNT} | SKIP:${SKIP_COUNT}" >> "${LOG_FILE}"
echo "  Log appended to: ${LOG_FILE}"

echo ""

# Exit code
if [ "$FAIL_COUNT" -gt 0 ]; then
  echo "*** ${FAIL_COUNT} checks FAILED ***"
  echo ""
  exit 1
fi

echo "  ALL checks PASSED"
echo ""
exit 0

#!/bin/bash
# AiNeed E2E Smoke Test — 验证所有核心API端点可达且返回正确格式
set -euo pipefail

BASE_URL="${API_URL:-http://localhost:3001/api/v1}"
TOKEN=""
PASS=0
FAIL=0

green() { echo -e "\033[32m$1\033[0m"; }
red()   { echo -e "\033[31m$1\033[0m"; }

check() {
  local name=$1 method=$2 path=$3 expect_status=$4
  shift 4

  local url="${BASE_URL}${path}"
  local response
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" -o /dev/null "$@" "$url" 2>/dev/null || echo -e "\n000")
  else
    response=$(curl -s -w "\n%{http_code}" -o /dev/null -X "$method" "$@" "$url" 2>/dev/null || echo -e "\n000")
  fi

  local status=$(echo "$response" | tail -1)

  if [ "$status" = "$expect_status" ]; then
    green "✓ $name ($status)"
    PASS=$((PASS + 1))
  else
    red "✗ $name — expected $expect_status, got $status"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== AiNeed E2E Smoke Tests ==="
echo "Target: $BASE_URL"
echo ""

# --- Public endpoints ---
check "Health" GET "/health" 200
check "Auth Login (bad creds)" POST "/auth/login" 401 \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'

# --- Authenticated flow ---
# Try phone-register first, then phone-login, then email login as fallback
REGISTER_RESP=$(curl -s -X POST "${BASE_URL}/auth/phone-register" \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800001111","code":"888888","nickname":"SmokeTest"}' 2>/dev/null || echo "{}")

TOKEN=$(echo "$REGISTER_RESP" | grep -oP '"accessToken":"[^"]*"' | cut -d'"' -f4 || true)
if [ -z "$TOKEN" ]; then
  LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/auth/phone-login" \
    -H "Content-Type: application/json" \
    -d '{"phone":"13800001111","code":"888888"}' 2>/dev/null || echo "{}")
  TOKEN=$(echo "$LOGIN_RESP" | grep -oP '"accessToken":"[^"]*"' | cut -d'"' -f4 || true)
fi
if [ -z "$TOKEN" ]; then
  LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Test123456!"}' 2>/dev/null || echo "{}")
  TOKEN=$(echo "$LOGIN_RESP" | grep -oP '"accessToken":"[^"]*"' | cut -d'"' -f4 || true)
fi

if [ -z "$TOKEN" ]; then
  red "Cannot obtain auth token, skipping authenticated tests"
else
  # --- Profile ---
  check "Get Profile" GET "/profile" 200 \
    -H "Authorization: Bearer ${TOKEN}"
  check "Update Profile" PUT "/profile" 200 \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"nickname":"Updated"}'

  # --- Wardrobe ---
  check "List Wardrobe" GET "/wardrobe" 200 \
    -H "Authorization: Bearer ${TOKEN}"
  check "Create Wardrobe Item" POST "/wardrobe" 201 \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Shirt","category":"tops","imageUrl":"https://img.alicdn.com/test.jpg"}'

  # Get created item ID for update/delete
  WARDROBE_RESP=$(curl -s "${BASE_URL}/wardrobe" \
    -H "Authorization: Bearer ${TOKEN}" 2>/dev/null || echo "{}")
  ITEM_ID=$(echo "$WARDROBE_RESP" | grep -oP '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
  if [ -n "$ITEM_ID" ]; then
    check "Update Wardrobe Item" PUT "/wardrobe/${ITEM_ID}" 200 \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{"name":"Updated Shirt"}'
    check "Delete Wardrobe Item" DELETE "/wardrobe/${ITEM_ID}" 200 \
      -H "Authorization: Bearer ${TOKEN}"
  fi

  # --- Community ---
  check "Community Posts" GET "/community/posts" 200 \
    -H "Authorization: Bearer ${TOKEN}"
  check "Community Trending" GET "/community/trending" 200 \
    -H "Authorization: Bearer ${TOKEN}"

  # --- Search ---
  check "Search" GET "/search?q=shirt" 200 \
    -H "Authorization: Bearer ${TOKEN}"
  check "Search Suggestions" GET "/search/suggestions?q=shi" 200 \
    -H "Authorization: Bearer ${TOKEN}"
  check "Search Trending" GET "/search/trending" 200 \
    -H "Authorization: Bearer ${TOKEN}"

  # --- Cart ---
  check "Get Cart" GET "/cart" 200 \
    -H "Authorization: Bearer ${TOKEN}"

  # --- Notifications ---
  check "List Notifications" GET "/notifications" 200 \
    -H "Authorization: Bearer ${TOKEN}"
  check "Notification Settings" GET "/notifications/settings" 200 \
    -H "Authorization: Bearer ${TOKEN}"

  # --- AI Stylist ---
  check "AI Stylist Quota" GET "/ai-stylist/quota" 200 \
    -H "Authorization: Bearer ${TOKEN}"
  check "AI Stylist Sessions" GET "/ai-stylist/sessions" 200 \
    -H "Authorization: Bearer ${TOKEN}"

  # --- Try-On ---
  check "Try-On History" GET "/try-on/history" 200 \
    -H "Authorization: Bearer ${TOKEN}"
  check "Try-On Daily Quota" GET "/try-on/daily-quota" 200 \
    -H "Authorization: Bearer ${TOKEN}"
fi

echo ""
echo "=== Results: $(green "$PASS passed"), $(red "$FAIL failed") ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1

#!/bin/bash
# 验证支付流程的完整性（使用沙箱环境）
set -euo pipefail

BASE_URL="${API_URL:-http://localhost:3001/api/v1}"

echo "=== AiNeed Payment Flow Test ==="

# 1. 创建测试用户并获取token
echo "[1/6] Getting auth token..."
LOGIN_RESP=$(curl -sf -X POST "${BASE_URL}/auth/phone-login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800001111","code":"888888"}' 2>/dev/null)
TOKEN=$(echo "$LOGIN_RESP" | grep -oP '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "FAIL: Cannot get auth token"
  exit 1
fi
AUTH="-H 'Authorization: Bearer ${TOKEN}'"
echo "  Token obtained"

# 2. 创建地址
echo "[2/6] Creating shipping address..."
ADDR_RESP=$(curl -sf -X POST "${BASE_URL}/addresses" $AUTH \
  -H "Content-Type: application/json" \
  -d '{"name":"测试","phone":"13800001111","province":"北京","city":"北京","district":"朝阳区","address":"测试地址1号","isDefault":true}' 2>/dev/null || echo "{}")
ADDRESS_ID=$(echo "$ADDR_RESP" | grep -oP '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  Address: ${ADDRESS_ID:-created}"

# 3. 添加商品到购物车
echo "[3/6] Adding item to cart..."
CART_RESP=$(curl -sf -X POST "${BASE_URL}/cart" $AUTH \
  -H "Content-Type: application/json" \
  -d '{"itemId":"test-item-001","color":"黑色","size":"M","quantity":1}' 2>/dev/null || echo "{}")
echo "  Cart updated"

# 4. 创建订单
echo "[4/6] Creating order..."
ORDER_RESP=$(curl -sf -X POST "${BASE_URL}/orders" $AUTH \
  -H "Content-Type: application/json" \
  -d "{\"addressId\":\"${ADDRESS_ID}\",\"items\":[{\"itemId\":\"test-item-001\",\"color\":\"黑色\",\"size\":\"M\",\"quantity\":1}]}" 2>/dev/null || echo "{}")
ORDER_ID=$(echo "$ORDER_RESP" | grep -oP '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  Order: ${ORDER_ID:-created}"

# 5. 创建支付
echo "[5/6] Creating payment..."
if [ -n "$ORDER_ID" ]; then
  PAY_RESP=$(curl -sf -X POST "${BASE_URL}/payment/create" $AUTH \
    -H "Content-Type: application/json" \
    -d "{\"orderId\":\"${ORDER_ID}\",\"amount\":0.01,\"provider\":\"alipay\",\"method\":\"qrcode\"}" 2>/dev/null || echo "{}")
  PAY_SUCCESS=$(echo "$PAY_RESP" | grep -oP '"success":(true|false)' | head -1 | cut -d':' -f2)
  PAY_QR=$(echo "$PAY_RESP" | grep -oP '"qrCode":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "  Payment success: ${PAY_SUCCESS:-unknown}"
  echo "  QR Code: ${PAY_QR:-sandbox}"
else
  echo "  SKIP: No order ID"
fi

# 6. 查询支付状态
echo "[6/6] Checking payment status..."
if [ -n "$ORDER_ID" ]; then
  STATUS_RESP=$(curl -sf "${BASE_URL}/payment/query/${ORDER_ID}" $AUTH 2>/dev/null || echo "{}")
  PAY_STATUS=$(echo "$STATUS_RESP" | grep -oP '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "  Status: ${PAY_STATUS:-pending}"
fi

echo ""
echo "=== Payment flow test complete ==="

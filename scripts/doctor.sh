#!/usr/bin/env bash
# ============================================================
# doctor.sh — 项目环境健康检查
# Phase 1 / GOV-03
# 返回值: 0 = 全部通过, 非0 = 存在环境问题
# ============================================================
set -euo pipefail

PASS=0
FAIL=0
WARN=0

# ---- 颜色 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_pass()  { echo -e "  ${GREEN}[PASS]${NC} $1"; PASS=$((PASS + 1)); }
log_fail()  { echo -e "  ${RED}[FAIL]${NC} $1"; FAIL=$((FAIL + 1)); }
log_warn()  { echo -e "  ${YELLOW}[WARN]${NC} $1"; WARN=$((WARN + 1)); }

echo "============================================"
echo " 寻裳 XunO — 环境健康检查 (doctor.sh)"
echo "============================================"
echo ""

# ---- 1. Node.js ----
echo "[1/7] Node.js 运行时"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -ge 20 ]; then
        log_pass "Node.js $(node -v) (>=20 required)"
    else
        log_fail "Node.js $(node -v) — 需要 >=20.0.0"
    fi
else
    log_fail "Node.js 未安装 — 需要 >=20.0.0"
fi

# ---- 2. pnpm ----
echo "[2/7] 包管理器 pnpm"
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm -v)
    log_pass "pnpm ${PNPM_VERSION}"
    # pnpm version mismatch check
    DECLARED_PM=$(node -e "try{console.log(require('./package.json').packageManager)}catch(e){}" 2>/dev/null || echo "")
    if [ -n "$DECLARED_PM" ]; then
        echo "        声明版本: $DECLARED_PM (实际: ${PNPM_VERSION})"
    fi
else
    log_fail "pnpm 未安装 — 请运行: npm install -g pnpm"
fi

# ---- 3. Lock file ----
echo "[3/7] Lock 文件"
if [ -f "pnpm-lock.yaml" ]; then
    log_pass "pnpm-lock.yaml 存在"
else
    log_fail "pnpm-lock.yaml 不存在"
fi

# ---- 4. 依赖安装状态 ----
echo "[4/7] 依赖安装状态"
if [ -d "node_modules" ] && [ -f "node_modules/.pnpm/lock.yaml" ]; then
    log_pass "node_modules/ 已安装 (pnpm)"
elif [ -d "node_modules" ]; then
    log_warn "node_modules/ 存在但不是 pnpm 安装 (可能用错包管理器)"
else
    log_warn "node_modules/ 不存在 — 请运行: pnpm install"
fi

# ---- 5. 关键配置文件 ----
echo "[5/7] 关键配置文件"
check_file() {
    if [ -f "$1" ]; then
        log_pass "$1"
    else
        log_fail "$1 缺失"
    fi
}
check_file "package.json"
check_file "pnpm-workspace.yaml"
check_file "turbo.json"
check_file "tsconfig.json"
check_file "docker-compose.dev.yml"

# ---- 6. 构建命令可用性 ----
echo "[6/7] 构建命令"
if grep -q '"build"' package.json 2>/dev/null; then
    log_pass "build 命令已定义 (pnpm build)"
else
    log_warn "build 命令未在 package.json 中定义"
fi
if grep -q '"test"' package.json 2>/dev/null; then
    log_pass "test 命令已定义 (pnpm test)"
else
    log_warn "test 命令未在 package.json 中定义"
fi

# ---- 7. 可选: Python/Docker ----
echo "[7/7] 可选运行时"
if command -v python3 &> /dev/null || command -v python &> /dev/null; then
    PY_CMD=$(command -v python3 || command -v python)
    log_pass "Python $("$PY_CMD" --version 2>&1)"
else
    log_warn "Python 3.11+ 未安装 (ML 服务需要)"
fi

if command -v docker &> /dev/null; then
    log_pass "Docker $(docker --version 2>/dev/null | grep -oP '\d+\.\d+' | head -1)"
else
    log_warn "Docker 未安装 (基础设施需要)"
fi

# ---- 汇总 ----
echo ""
echo "============================================"
echo -e "结果: ${GREEN}${PASS} 通过${NC}  ${YELLOW}${WARN} 警告${NC}  ${RED}${FAIL} 失败${NC}"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
    echo -e "${RED}环境检查未通过 — 请修复上述 FAIL 项${NC}"
    exit 1
fi

echo -e "${GREEN}环境检查通过${NC}"
exit 0

#!/usr/bin/env bash
# ============================================================
# test.sh — 项目测试脚本
# Phase 1 / GOV-05
# 默认: 全量测试 (turbo test)
# 选项: --backend | --mobile | --admin | --shared | --ml | --all
# ============================================================
set -euo pipefail

# ---- 颜色 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE} 寻裳 XunO — 测试 (test.sh)${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ---- 参数解析 ----
TEST_TARGET="${1:-all}"
EXIT_CODE=0

run_test() {
    local label="$1"
    local cmd="$2"
    local required="${3:-true}"
    echo -e "  ${BLUE}[TEST]${NC} ${label}..."
    echo -e "  $ ${cmd}"
    echo ""
    if eval "$cmd"; then
        echo -e "  ${GREEN}[PASS]${NC} ${label}"
    else
        if [ "$required" = "true" ]; then
            echo -e "  ${RED}[FAIL]${NC} ${label}"
            EXIT_CODE=1
        else
            echo -e "  ${YELLOW}[SKIP]${NC} ${label} — 非必需, 继续..."
        fi
    fi
}

case "$TEST_TARGET" in
    all)
        # 确保有 node_modules
        if [ ! -d "node_modules" ]; then
            echo -e "${YELLOW}[WARN]${NC} node_modules/ 不存在"
            echo "  跳过测试 — 请先运行: pnpm install && bash scripts/build.sh"
            exit 0
        fi

        # 全量测试 (turbo)
        run_test "全量测试 (turbo)" "pnpm test" "false"

        # 后端测试单独运行 (如 turbo 失败)
        if [ -f "apps/backend/jest.config.js" ]; then
            run_test "后端 Jest (@xuno/backend)" "pnpm --filter @xuno/backend test" "false"
        fi

        # 移动端测试
        if [ -f "apps/mobile/jest.config.js" ]; then
            run_test "移动端 Jest (@xuno/mobile)" "pnpm --filter @xuno/mobile test" "false"
        fi
        ;;

    backend)
        run_test "后端 Jest (@xuno/backend)" "pnpm --filter @xuno/backend test" "true"
        ;;

    mobile)
        run_test "移动端 Jest (@xuno/mobile)" "pnpm --filter @xuno/mobile test" "true"
        ;;

    admin)
        run_test "管理后台 Vitest (@xuno/admin)" "cd apps/admin && npx vitest run" "true"
        ;;

    shared)
        run_test "共享包 (@xuno/shared)" "pnpm --filter @xuno/shared test" "true"
        ;;

    ml)
        if [ -f "ml/pyproject.toml" ] || [ -f "ml/requirements.txt" ]; then
            run_test "Python ML 测试" "cd ml && python -m pytest" "false"
        else
            echo -e "${YELLOW}[SKIP]${NC} ML 目录未找到 Python 配置"
        fi
        ;;

    *)
        echo "用法: bash scripts/test.sh [all|backend|mobile|admin|shared|ml]"
        echo "  默认: all (全量测试, 非必需包失败不阻断)"
        exit 1
        ;;
esac

echo ""
echo -e "============================================"
if [ "$EXIT_CODE" -eq 0 ]; then
    echo -e "${GREEN} 测试全部通过${NC}"
else
    echo -e "${RED} 存在测试失败${NC}"
fi
echo -e "============================================"
exit $EXIT_CODE

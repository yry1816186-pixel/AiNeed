#!/usr/bin/env bash
# ============================================================
# build.sh — 项目构建脚本
# Phase 1 / GOV-04
# 默认: 全量构建 (turbo build)
# 选项: --backend | --admin | --types | --mobile 单独构建
# ============================================================
set -euo pipefail

# ---- 颜色 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE} 寻裳 XunO — 构建 (build.sh)${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ---- 参数解析 ----
BUILD_TARGET="${1:-all}"

run_build() {
    local label="$1"
    local cmd="$2"
    echo -e "  ${BLUE}[BUILD]${NC} ${label}..."
    echo -e "  $ ${cmd}"
    echo ""
    if eval "$cmd"; then
        echo -e "  ${GREEN}[OK]${NC} ${label}"
    else
        echo -e "  ${RED}[FAIL]${NC} ${label} — 构建失败"
        return 1
    fi
}

case "$BUILD_TARGET" in
    all)
        # 1. 安装依赖（如需要）
        if [ ! -d "node_modules" ]; then
            echo -e "${YELLOW}[WARN]${NC} node_modules/ 不存在，先安装依赖..."
            pnpm install
            echo ""
        fi

        # 2. Prisma 生成
        if [ -f "apps/backend/prisma/schema.prisma" ]; then
            run_build "Prisma Client 生成" "pnpm --filter @xuno/backend db:generate" || true
        fi

        # 3. 全量构建
        if grep -q '"build"' package.json 2>/dev/null; then
            run_build "全量构建 (turbo)" "pnpm build"
        else
            echo -e "${YELLOW}[SKIP]${NC} 未找到 build 命令"
        fi
        ;;

    backend)
        if [ -f "apps/backend/prisma/schema.prisma" ]; then
            run_build "Prisma Client 生成" "pnpm --filter @xuno/backend db:generate" || true
        fi
        run_build "后端 (@xuno/backend)" "pnpm --filter @xuno/backend build"
        ;;

    admin)
        run_build "管理后台 (@xuno/admin)" "pnpm --filter @xuno/admin build"
        ;;

    types)
        run_build "共享类型 (@xuno/types)" "pnpm --filter @xuno/types build"
        ;;

    mobile)
        echo -e "${YELLOW}[WARN]${NC} React Native 移动端通过 Metro 打包, 不在此构建"
        echo "  请使用: pnpm dev:mobile 或 cd apps/mobile && npx expo start"
        ;;

    *)
        echo "用法: bash scripts/build.sh [all|backend|admin|types|mobile]"
        echo "  默认: all (全量构建)"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN} 构建完成${NC}"
echo -e "${GREEN}============================================${NC}"

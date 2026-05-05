#!/usr/bin/env bash
# ============================================================
# start.sh — 项目启动脚本
# Phase 1 / GOV-06
# 功能: 启动基础设施 + 若干应用
# 用法:
#   bash scripts/start.sh              # 启动基础设施 (Docker) + 交互选择
#   bash scripts/start.sh infra        # 仅启动基础设施
#   bash scripts/start.sh backend      # 启动后端开发服务器
#   bash scripts/start.sh mobile       # 启动移动端 Expo/Metro
#   bash scripts/start.sh admin        # 启动管理后台 Vite
#   bash scripts/start.sh full         # 启动基础设施 + 全部应用 (需多个终端)
# ============================================================
set -euo pipefail

# ---- 颜色 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE} 寻裳 XunO — 启动 (start.sh)${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

START_TARGET="${1:-help}"

start_infra() {
    echo -e "  ${CYAN}[INFRA]${NC} 启动基础设施 (Docker)..."
    if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
        if [ -f "docker-compose.dev.yml" ]; then
            echo -e "  $ docker compose -f docker-compose.dev.yml up -d"
            docker compose -f docker-compose.dev.yml up -d
            echo -e "  ${GREEN}[OK]${NC} 基础设施已启动"
            echo ""
            echo "  服务列表:"
            docker compose -f docker-compose.dev.yml ps 2>/dev/null || true
        else
            echo -e "  ${RED}[FAIL]${NC} docker-compose.dev.yml 不存在"
            return 1
        fi
    else
        echo -e "  ${RED}[FAIL]${NC} Docker 未安装"
        echo "  请手动启动以下服务:"
        echo "    - PostgreSQL 16 (port 5432)"
        echo "    - Redis 7 (port 6379)"
        echo "    - MinIO (ports 9000/9001)"
        echo "    - Qdrant (port 6333)"
        return 1
    fi
}

start_backend() {
    echo -e "  ${CYAN}[APP]${NC} 启动后端开发服务器..."
    echo -e "  $ pnpm dev"
    echo ""
    echo -e "  ${YELLOW}[NOTE]${NC} 这是一个持续运行的进程。按 Ctrl+C 停止。"
    echo -e "  ${YELLOW}[NOTE]${NC} 数据库必须先可用 (运行: bash scripts/start.sh infra)"
    echo ""
    pnpm dev
}

start_mobile() {
    echo -e "  ${CYAN}[APP]${NC} 启动移动端 Metro/Expo..."
    echo -e "  $ pnpm dev:mobile"
    echo ""
    echo -e "  ${YELLOW}[NOTE]${NC} 这是一个持续运行的进程。按 Ctrl+C 停止。"
    echo ""
    pnpm dev:mobile
}

start_admin() {
    echo -e "  ${CYAN}[APP]${NC} 启动管理后台 Vite 开发服务器..."
    echo -e "  $ pnpm dev:admin"
    echo ""
    echo -e "  ${YELLOW}[NOTE]${NC} 这是一个持续运行的进程。按 Ctrl+C 停止。"
    echo ""
    pnpm dev:admin
}

case "$START_TARGET" in
    infra)
        start_infra
        ;;

    backend)
        start_backend
        ;;

    mobile)
        start_mobile
        ;;

    admin)
        start_admin
        ;;

    full)
        echo -e "${YELLOW}============================================${NC}"
        echo -e "${YELLOW} 全栈启动指南${NC}"
        echo -e "${YELLOW}============================================${NC}"
        echo ""
        echo "全栈启动需要多个终端窗口："
        echo ""
        echo "  终端 1: bash scripts/start.sh infra    # 基础设施"
        echo "  终端 2: bash scripts/start.sh backend  # 后端 API"
        echo "  终端 3: bash scripts/start.sh mobile   # 移动端 Expo"
        echo "  终端 4: bash scripts/start.sh admin    # 管理后台 (可选)"
        echo ""
        echo "启动顺序: infra → backend → mobile/admin"
        echo ""
        echo "启动后访问:"
        echo "  后端 API:       http://localhost:3000"
        echo "  Swagger 文档:   http://localhost:3000/api/docs"
        echo "  Expo DevTools:  http://localhost:8081"
        echo "  管理后台:       http://localhost:5173"
        echo "  MinIO Console:  http://localhost:9001"
        ;;

    *)
        echo "用法: bash scripts/start.sh <target>"
        echo ""
        echo "Targets:"
        echo "  infra    启动基础设施 (PostgreSQL, Redis, MinIO, Qdrant)"
        echo "  backend  启动后端 NestJS 开发服务器 (:3000)"
        echo "  mobile   启动移动端 Expo/Metro (:8081)"
        echo "  admin    启动管理后台 Vite (:5173)"
        echo "  full     显示全栈启动指南 (多终端)"
        echo ""
        echo "示例:"
        echo "  bash scripts/start.sh infra"
        echo "  bash scripts/start.sh backend"
        ;;
esac

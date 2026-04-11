#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

GREEN='\033[0;32m'
NC='\033[0m'

echo "========================================="
echo "  AiNeed V3 - 停止开发环境"
echo "========================================="

echo -e "${GREEN}[INFO]${NC} 优雅停止所有服务..."
docker compose down --timeout 30

echo ""
echo -e "${GREEN}[INFO]${NC} 所有服务已停止"
echo ""
echo "数据保留在 ./data/ 目录中"
echo "如需清除数据: rm -rf ./data/"
echo ""

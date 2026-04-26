#!/bin/bash
# 寻裳 XUNO 生产部署脚本
# 目标: 4C8G 腾讯云轻量应用服务器
# 用法: bash infrastructure/scripts/deploy-production.sh [--skip-pull] [--dry-run]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

SKIP_PULL=false
DRY_RUN=false

for arg in "$@"; do
  case $arg in
    --skip-pull) SKIP_PULL=true ;;
    --dry-run) DRY_RUN=true ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

echo "=== 寻裳 XUNO 生产部署 ==="
echo "目标: 4C8G 腾讯云轻量应用服务器"
echo "项目根目录: $PROJECT_ROOT"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo "[DRY-RUN] 仅验证配置，不执行部署"
fi

# 1. 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
  echo "错误: Docker 未运行或未安装"
  exit 1
fi
echo "[OK] Docker 运行中"

# 2. 检查 secrets 目录
if [ ! -d "$PROJECT_ROOT/secrets" ]; then
  echo "创建 secrets 目录..."
  mkdir -p "$PROJECT_ROOT/secrets"
fi

# 3. 检查 .env.production
if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
  echo "错误: .env.production 不存在"
  echo "请复制 .env.production.example 并填写实际值"
  exit 1
fi
echo "[OK] .env.production 存在"

# 4. 验证必要 secrets 文件
MISSING_SECRETS=0
for secret in jwt_secret database_url openai_api_key fal_api_key; do
  if [ ! -f "$PROJECT_ROOT/secrets/${secret}.txt" ]; then
    echo "警告: secrets/${secret}.txt 不存在"
    MISSING_SECRETS=$((MISSING_SECRETS + 1))
  fi
done
if [ $MISSING_SECRETS -gt 0 ]; then
  echo "警告: ${MISSING_SECRETS} 个 secret 文件缺失，部分功能可能不可用"
else
  echo "[OK] 所有 secret 文件就绪"
fi

# 5. TLS 证书检查
if [ ! -d "/etc/letsencrypt/live/xuno.cn" ]; then
  echo "警告: TLS 证书 /etc/letsencrypt/live/xuno.cn 不存在"
  echo "请先运行: certbot certonly --standalone -d xuno.cn"
fi

# 6. 验证 Docker Compose 配置
echo ""
echo "验证 Docker Compose 配置..."
if ! docker compose -f "$PROJECT_ROOT/docker-compose.production.yml" config > /dev/null 2>&1; then
  echo "错误: docker-compose.production.yml 配置验证失败"
  docker compose -f "$PROJECT_ROOT/docker-compose.production.yml" config
  exit 1
fi
echo "[OK] Docker Compose 配置验证通过"

# 7. 拉取最新镜像
if [ "$SKIP_PULL" = false ] && [ "$DRY_RUN" = false ]; then
  echo ""
  echo "拉取 Docker 镜像..."
  docker compose -f "$PROJECT_ROOT/docker-compose.production.yml" pull
fi

# 8. 停止旧服务（如果运行中）
if [ "$DRY_RUN" = false ]; then
  echo ""
  echo "停止旧服务..."
  docker compose -f "$PROJECT_ROOT/docker-compose.production.yml" down --remove-orphans 2>/dev/null || true
fi

# 9. 启动服务
if [ "$DRY_RUN" = false ]; then
  echo ""
  echo "启动生产服务..."
  docker compose -f "$PROJECT_ROOT/docker-compose.production.yml" up -d

  # 10. 等待健康检查
  echo ""
  echo "等待服务健康检查 (30s)..."
  sleep 30
fi

# 11. 验证部署
echo ""
echo "=== 部署验证 ==="
if [ "$DRY_RUN" = false ]; then
  docker compose -f "$PROJECT_ROOT/docker-compose.production.yml" ps
  echo ""
  echo "内存使用:"
  docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}" 2>/dev/null || true
else
  echo "[DRY-RUN] 跳过服务状态检查"
fi

echo ""
echo "=== 部署完成 ==="
echo "API: https://xuno.cn/api/v1/health"
echo "AI Service: https://xuno.cn/ai/health"
echo "Grafana: https://xuno.cn/grafana/"
echo ""
echo "常用命令:"
echo "  查看日志: docker compose -f docker-compose.production.yml logs -f [service]"
echo "  重启服务: docker compose -f docker-compose.production.yml restart [service]"
echo "  停止服务: docker compose -f docker-compose.production.yml down"

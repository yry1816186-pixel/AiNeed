#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "========================================="
echo "  AiNeed V3 - 开发环境启动"
echo "========================================="

log_info "创建数据目录..."
mkdir -p data/postgres data/redis data/minio data/qdrant data/neo4j data/neo4j-logs data/elasticsearch

if [ "$(uname)" = "Linux" ]; then
  sudo chown -R 1000:1000 data/elasticsearch
fi

log_info "启动所有服务..."
docker compose up -d

log_info "等待服务健康检查通过..."

wait_for_healthy() {
  local service=$1
  local max_attempts=${2:-30}
  local attempt=1

  while [ $attempt -le $max_attempts ]; do
    local status
    status=$(docker inspect --format='{{.State.Health.Status}}' "aineed-${service}" 2>/dev/null || echo "unknown")

    if [ "$status" = "healthy" ]; then
      log_info "${service} 已就绪"
      return 0
    fi

    if [ $attempt -eq 1 ]; then
      echo -n "  等待 ${service}"
    fi
    echo -n "."
    sleep 3
    attempt=$((attempt + 1))
  done

  echo ""
  log_warn "${service} 在 ${max_attempts} 次尝试后仍未就绪，继续执行..."
  return 1
}

wait_for_healthy postgres 20
wait_for_healthy redis 10
wait_for_healthy minio 15
wait_for_healthy qdrant 15
wait_for_healthy neo4j 30
wait_for_healthy elasticsearch 40

echo ""
log_info "执行初始化脚本..."

if command -v mc &> /dev/null; then
  bash init/init-minio.sh
else
  log_warn "mc 客户端未安装，跳过 MinIO 初始化。可手动安装: brew install minio/stable/mc"
fi

if command -v cypher-shell &> /dev/null; then
  bash init/init-neo4j.sh
else
  log_warn "cypher-shell 未安装，跳过 Neo4j 初始化。可手动执行: docker exec -it aineed-neo4j cypher-shell"
fi

bash init/init-elasticsearch.sh
bash init/init-qdrant.sh

echo ""
echo "========================================="
echo "  AiNeed V3 开发环境已启动!"
echo "========================================="
echo ""
echo "服务地址:"
echo "  PostgreSQL:      localhost:5432"
echo "  Redis:           localhost:6379"
echo "  MinIO API:       http://localhost:9000"
echo "  MinIO Console:   http://localhost:9001"
echo "  Qdrant API:      http://localhost:6333"
echo "  Qdrant gRPC:     localhost:6334"
echo "  Neo4j Browser:   http://localhost:7474"
echo "  Neo4j Bolt:      bolt://localhost:7687"
echo "  Elasticsearch:   http://localhost:9200"
echo ""
echo "环境变量文件: ${SCRIPT_DIR}/.env.docker"
echo "查看日志: docker compose logs -f [服务名]"
echo "停止服务: bash stop.sh"
echo ""

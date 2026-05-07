#!/bin/bash
# AutoDL 云服务器一键初始化脚本
# 适用: RTX 4090 / A5000 + PyTorch 2.x + CUDA 12.x 镜像
# 用法: bash cloud_setup.sh

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[INFO]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; }

PROJECT_DIR="/root/autodl-tmp/xuno-ml"

# ============================================================
log "1/6 配置 HuggingFace 镜像（国内加速）"
# ============================================================
export HF_ENDPOINT="https://hf-mirror.com"
echo 'export HF_ENDPOINT="https://hf-mirror.com"' >> ~/.bashrc

# ============================================================
log "2/6 安装依赖"
# ============================================================
pip install -e ${PROJECT_DIR}/ml \
    -i https://pypi.tuna.tsinghua.edu.cn/simple \
    --trusted-host pypi.tuna.tsinghua.edu.cn

# ============================================================
log "3/6 下载模型权重"
# ============================================================
python -c "
from sentence_transformers import CrossEncoder
m = CrossEncoder('BAAI/bge-reranker-base')
print('BGE Reranker downloaded')
"

python -c "
import mediapipe as mp
mp.solutions.pose.Pose(static_image_mode=True)
print('MediaPipe Pose downloaded')
"

# ============================================================
log "4/6 验证嵌入模型（GPU）"
# ============================================================
python -c "
from ml.services.rag.embeddings import EmbeddingService
svc = EmbeddingService()
dim = svc.dimension
r = svc.encode_query('面试穿什么')
print(f'Embedding OK: dim={dim}, device={svc.config.device}, sample[0]={r[0]:.4f}')
"

# ============================================================
log "5/6 启动 Qdrant + Redis"
# ============================================================
cd ${PROJECT_DIR}

# 使用项目自带的 dev compose（仅基础设施）
docker compose -f docker-compose.dev.yml up -d qdrant redis

sleep 5
log "等待 Qdrant 就绪..."
for i in $(seq 1 10); do
    if curl -s http://localhost:6333/healthz > /dev/null 2>&1; then
        ok "Qdrant 就绪"
        break
    fi
    sleep 2
done

# ============================================================
log "6/6 灌入向量数据 + E2E 验证"
# ============================================================
python ml/scripts/seed_qdrant.py

python -c "
from ml.services.rag.embeddings import EmbeddingService
from ml.services.rag.qdrant_client import QdrantVectorStore, QdrantConfig
svc = EmbeddingService()
store = QdrantVectorStore(config=QdrantConfig(embedding_dim=svc.dimension))
r = svc.encode_query('面试正装推荐')
hits = store.search(r, top_k=3)
print(f'检索成功: {len(hits)} 条结果')
for h in hits:
    print(f'  - {h[\"metadata\"].get(\"name\")} (score={h[\"score\"]:.4f})')
"

echo ""
echo "============================================"
echo -e "${GREEN}初始化完成！启动 AI 服务：${NC}"
echo "  cd ${PROJECT_DIR}"
echo "  python -m uvicorn ml.api.main:app --host 0.0.0.0 --port 8002"
echo "============================================"

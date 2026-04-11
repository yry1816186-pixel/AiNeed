#!/bin/bash
set -e

QDRANT_URL="http://localhost:6333"

echo "=== Qdrant 初始化 ==="

until curl -sf "${QDRANT_URL}/healthz" > /dev/null 2>&1; do
  echo "等待 Qdrant 启动..."
  sleep 3
done

echo "Qdrant 已就绪"

create_collection() {
  local name=$1
  local vectors_config=$2

  local exists
  exists=$(curl -sf "${QDRANT_URL}/collections/${name}" 2>/dev/null | grep -o '"status":"ok"' || true)

  if [ -n "$exists" ]; then
    echo "Collection '${name}' 已存在，跳过"
  else
    curl -sf -X PUT "${QDRANT_URL}/collections/${name}" \
      -H 'Content-Type: application/json' \
      -d "{\"vectors\": ${vectors_config}, \"optimizers_config\": {\"indexing_threshold\": 20000}}" \
      > /dev/null 2>&1
    echo "Collection '${name}' 创建成功"
  fi
}

echo "创建 fashion-clip collection (visual 512d)..."
create_collection "fashion-clip" '{"size": 512, "distance": "Cosine"}'

echo "创建 bge-m3 collection (textual 1024d)..."
create_collection "bge-m3" '{"size": 1024, "distance": "Cosine"}'

echo "创建 outfit-templates collection (fused 256d)..."
create_collection "outfit-templates" '{"size": 256, "distance": "Cosine"}'

echo "创建 community-posts collection (semantic 512d)..."
create_collection "community-posts" '{"size": 512, "distance": "Cosine"}'

echo "创建 fashion-knowledge collection (semantic 512d)..."
create_collection "fashion-knowledge" '{"size": 512, "distance": "Cosine"}'

echo "创建 user-embeddings collection (preference 256d)..."
create_collection "user-embeddings" '{"size": 256, "distance": "Cosine"}'

echo "创建 custom-designs collection (semantic 512d)..."
create_collection "custom-designs" '{"size": 512, "distance": "Cosine"}'

echo "创建 outfit-images collection (semantic 512d)..."
create_collection "outfit-images" '{"size": 512, "distance": "Cosine"}'

echo "=== Qdrant 初始化完成 ==="

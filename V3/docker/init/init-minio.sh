#!/bin/bash
set -e

MINIO_ENDPOINT="localhost:9000"
MINIO_ACCESS_KEY="aineed_minio"
MINIO_SECRET_KEY="aineed_minio_secret_2026"
BUCKETS=("aineed-uploads" "aineed-designs" "aineed-avatars")

echo "=== MinIO 初始化 ==="

until curl -sf "http://${MINIO_ENDPOINT}/minio/health/live" > /dev/null 2>&1; do
  echo "等待 MinIO 启动..."
  sleep 3
done

echo "MinIO 已就绪，配置 mc 客户端..."
mc alias set aineed "http://${MINIO_ENDPOINT}" "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}" --api s3v4

for bucket in "${BUCKETS[@]}"; do
  if mc ls "aineed/${bucket}" > /dev/null 2>&1; then
    echo "Bucket '${bucket}' 已存在，跳过"
  else
    mc mb "aineed/${bucket}"
    echo "Bucket '${bucket}' 创建成功"
  fi
done

echo "=== MinIO 初始化完成 ==="

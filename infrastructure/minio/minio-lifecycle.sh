#!/bin/sh
# ============================================================
# MinIO 生命周期策略配置脚本
# ============================================================
# 功能：
#   - temp/ 前缀文件：7 天自动过期删除
#   - photos/ 前缀文件：90 天转为低频存储（Warm tier）
# ============================================================
# 使用方法：
#   1. 确保 MinIO 客户端已安装: https://min.io/docs/minio/linux/reference/minio-mc.html
#   2. 配置 alias: mc alias set xuno http://localhost:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY
#   3. 执行此脚本: chmod +x minio-lifecycle.sh && ./minio-lifecycle.sh
# ============================================================

set -e

ALIAS="xuno"
BUCKET="xuno"

echo "==> 配置 MinIO 生命周期策略: ${ALIAS}/${BUCKET}"

# ----------------------------------------------------------
# 1. temp/ 前缀 — 7 天自动过期
# ----------------------------------------------------------
echo "  => temp/ 前缀: 7天过期删除"
mc ilm rule add --expire-days "7" \
  --prefix "temp/" \
  "${ALIAS}/${BUCKET}"

# ----------------------------------------------------------
# 2. photos/ 前缀 — 90 天转为低频存储
# ----------------------------------------------------------
echo "  => photos/ 前缀: 90天转为低频存储"
mc ilm rule add --transition-days "90" \
  --transition-tier "WARM" \
  --prefix "photos/" \
  "${ALIAS}/${BUCKET}"

echo "==> 当前生命周期规则:"
mc ilm rule list "${ALIAS}/${BUCKET}"

echo "==> 完成"

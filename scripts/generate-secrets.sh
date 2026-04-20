#!/usr/bin/env bash
# generate-secrets.sh
# Generate cryptographically random secrets for all .env keys.
# Usage: bash scripts/generate-secrets.sh > .env.generated
#        or review output and copy needed values into your .env

set -euo pipefail

gen_hex() {
  openssl rand -hex "$1"
}

cat <<EOF
# ============================================================
# Auto-generated secrets - $(date -Iseconds 2>/dev/null || date)
# Replace the corresponding values in your .env file.
# DO NOT commit real secrets to version control.
# ============================================================

# PostgreSQL
POSTGRES_PASSWORD=$(gen_hex 32)

# Redis
REDIS_PASSWORD=$(gen_hex 32)

# MinIO
MINIO_ROOT_USER=minio_$(gen_hex 4)
MINIO_ROOT_PASSWORD=$(gen_hex 32)
MINIO_ACCESS_KEY=minio_$(gen_hex 4)
MINIO_SECRET_KEY=$(gen_hex 32)

# JWT (64-byte = 128 hex chars)
JWT_SECRET=$(gen_hex 64)
JWT_REFRESH_SECRET=$(gen_hex 64)

# Encryption (32-byte = 64 hex chars for AES-256)
ENCRYPTION_KEY=$(gen_hex 32)

# Grafana
GRAFANA_ADMIN_PASSWORD=$(gen_hex 32)

# ============================================================
# API keys below are NOT auto-generated.
# Fill them in manually with your actual provider keys.
# ============================================================

# AI Service
GLM_API_KEY=
ZHIPU_API_KEY=
OPENAI_API_KEY=
EOF

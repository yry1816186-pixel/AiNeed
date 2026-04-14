#!/bin/sh
set -e

MISSING=0
REQUIRED_VARS="
DATABASE_URL
REDIS_URL
JWT_SECRET
JWT_REFRESH_SECRET
ENCRYPTION_KEY
MINIO_ENDPOINT
MINIO_ACCESS_KEY
MINIO_SECRET_KEY
"

echo "=== Environment Variable Validation ==="

for VAR in $REQUIRED_VARS; do
  if [ -z "$(eval echo \$$VAR)" ]; then
    echo "MISSING: $VAR"
    MISSING=$((MISSING + 1))
  else
    echo "OK: $VAR"
  fi
done

if [ "$MISSING" -gt 0 ]; then
  echo ""
  echo "FATAL: $MISSING required environment variable(s) missing. Refusing to start."
  exit 1
fi

echo ""
echo "All required environment variables present. Starting application..."
exec "$@"

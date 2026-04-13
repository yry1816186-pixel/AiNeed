#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

step=0
total=7

next_step() { step=$((step + 1)); echo -e "\n${CYAN}━━━ Step ${step}/${total}: $* ━━━${NC}"; }

check_command() {
  if command -v "$1" &>/dev/null; then
    ok "$1 found: $(command -v "$1")"
    return 0
  else
    fail "$1 not found. Please install $2"
    return 1
  fi
}

check_version() {
  local cmd="$1" min="$2" label="$3"
  local ver
  ver=$("$cmd" --version 2>/dev/null | head -1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
  if [ -z "$ver" ]; then
    warn "Could not detect ${label} version"
    return
  fi
  local min_major min_minor ver_major ver_minor
  min_major=$(echo "$min" | cut -d. -f1)
  min_minor=$(echo "$min" | cut -d. -f2)
  ver_major=$(echo "$ver" | cut -d. -f1)
  ver_minor=$(echo "$ver" | cut -d. -f2)
  if [ "$ver_major" -gt "$min_major" ] || { [ "$ver_major" -eq "$min_major" ] && [ "$ver_minor" -ge "$min_minor" ]; }; then
    ok "${label} ${ver} >= ${min}"
  else
    fail "${label} ${ver} < required ${min}. Please upgrade."
  fi
}

copy_env() {
  local src="$1" dst="$2"
  if [ -f "$dst" ]; then
    warn "$dst already exists, skipping (delete it manually to regenerate)"
  else
    cp "$src" "$dst"
    ok "Created $dst from $(basename "$src")"
  fi
}

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════╗"
echo "║       寻裳 XunO - Dev Environment Setup      ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Step 1: Check dependencies ───
next_step "Check dependencies"

check_command node "Node.js (https://nodejs.org/)"
check_version node "20.0" "Node.js"

check_command pnpm "pnpm (https://pnpm.io/)"
check_version pnpm "8.0" "pnpm"

check_command docker "Docker (https://docs.docker.com/get-docker/)"
check_command python3 "Python 3.11+ (https://www.python.org/)"

if docker compose version &>/dev/null; then
  ok "Docker Compose V2 found"
else
  if command -v docker-compose &>/dev/null; then
    ok "Docker Compose V1 found"
  else
    fail "Docker Compose not found"
  fi
fi

# ─── Step 2: Create .env files ───
next_step "Create .env files from examples"

copy_env "$REPO_ROOT/apps/backend/.env.example" "$REPO_ROOT/apps/backend/.env"
copy_env "$REPO_ROOT/apps/mobile/.env.example"  "$REPO_ROOT/apps/mobile/.env"
copy_env "$REPO_ROOT/ml/.env.example"            "$REPO_ROOT/ml/.env"

if [ ! -f "$REPO_ROOT/.env" ]; then
  cp "$REPO_ROOT/.env.example" "$REPO_ROOT/.env"
  ok "Created .env from .env.example"
else
  warn ".env already exists, skipping"
fi

warn "Review and fill in API keys in .env files before proceeding!"
echo "  Key files to check:"
echo "    - apps/backend/.env  (GLM_API_KEY, JWT_SECRET, etc.)"
echo "    - ml/.env            (GLM_API_KEY, ZHIPU_API_KEY)"

# ─── Step 3: Install Node.js dependencies ───
next_step "Install Node.js dependencies (pnpm install)"

cd "$REPO_ROOT"
if [ -d "node_modules" ]; then
  warn "node_modules exists, running pnpm install to update..."
else
  info "Running pnpm install..."
fi
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
ok "Node.js dependencies installed"

# ─── Step 4: Start Docker services ───
next_step "Start Docker infrastructure (PostgreSQL + Redis + MinIO)"

cd "$REPO_ROOT"
if docker compose -f docker-compose.dev.yml ps 2>/dev/null | grep -q "xuno-dev-postgres"; then
  warn "Docker services already running, checking health..."
else
  info "Starting Docker services..."
  docker compose -f docker-compose.dev.yml up -d
fi

info "Waiting for services to be healthy..."
MAX_WAIT=60
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  PG_HEALTHY=$(docker inspect --format='{{.State.Health.Status}}' xuno-dev-postgres 2>/dev/null || echo "unknown")
  RD_HEALTHY=$(docker inspect --format='{{.State.Health.Status}}' xuno-dev-redis 2>/dev/null || echo "unknown")
  MN_HEALTHY=$(docker inspect --format='{{.State.Health.Status}}' xuno-dev-minio 2>/dev/null || echo "unknown")

  if [ "$PG_HEALTHY" = "healthy" ] && [ "$RD_HEALTHY" = "healthy" ] && [ "$MN_HEALTHY" = "healthy" ]; then
    ok "All Docker services healthy"
    break
  fi

  echo "  PostgreSQL: $PG_HEALTHY | Redis: $RD_HEALTHY | MinIO: $MN_HEALTHY"
  sleep 3
  WAITED=$((WAITED + 3))
done

if [ $WAITED -ge $MAX_WAIT ]; then
  fail "Docker services did not become healthy within ${MAX_WAIT}s. Check: docker compose -f docker-compose.dev.yml logs"
fi

# ─── Step 5: Generate Prisma client & run migrations ───
next_step "Database migration (Prisma)"

cd "$REPO_ROOT/apps/backend"
info "Generating Prisma client..."
pnpm db:generate

info "Running database migrations..."
pnpm db:migrate 2>/dev/null || {
  warn "Migration failed, trying db:push instead..."
  pnpm db:push
}
ok "Database schema synced"

# ─── Step 6: Seed database ───
next_step "Seed database with development data"

cd "$REPO_ROOT/apps/backend"
info "Running seed script..."
pnpm db:seed 2>/dev/null || npx ts-node prisma/seed.ts
ok "Database seeded"

# ─── Step 7: Summary ───
next_step "Setup complete!"

echo -e ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Setup Complete! 🎉                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo "Services running:"
echo "  PostgreSQL  → localhost:5432  (user: xuno, db: xuno)"
echo "  Redis       → localhost:6379  (password: redis123)"
echo "  MinIO API   → localhost:9000  (console: localhost:9001)"
echo "  MinIO Login → minioadmin / minioadmin123"
echo ""
echo "Next steps:"
echo "  1. Fill in API keys in apps/backend/.env (GLM_API_KEY, etc.)"
echo "  2. Start backend:    cd apps/backend && pnpm dev"
echo "  3. Start mobile:     cd apps/mobile  && npx react-native start --port 8081"
echo "  4. Start ML service: cd ml && python -m api.main"
echo ""
echo "Test account: test@example.com / Test123456!"
echo ""
echo "Health check: curl http://localhost:3001/api/v1/health"

# External Integrations

**Analysis Date:** 2026-04-14

## APIs & External Services

**AI / LLM Providers:**
- **Zhipu GLM API** - Primary multimodal AI (text generation, image generation, stylist chat)
  - SDK/Client: `httpx` / `aiohttp` async HTTP in `ml/services/intelligent_stylist_service.py`
  - Auth: `GLM_API_KEY` / `ZHIPU_API_KEY` env var
  - Endpoint: `https://open.bigmodel.cn/api/paas/v4`
  - Models: `glm-5` (stylist), `glm-4v-plus` (vision, virtual try-on fallback)
  - Used by: AI Stylist (`ml/services/intelligent_stylist_service.py`), Visual Outfit (`ml/services/visual_outfit_service.py`), Virtual Try-On (`ml/services/virtual_tryon_service.py`)

- **Doubao Seedream API (ByteDance Volcano Engine)** - Primary virtual try-on image generation
  - SDK/Client: `httpx` async HTTP in `ml/services/virtual_tryon_service.py`
  - Auth: `DOUBAO_SEEDREAM_API_KEY` env var
  - Endpoints: `https://visual.volcengineapi.com/v1/aigc/generate`, `https://visual.volcengineapi.com/v1/aigc/result`
  - Model: `doubao-seedream-3-0-t2i-250415`
  - Pattern: Async submit + polling for result

- **E-commerce Platform APIs** - Product search (Taobao, JD.com)
  - SDK/Client: `aiohttp` in `ml/services/visual_outfit_service.py`
  - Auth: `TAOBAO_APP_KEY`, `TAOBAO_APP_SECRET`, `JD_APP_KEY`, `JD_APP_SECRET`
  - Used for: Real product search in visual outfit plans

## Data Storage

**Databases:**
- **PostgreSQL 16** - Primary relational database
  - Connection: `DATABASE_URL` env var
  - Client: Prisma ORM (`@prisma/client` 5.x)
  - Schema: `apps/backend/prisma/schema.prisma`
  - Hosted via Docker (`postgres:16-alpine`)

- **Neo4j 5 Community** - Knowledge graph for fashion relationships
  - Connection: `NEO4J_URL` env var, ports 7474 (HTTP) / 7687 (Bolt)
  - Client: `neo4j-driver` 6.x
  - Used by: `apps/backend/src/modules/recommendations/services/knowledge-graph.service.ts`, `neo4j.service.ts`
  - Auth: `NEO4J_USER` / `NEO4J_PASSWORD`

- **Qdrant 1.8.4** - Vector similarity search
  - Connection: `QDRANT_URL` env var (default `http://localhost:6333`)
  - Client (Backend): `@qdrant/js-client-rest` 1.x in `apps/backend/src/modules/recommendations/services/qdrant.service.ts`
  - Client (ML): `qdrant-client` 1.7+ in `ml/services/fashion_knowledge_rag.py`
  - Collections: `clothing_items`, `fashion_knowledge`
  - Memory fallback when Qdrant unavailable

**File Storage:**
- **MinIO** (S3-compatible) - Image and asset storage
  - Connection: `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`, ports 9000 (API) / 9001 (Console)
  - Client: `minio` 7.x npm package
  - Bucket: configured via `MINIO_BUCKET` (default: `xuno`)
  - Module: `apps/backend/src/common/storage/storage.module.ts`

**Caching:**
- **Redis 7** - Cache, session store, task queue backend
  - Connection: `REDIS_URL` env var (default `redis://localhost:6379`)
  - Client: `ioredis` 5.x (backend), `redis[hiredis]` 5.x (ML Python)
  - Uses: API caching, session storage, BullMQ job queue, ML task worker queue
  - Password: `REDIS_PASSWORD`

## Authentication & Identity

**Auth Provider:**
- Custom JWT authentication
  - Implementation: `@nestjs/jwt` + `passport-jwt` + `passport-local`
  - Module: `apps/backend/src/modules/auth/`
  - Token storage: `react-native-encrypted-storage` on mobile
  - JWT: 512-bit secret, bcrypt 12-round password hashing
  - CSRF protection via `apps/backend/src/common/guards/csrf/`

## Monitoring & Observability

**Error Tracking:**
- **Sentry** - Error tracking and performance monitoring
  - Backend: `@sentry/node` + `@sentry/profiling-node`
  - Mobile: `@sentry/react-native` 6.x
  - Module: `apps/backend/src/common/sentry/`

**Metrics:**
- **Prometheus** - Metrics collection
  - Backend: `@willsoto/nestjs-prometheus` + `prom-client`
  - ML: `prometheus-client` Python package, mounted at `/metrics`
  - Configs: `infrastructure/prometheus/prometheus.yml`, alert rules in `infrastructure/prometheus/alerts/`

**Dashboards:**
- **Grafana** - Monitoring dashboards
  - Dashboard configs: `infrastructure/grafana/dashboards/` (5 dashboards: AI services, API performance, business metrics, infrastructure, overview)
  - Datasource provisioning: `infrastructure/grafana/provisioning/`

**Logs:**
- **Loki + Promtail** - Log aggregation
  - Configs: `infrastructure/loki/loki.yml`, `infrastructure/promtail/promtail.yml`
- **Pino** - Structured JSON logging in backend (`pino` + `pino-pretty`)

**Alerting:**
- **Alertmanager** - Alert routing
  - Config: `infrastructure/alertmanager/alertmanager.yml`

## CI/CD & Deployment

**Hosting:**
- Docker Compose for all environments (`docker-compose.dev.yml`, `docker-compose.staging.yml`, `docker-compose.production.yml`, `docker-compose.observability.yml`)

**CI Pipeline:**
- GitHub Actions (`.github/` directory present)

## Environment Configuration

**Required env vars (critical):**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection URL
- `JWT_SECRET` - JWT signing key (64+ chars in production)
- `ENCRYPTION_KEY` - AES-256-GCM key for PII field encryption
- `GLM_API_KEY` / `ZHIPU_API_KEY` - Zhipu AI API key
- `DOUBAO_SEEDREAM_API_KEY` - ByteDance Volcano Engine API key

**Required env vars (services):**
- `QDRANT_URL` - Qdrant vector DB URL
- `NEO4J_URL` / `NEO4J_USER` / `NEO4J_PASSWORD` - Neo4j graph DB
- `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` / `MINIO_BUCKET` - MinIO storage
- `ML_SERVICE_URL` - ML Python service URL (default `http://localhost:8001`)
- `SASREC_SERVICE_URL` - SASRec recommendation service URL (default `http://localhost:8100`)
- `AI_SERVICE_URL` - AI inference service URL

**Optional env vars:**
- `SASREC_ENABLED` - Enable/disable SASRec service (`"true"/"false"`)
- `TAOBAO_APP_KEY` / `TAOBAO_APP_SECRET` - Taobao product search
- `JD_APP_KEY` / `JD_APP_SECRET` - JD product search
- `TRYON_CACHE_ENABLED` / `TRYON_CACHE_TTL` - Try-on result caching
- `QDRANT_ENABLE_FALLBACK` - Memory fallback for Qdrant (`"true"/"false"`)
- `CORS_ORIGINS` - Comma-separated allowed origins

**Secrets location:**
- `.env` / `.env.local` files (NOT committed to git)
- `.env.example` and `.env.security.example` document required variables

## Algorithm Module Integration Points

**Backend-to-ML Service Communication:**
- Backend calls ML service at `ML_SERVICE_URL` (port 8001) via `axios`/`fetch`
- ML service routes registered in `ml/api/main.py` with graceful fallback
- Each algorithm module has its own route file: `ml/api/routes/virtual_tryon.py`, `ml/api/routes/body_analysis.py`, `ml/api/routes/style_analysis.py`, etc.

**SASRec Service (separate deployment):**
- Standalone FastAPI service on port 8100
- Backend client: `apps/backend/src/modules/recommendations/services/sasrec-client.service.ts`
- Endpoints: `/predict`, `/train`, `/warmup`, `/health`

**Backend Internal Algorithm Services:**
- Compatibility Scoring: `apps/backend/src/modules/recommendations/services/gnn-compatibility.service.ts` (calls AI service for embeddings)
- Cold Start: `apps/backend/src/modules/recommendations/services/cold-start.service.ts` (rule-based, no external calls)
- Size Recommendation: `apps/backend/src/modules/size-recommendation/size-recommendation.service.ts` (Prisma-only, no ML calls)
- Color Matching: `apps/backend/src/modules/recommendations/services/color-matching.service.ts` (CIEDE2000 in TypeScript)
- Search (Hybrid): `apps/backend/src/modules/search/search.service.ts` (PostgreSQL text + Qdrant vector + RRF fusion)

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected (all integration is synchronous/async request-response)

---

*Integration audit: 2026-04-14*

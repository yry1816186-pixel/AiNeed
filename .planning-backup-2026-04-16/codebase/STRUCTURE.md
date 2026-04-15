# Codebase Structure

**Analysis Date:** 2026-04-14

## Directory Layout

```
AiNeed/
├── apps/                    # Application packages
│   ├── backend/             # NestJS 11.x API server (port 3001)
│   ├── mobile/              # React Native 0.76.8 mobile app (port 8081 Metro)
│   └── admin/               # Vite + React + Ant Design admin panel (port 5173)
├── ml/                      # Python ML/AI service layer (port 8001)
│   ├── api/                 # FastAPI routes, middleware, schemas, tests
│   ├── config/              # ML configuration
│   ├── scripts/             # ML utility scripts
│   └── services/            # Algorithm modules and AI services
├── packages/                # Shared packages
│   ├── types/               # Shared TypeScript types (tsup-bundled)
│   └── shared/              # Shared types + validation (tsc-compiled)
├── infrastructure/          # Observability configs
│   ├── alertmanager/        # Alertmanager config
│   ├── grafana/             # Grafana dashboards + provisioning
│   ├── loki/                # Loki log aggregation config
│   ├── prometheus/          # Prometheus config + alert rules
│   └── promtail/            # Promtail log shipping config
├── scripts/                 # Dev/utility scripts
│   ├── audit/               # File review matrix generator
│   ├── backup/              # DB backup/restore scripts
│   ├── fix-prisma-client-link.mjs  # Prisma post-generate fix
│   ├── setup-dev.sh         # Dev environment setup
│   ├── start-services.bat   # Windows service launcher
│   ├── start-task-worker.*  # ML task worker launcher
│   └── security-check.sh    # Security audit script
├── tests/                   # Root-level test files
├── docker-compose.yml       # Base Docker Compose
├── docker-compose.dev.yml   # Dev infrastructure (Postgres, Redis, MinIO, Neo4j, Qdrant)
├── docker-compose.staging.yml  # Staging environment
├── docker-compose.production.yml  # Production environment
├── docker-compose.observability.yml  # Monitoring stack
├── package.json             # Root workspace config
├── pnpm-workspace.yaml      # Workspace member definitions
├── pnpm-lock.yaml           # Lockfile
├── .nvmrc                   # Node.js version (20.11.0)
├── .prettierrc              # Shared formatting config
├── CLAUDE.md                # Project instructions for AI assistants
└── README.md                # Project overview
```

## Directory Purposes

**`apps/backend/src/modules/`**: NestJS feature modules (45 modules)
- Each module is self-contained with controller, service, DTOs
- 35+ business modules covering auth, AI stylist, try-on, recommendations, search, e-commerce, community, consultants, etc.
- Key modules for algorithm integration:
  - `try-on/` - Virtual try-on with provider orchestrator pattern
  - `recommendations/` - Recommendation engine with orchestrator facade
  - `search/` - Hybrid search (text + vector + RRF)
  - `size-recommendation/` - Size fitting advisor
  - `ai-stylist/` - AI chat stylist with LLM provider
  - `ai/` - General AI service integration

**`apps/backend/src/common/`**: Cross-cutting infrastructure
- `cache/`, `circuit-breaker/`, `config/`, `decorators/`, `dto/`, `email/`, `encryption/`, `exceptions/`, `filters/`, `gateway/`, `guards/`, `interceptors/`, `logger/`, `logging/`, `middleware/`, `pipes/`, `prisma/`, `redis/`, `security/`, `sentry/`, `services/`, `soft-delete/`, `storage/`, `types/`, `utils/`

**`apps/mobile/src/`**: React Native mobile app
- `screens/` - Page-level components (home, onboarding, photo, profile, recommendations, style-quiz, consultant)
- `stores/` - 23 Zustand state stores
- `services/` - API client layer, auth, WebSocket, push notifications, speech
- `services/api/` - 20+ API service modules matching backend endpoints
- `services/ai/` - Client-side AI features (background removal, clothing categorization, virtual try-on)
- `components/` - Reusable UI components
- `hooks/` - Custom React hooks
- `navigation/` - React Navigation config
- `theme/` - Theme definitions
- `i18n/` - Internationalization
- `config/` - App configuration

**`apps/admin/src/`**: Admin web panel
- `pages/` - Dashboard, UserManage, MerchantManage, CommunityManage, StyleQuiz, FeatureFlags, Login
- `services/` - API client layer
- `stores/` - Zustand stores
- `layouts/` - Layout components
- `router/` - React Router config
- `lib/` - Utilities
- `types/` - TypeScript types

**`ml/services/`**: Python algorithm modules (7 core algorithm modules + supporting services)

**`ml/api/`**: FastAPI application layer
- `routes/` - HTTP endpoint handlers per domain (virtual_tryon, body_analysis, style_analysis, fashion_recommend, stylist_chat, photo_quality, health, tasks)
- `middleware/` - Auth, error handling, request logging
- `schemas/` - Pydantic request/response models
- `tests/` - API test files per route
- `config.py` - Pydantic Settings for ML service configuration

**`ml/config/`**: ML configuration files

## Key File Locations

**Entry Points:**
- `apps/backend/src/main.ts`: NestJS bootstrap (port 3001)
- `ml/api/main.py`: FastAPI ML API bootstrap (port 8001)
- `ml/services/ai_service.py`: Legacy AI inference service (port 8001, standalone)
- `apps/mobile/App.tsx`: React Native mobile app entry

**Configuration:**
- `apps/backend/prisma/schema.prisma`: Database schema (100+ models)
- `ml/api/config.py`: ML service Pydantic Settings
- `apps/backend/src/common/config/env.validation.ts`: Environment variable validation
- `.nvmrc`: Node.js version pinning
- `pnpm-workspace.yaml`: Monorepo workspace definition
- `docker-compose.dev.yml`: Dev infrastructure (5 services: Postgres, Redis, MinIO, Neo4j, Qdrant)

**Core Logic (Algorithm Modules):**
- `ml/services/virtual_tryon_service.py`: Virtual Try-On with Doubao/GLM provider chain + preprocessing/postprocessing pipeline
- `ml/services/color_season_analyzer.py`: 12-season color analysis (CIELAB + ITA + MediaPipe Face Mesh)
- `ml/services/sasrec_service.py`: Self-Attentive Sequential Recommendation (SASRec) model
- `ml/services/intelligent_style_recommender.py`: FashionCLIP + PCMF + vector index recommendation pipeline
- `ml/services/body_analyzer.py`: Body type classification via MediaPipe Pose (33 keypoints)
- `ml/services/intelligent_stylist_service.py`: GLM-5 driven AI stylist with RAG, caching, rate limiting
- `ml/services/fashion_knowledge_rag.py`: RAG pipeline (BM25 + Qdrant vector + BGE reranker + RRF fusion)
- `ml/services/photo_quality_analyzer.py`: Photo quality assessment (sharpness, brightness, composition)
- `ml/services/algorithm_gateway.py`: Unified algorithm API gateway (registry, rate limiting, caching, load balancing)
- `ml/services/degradation_service.py`: Service degradation with circuit breaker
- `ml/services/metrics_service.py`: Prometheus metrics (LLM, vector search, model inference)

**Backend Algorithm Integration:**
- `apps/backend/src/modules/recommendations/orchestrator/recommendation.orchestrator.ts`: Recommendation facade coordinating 10+ algorithms
- `apps/backend/src/modules/recommendations/services/sasrec-client.service.ts`: HTTP client for SASRec Python service
- `apps/backend/src/modules/recommendations/services/cold-start.service.ts`: Cold start recommendation (demographic + popularity)
- `apps/backend/src/modules/recommendations/services/gnn-compatibility.service.ts`: GNN + hypergraph compatibility scoring
- `apps/backend/src/modules/recommendations/services/multimodal-fusion.service.ts`: Visual + textual + attribute fusion scoring
- `apps/backend/src/modules/recommendations/services/color-matching.service.ts`: CIEDE2000 color harmony in TypeScript
- `apps/backend/src/modules/recommendations/services/qdrant.service.ts`: Vector similarity search client
- `apps/backend/src/modules/recommendations/services/ciede2000.ts`: CIEDE2000 implementation in TypeScript
- `apps/backend/src/modules/try-on/services/tryon-orchestrator.service.ts`: Try-on provider chain orchestrator
- `apps/backend/src/modules/try-on/services/doubao-seedream.provider.ts`: Doubao Seedream provider
- `apps/backend/src/modules/try-on/services/glm-tryon.provider.ts`: GLM try-on provider
- `apps/backend/src/modules/try-on/services/local-preview.provider.ts`: Local preview fallback provider
- `apps/backend/src/modules/search/search.service.ts`: Hybrid search (PostgreSQL + Qdrant + RRF)
- `apps/backend/src/modules/size-recommendation/size-recommendation.service.ts`: Size fitting based on body measurements

**Try-On Pipeline (ML):**
- `ml/services/tryon_preprocessor.py`: Body segmentation, geometric alignment, lighting extraction, garment feature detection
- `ml/services/tryon_prompt_engine.py`: Dynamic prompt generation from preprocessing features
- `ml/services/tryon_postprocessor.py`: Quality validation (proportion, CIEDE2000, SSIM face preservation)

**Shared Types:**
- `packages/types/src/index.ts`: Shared TypeScript type exports
- `packages/shared/src/types/`: API types, auth types, enums, notification, photo, profile, quiz, user types
- `packages/shared/src/utils/validation.ts`: Shared validation utilities

**Testing:**
- `apps/backend/src/modules/try-on/try-on.service.spec.ts`: Try-on service tests
- `apps/backend/src/modules/recommendations/recommendations.service.spec.ts`: Recommendations tests
- `apps/backend/src/modules/recommendations/recommendations.controller.spec.ts`: Recommendations controller tests
- `apps/backend/src/modules/search/search.service.spec.ts`: Search service tests
- `apps/mobile/src/stores/__tests__/authStore.test.ts`: Mobile auth store test
- `apps/mobile/src/services/__tests__/api.test.ts`: Mobile API service test
- `ml/api/tests/`: 8 test files for ML API routes (conftest, auth, body_analysis, health, photo_quality, recommend, style_analysis, stylist, tasks)

**Infrastructure:**
- `infrastructure/prometheus/prometheus.yml`: Prometheus scrape config
- `infrastructure/prometheus/alerts/`: Alert rules (ai.yml, backend.yml, business.yml, database.yml)
- `infrastructure/grafana/dashboards/`: 5 Grafana dashboards
- `infrastructure/grafana/provisioning/`: Datasource and dashboard provisioning
- `infrastructure/loki/loki.yml`: Loki config
- `infrastructure/promtail/promtail.yml`: Promtail config
- `infrastructure/alertmanager/alertmanager.yml`: Alert routing

## Naming Conventions

**Files:**
- TypeScript: `kebab-case.ts` (e.g., `try-on.service.ts`, `cold-start.service.ts`, `recommendation.orchestrator.ts`)
- Python: `snake_case.py` (e.g., `virtual_tryon_service.py`, `color_season_analyzer.py`, `fashion_knowledge_rag.py`)
- Test files: `*.spec.ts` (backend), `*.test.ts` (mobile), `test_*.py` (ML)
- Directories: `kebab-case` (e.g., `try-on/`, `size-recommendation/`, `code-rag/`)

**NestJS module structure:**
- Each module directory contains: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/` folder
- Sub-services in `services/` subdirectory within module
- Tests co-located as `*.spec.ts`

**Python ML structure:**
- Service files are standalone modules with a class + module-level singleton
- API routes in `ml/api/routes/` with matching schema in `ml/api/schemas/`

## Where to Add New Code

**New Backend Feature:**
- Create module directory: `apps/backend/src/modules/<feature-name>/`
- Generate NestJS module: `nest g module modules/<feature-name>`
- Register in `apps/backend/src/app.module.ts`
- Shared types: `packages/shared/src/types/`

**New Algorithm Module (Python):**
- Service implementation: `ml/services/<algorithm_name>.py`
- API route: `ml/api/routes/<route_name>.py`
- Pydantic schemas: `ml/api/schemas/<schema_name>.py`
- Register route in `ml/api/main.py` with try/except graceful loading
- Tests: `ml/api/tests/test_<route_name>.py`

**New Recommendation Algorithm:**
- Algorithm service: `apps/backend/src/modules/recommendations/services/<algorithm>.service.ts`
- Register in `RecommendationOrchestrator` constructor and `getUnifiedRecommendations()`
- Add to `RecommendationAlgorithm` type union in orchestrator file

**New Mobile Screen:**
- Screen component: `apps/mobile/src/screens/<screen-name>/`
- API service: `apps/mobile/src/services/api/<feature>.api.ts`
- Zustand store: `apps/mobile/src/stores/<feature>Store.ts`
- Navigation entry: `apps/mobile/src/navigation/`

**New Admin Page:**
- Page component: `apps/admin/src/pages/<PageName>/index.tsx`
- Router entry: `apps/admin/src/router/`

**Utilities:**
- Backend shared utils: `apps/backend/src/common/utils/`
- Mobile shared utils: `apps/mobile/src/utils/`
- ML shared utilities: `ml/services/` (imported as sibling modules)

## Special Directories

**`apps/backend/prisma/`:**
- Purpose: Database schema, migrations, seed data
- Generated: Prisma client generated via `pnpm db:generate`
- Committed: Yes (schema and migrations)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (pnpm install)
- Committed: No

**`.pnpm-store/`:**
- Purpose: pnpm content-addressable store
- Generated: Yes
- Committed: No

**`infrastructure/`:**
- Purpose: Monitoring and observability configuration files
- Generated: No
- Committed: Yes (Grafana dashboards, Prometheus configs, alert rules)

---

*Structure analysis: 2026-04-14*

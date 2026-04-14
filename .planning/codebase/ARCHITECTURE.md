# Architecture

**Analysis Date:** 2026-04-14

## Pattern Overview

**Overall:** Modular monorepo with polyglot microservices

**Key Characteristics:**
- pnpm workspace monorepo with three apps (backend, mobile, admin) and two shared packages
- NestJS modular backend (45+ feature modules) with clear separation of concerns
- Python ML service layer with FastAPI, algorithm gateway, and degradation strategies
- Provider pattern with fallback chains for external API calls (Virtual Try-On: Doubao -> GLM -> Local Preview)
- Orchestrator/Facade pattern for recommendation algorithms

## Layers

**Presentation Layer (Mobile):**
- Purpose: React Native cross-platform UI
- Location: `apps/mobile/`
- Contains: Screens, components, navigation, Zustand stores, API service layer
- Depends on: Backend API via `axios`, WebSocket via `socket.io-client`
- Used by: End users (mobile app)

**Presentation Layer (Admin):**
- Purpose: Web-based admin dashboard
- Location: `apps/admin/`
- Contains: Pages (Dashboard, UserManage, MerchantManage, CommunityManage, StyleQuiz, FeatureFlags), layouts, services
- Depends on: Backend API via `axios`, Ant Design component library
- Used by: Platform administrators

**API Layer (Backend):**
- Purpose: REST API + WebSocket server, business logic orchestration
- Location: `apps/backend/src/`
- Contains: NestJS modules, controllers, services, DTOs, guards, interceptors, middleware
- Depends on: PostgreSQL (Prisma), Redis (ioredis), MinIO, Neo4j, Qdrant, ML service, Sentry
- Used by: Mobile app, Admin panel

**ML/AI Layer (Python):**
- Purpose: Algorithm modules, LLM integration, image analysis, vector embeddings
- Location: `ml/`
- Contains: FastAPI routes, algorithm services, inference pipeline, RAG system, task workers
- Depends on: GLM API, Doubao Seedream API, Qdrant, Redis (task queue), Hugging Face models
- Used by: Backend API layer

**Shared Packages:**
- Purpose: Type definitions and validation shared across apps
- Location: `packages/types/` (tsup-bundled), `packages/shared/` (TypeScript compiled)
- Contains: TypeScript interfaces, enums, Zod schemas, utility types
- Used by: Backend, Mobile, Admin

## Data Flow

**AI Stylist Chat Flow:**

1. User sends message via mobile app (`apps/mobile/src/services/api/ai-stylist.api.ts`)
2. Backend controller receives request (`apps/backend/src/modules/ai-stylist/ai-stylist.controller.ts`)
3. AI Stylist service orchestrates: LLM provider (`llm-provider.service.ts`) calls GLM API
4. Context service enriches with user profile, weather, wardrobe data
5. Decision engine (`decision-engine.service.ts`) determines response type (text, outfit plan, item replacement)
6. Agent tools service (`agent-tools.service.ts`) can trigger side effects (search, recommendations)
7. Response streamed back to mobile via REST (or WebSocket for real-time updates)

**Virtual Try-On Flow:**

1. User uploads person + garment photos via mobile (`apps/mobile/src/services/api/tryon.api.ts`)
2. Backend TryOn orchestrator (`apps/backend/src/modules/try-on/services/tryon-orchestrator.service.ts`) checks Redis cache
3. Provider chain executed in priority order: Doubao Seedream -> GLM TryOn -> Local Preview
4. ML service preprocessing pipeline (`ml/services/tryon_preprocessor.py`): body segmentation, pose alignment, lighting extraction, garment feature detection
5. Prompt engine (`ml/services/tryon_prompt_engine.py`) generates feature-driven prompts
6. API call to Doubao Seedream (primary) or GLM (fallback)
7. Postprocessor (`ml/services/tryon_postprocessor.py`) validates quality: proportion check, CIEDE2000 color verification, SSIM face preservation
8. Result cached in Redis, URL returned to client

**Recommendation Flow:**

1. Request enters via `RecommendationOrchestrator` (Facade pattern, `apps/backend/src/modules/recommendations/orchestrator/recommendation.orchestrator.ts`)
2. Multiple algorithms scored in parallel:
   - Content-based: `AdvancedRecommendationService` with FashionCLIP embeddings
   - Collaborative filtering: `CollaborativeFilteringService` (user behavior)
   - Knowledge graph: `KnowledgeGraphService` via Neo4j
   - Theory-based: `MatchingTheoryService` (color harmony, occasion matching)
   - Sequential: `SASRecService` via Python microservice (optional, controlled by `SASREC_ENABLED`)
   - GNN Compatibility: `GNNCompatibilityService` (hypergraph + cross-attention)
   - Multimodal Fusion: `MultimodalFusionService` (visual + textual + attribute scores)
3. Cold start handling: `ColdStartService` uses demographic rules + popularity when no user history
4. Results combined with configurable weights (default: 0.25 each for content/collaborative/knowledge/theory)
5. Cached via `RecommendationCacheService` in Redis
6. Explainer service generates human-readable reasons

**Color Season Analysis Flow:**

1. User uploads selfie via mobile
2. ML service `analyze_color_season()` in `ml/services/color_season_analyzer.py`
3. MediaPipe Face Mesh extracts 468 facial landmarks
4. Skin pixels sampled from 5 regions (forehead, cheeks, nose bridge, chin) via convex hull
5. RGB -> CIELAB conversion, compute ITA (Individual Typology Angle)
6. 3-axis classification: hue (warm/cool via a*), value (light/deep via L*), chroma (clear/muted via C*)
7. Mapped to 12-season system with CIEDE2000 palette harmony verification
8. Result includes suitable/unsuitable color swatches with reasons

**Hybrid Search Flow:**

1. Search query enters `SearchService.hybridSearch()` in `apps/backend/src/modules/search/search.service.ts`
2. Parallel execution:
   - Text search: PostgreSQL full-text via Prisma (`buildSearchWhereClause`)
   - Vector search: Qdrant similarity (`qdrantService.search()`)
3. Reciprocal Rank Fusion (RRF, k=60) merges both rankings
4. Popularity signals boost final scores
5. Paginated results returned with category/price filters

**State Management:**
- Mobile: Zustand stores (23 stores in `apps/mobile/src/stores/`) + TanStack Query for server state
- Backend: Redis cache + PostgreSQL persistent state
- ML: In-memory model weights + Redis task queue for async jobs

## Key Abstractions

**Algorithm Gateway:**
- Purpose: Unified API interface for algorithm routing, versioning, caching, rate limiting, load balancing
- Examples: `ml/services/algorithm_gateway.py`
- Pattern: Registry + Gateway with pluggable handlers, A/B testing support via version parameter

**Provider Chain (Virtual Try-On):**
- Purpose: Graceful degradation across image generation providers
- Examples: `apps/backend/src/modules/try-on/services/tryon-orchestrator.service.ts`, `ml/services/virtual_tryon_service.py`
- Pattern: Chain of responsibility with priority ordering, per-provider availability checks, Redis caching

**Recommendation Orchestrator:**
- Purpose: Single entry point coordinating 10+ recommendation algorithms
- Examples: `apps/backend/src/modules/recommendations/orchestrator/recommendation.orchestrator.ts`
- Pattern: Facade + Strategy, with configurable algorithm weights and A/B testing support (`RecommendationAlgorithm` type)

**Degradation Service:**
- Purpose: Automatic fallback when network or services are unstable
- Examples: `ml/services/degradation_service.py`
- Pattern: Circuit breaker with service levels (FULL/DEGRADED/MINIMAL/OFFLINE), configurable triggers and recovery strategies

**Task Worker:**
- Purpose: Async processing for expensive ML operations
- Examples: `ml/services/task_worker.py`
- Pattern: Redis-backed queue consumer with progress reporting, configurable per-queue workers

## Entry Points

**Backend API:**
- Location: `apps/backend/src/main.ts`
- Triggers: HTTP requests on port 3001
- Responsibilities: Bootstrap NestJS app, apply global middleware (Helmet, CORS, compression, metrics, error handler), configure Swagger, register global pipes/filters/interceptors

**ML API (FastAPI):**
- Location: `ml/api/main.py`
- Triggers: HTTP requests on port 8001
- Responsibilities: Bootstrap FastAPI with lifespan, mount Prometheus metrics, register all algorithm routes with graceful fallback loading

**AI Inference Service:**
- Location: `ml/services/ai_service.py`
- Triggers: Direct import or HTTP via FastAPI routes
- Responsibilities: Legacy FastAPI app (v2.0.0) with style analysis, recommendations, image analysis, body analysis, similar item search, embedding endpoints

**Mobile App:**
- Location: `apps/mobile/App.tsx`
- Triggers: User launches app
- Responsibilities: 6-tab navigation (Home/Explore/Heart/Cart/Wardrobe/Profile)

**Admin Panel:**
- Location: `apps/admin/src/pages/`
- Triggers: Admin navigates to dashboard
- Responsibilities: User management, community moderation, merchant management, style quiz editing, feature flags

## Error Handling

**Strategy:** Multi-layer with graceful degradation

**Patterns:**
- Backend: Global `AllExceptionsFilter` catches all exceptions, returns consistent JSON error envelope
- Backend: `XssSanitizationPipe` + `ValidationPipe` with `whitelist` and `forbidNonWhitelisted` for input validation
- ML: Custom exception hierarchy (`MLError` -> `ModelNotLoadedError`, `InferenceError`, `RateLimitError`, `ValidationError`) with dedicated handlers
- ML: Route loading wrapped in try/except with warning logs (service continues with partial functionality)
- ML: Provider chain in TryOn orchestrator: each provider failure logged, next provider attempted
- ML: Degradation service monitors network latency, error rates, timeouts; automatically downgrades service level
- Backend: Circuit breaker via `opossum` for external API calls
- Backend: `CacheService` serves stale data when upstream services are unavailable

## Cross-Cutting Concerns

**Logging:** Pino structured JSON logging in backend (`apps/backend/src/common/logging/`), Python stdlib logging in ML
**Validation:** class-validator + Zod in backend, Pydantic v2 in ML
**Authentication:** JWT + Passport with per-user encryption keys (AES-256-GCM for PII fields)
**Authorization:** Role-based (`UserRole` enum), route guards in `apps/backend/src/common/guards/`
**Metrics:** Prometheus counters/histograms/gauges in both backend and ML, exposed at `/metrics`
**Security:** Helmet headers, CORS whitelist, CSRF protection, XSS sanitization pipe, rate limiting (ThrottlerModule 100 req/min)
**Encryption:** Per-user data encryption keys, AES-256-GCM for PII fields (`apps/backend/src/common/encryption/`)
**Soft Delete:** Global `SoftDeleteMiddleware` for GDPR/PIPL compliance
**Caching:** Multi-level: in-memory (LRU) in ML services, Redis in backend, TanStack Query on mobile

---

*Architecture analysis: 2026-04-14*

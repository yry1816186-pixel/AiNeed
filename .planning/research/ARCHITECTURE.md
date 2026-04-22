# Architecture Research

**Domain:** AI Fashion Recommendation Pipeline (Hybrid On-Device + Cloud)
**Researched:** 2026-04-22
**Confidence:** HIGH (based on existing codebase analysis + industry patterns)

## Recommended Architecture

### System Overview

```
+------------------------------------------------------------------+
|                    MOBILE CLIENT (React Native)                    |
|  +----------------+  +----------------+  +-----------------------+|
|  | Scene Card     |  | Stylist Chat   |  | On-Device Layer       ||
|  | (Today Tab)    |  | (Stylist Tab)  |  | - MediaPipe Pose      ||
|  |                |  |                |  | - CIELAB Color        ||
|  +-------+--------+  +-------+--------+  | - Rule Engine Lite    ||
|          |                    |           | - Image Quality Check  ||
|          v                    v           +-----------+-----------+|
|  +----------------------------------+                |            |
|  |   Recommendation SDK (shared)    | <--------------+            |
|  |   - Response transformer         |                             |
|  |   - Cache layer                  |                             |
|  |   - Degradation handler          |                             |
|  +---------------+------------------+                             |
+------------------+------------------------------------------------+
                   |
                   | HTTPS/REST
                   v
+------------------------------------------------------------------+
|              NESTJS BACKEND (API Gateway + Orchestrator)            |
|                                                                    |
|  +--------------------------------------------------------------+ |
|  |              RecommendationOrchestrator                       | |
|  |              (UNIFIED ENTRY POINT)                            | |
|  |                                                              | |
|  |  L1 Compliance Filter  --> hard exclude                      | |
|  |  L2 Context Filter     --> hard exclude                      | |
|  |  L3 Fit Filter         --> hard exclude                      | |
|  |  L4 Budget Filter      --> hard exclude                      | |
|  |  L5 Style Scorer       --> weighted score                    | |
|  |     + SASRec signal (0.25)                                    | |
|  |     + FashionCLIP vector (0.30)                               | |
|  |     + Rule engine (0.30)                                      | |
|  |     + Popularity (0.15)                                       | |
|  |  L6 Wardrobe Complement --> soft boost                        | |
|  +--------------------------------------------------------------+ |
|         |              |              |              |              |
|  +------+------+  +----+-----+  +----+-----+  +----+------+       |
|  | Rule Engine  |  | Qdrant   |  | SASRec   |  | LLM Expl. |      |
|  | Service      |  | Service  |  | Client   |  | Service   |      |
|  | (JSON rules) |  | (vector) |  | Service  |  | (GLM API) |      |
|  +------+------+  +----+-----+  +----+-----+  +-----------+       |
|         |              |              |                              |
+---------+--------------+--------------+------------------------------+
          |              |              |
          |     +--------+--------+     |
          |     |                 |     |
          v     v                 v     v
+------------------+   +------------------+   +------------------+
|   PostgreSQL     |   |     Qdrant       |   |  Python FastAPI  |
|   + Prisma ORM   |   |   Vector DB      |   |  ML Service      |
|   - Users        |   |                  |   |                  |
|   - ClothingItems|   |  Collections:    |   |  - FashionCLIP   |
|   - Behaviors    |   |  * clothing_items|   |    embedding     |
|   - Profiles     |   |  * style_seeds   |   |  - SASRec model  |
|   - Batches      |   |  * outfit_compat |   |  - FullOutfit    |
|   - Impressions  |   |                  |   |    Engine        |
+------------------+   +------------------+   |  - Color Season  |
                                                |    Analyzer     |
+------------------+                            |  - Body Analyzer|
|   Redis          |                            |  - RAG Pipeline |
|   - Cache        |                            +------------------+
|   - Sessions     |
|   - Rate Limit   |   +------------------+
+------------------+   |  External APIs   |
                       |  - GLM/Doubao LLM|
                       |  - TryOn API     |
                       |  - Weather API   |
                       |  - Taobao/JD     |
                       +------------------+
```

### Component Responsibilities

| Component                                            | Responsibility                                                                                                                | Current State                                                                   |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **RecommendationOrchestrator**                       | Single entry point for all recommendation requests. Implements the 6-layer funnel.                                            | EXISTS - needs refactoring to 6-layer funnel from current flat weighted scoring |
| **Rule Engine (MatchingTheoryService + JSON rules)** | Applies 264+ structured fashion rules: body type, color, fabric, occasion compatibility. Primary driver for cold-start users. | EXISTS - needs JSON dynamic loading instead of hardcoded rules                  |
| **QdrantService**                                    | Vector similarity search over FashionCLIP embeddings. Handles clothing_items, style_seeds, and outfit_compat collections.     | EXISTS - has memory fallback, needs FashionCLIP embedding pipeline              |
| **SASRecClientService**                              | HTTP client to Python SASRec microservice for sequential recommendation signals.                                              | EXISTS - functional, needs behavioral data pipeline                             |
| **RecommendationExplainerService**                   | Generates natural language explanations for recommendations via LLM.                                                          | EXISTS - uses own GLM client (no circular dep)                                  |
| **ColdStartService**                                 | Handles users with <10 behavior records. Currently uses demographic (gender) buckets.                                         | EXISTS - needs refactoring to bodyType+styleExpression+primaryScenarios         |
| **BehaviorTrackingService**                          | Records and aggregates user interactions (view, like, purchase) for preference learning.                                      | EXISTS                                                                          |
| **PreferenceLearningService**                        | Learns category/brand/style preferences from user behavior. Boosts scores for preferred attributes.                           | EXISTS                                                                          |
| **OutfitCompletionService**                          | Builds complete outfit recommendations from a base item. Matches complementary categories.                                    | EXISTS                                                                          |
| **FashionCLIP Embedding Pipeline**                   | Generates 512-dim embeddings from product images and text descriptions. Stores in Qdrant.                                     | NEEDS BUILDING - critical gap                                                   |
| **Six-Layer Funnel Pipeline**                        | Sequential hard-filter + soft-score architecture replacing current flat weighted sum.                                         | NEEDS BUILDING - architectural core                                             |
| **Product Data Sync**                                | Scheduled tasks to sync products from Taobao Ke and JD Alliance APIs.                                                         | NEEDS BUILDING                                                                  |

## Recommended Project Structure

### Backend (apps/backend) - Modified Domain Structure

```
src/
+-- domains/
    +-- platform/
        +-- recommendations/
            +-- orchestrator/
            |   +-- recommendation.orchestrator.ts      # REFACTOR: 6-layer funnel
            |   +-- funnel/                              # NEW: funnel stages
            |       +-- l1-compliance.filter.ts          # NEW: ageBand + safetyLevel
            |       +-- l2-context.filter.ts             # NEW: occasion/season/weather
            |       +-- l3-fit.filter.ts                 # NEW: sizeCurve + bodyType
            |       +-- l4-budget.filter.ts              # NEW: price band exclusion
            |       +-- l5-style.scorer.ts               # NEW: weighted multi-signal
            |       +-- l6-wardrobe.complement.ts        # NEW: soft boost from wardrobe
            |       +-- funnel.types.ts                  # NEW: shared funnel interfaces
            +-- services/
            |   +-- matching-theory.service.ts           # KEEP: rule engine core
            |   +-- qdrant.service.ts                    # KEEP: vector search
            |   +-- sasrec-client.service.ts             # KEEP: SASRec HTTP client
            |   +-- vector-similarity.service.ts         # KEEP: FashionCLIP search
            |   +-- cold-start.service.ts                # REFACTOR: remove gender
            |   +-- recommendation-explainer.service.ts  # KEEP: LLM explanation
            |   +-- behavior-tracking.service.ts         # KEEP: behavior recording
            |   +-- preference-learning.service.ts       # KEEP: preference boosting
            |   +-- outfit-completion.service.ts         # KEEP: outfit assembly
            |   +-- recommendation-cache.service.ts      # KEEP: Redis caching
            |   +-- fashion-clip.service.ts              # NEW: embedding generation
            |   +-- product-sync.service.ts              # NEW: Taobao/JD sync
            |   +-- profile-aggregator.service.ts        # NEW: 6-layer profile builder
            +-- dto/
            +-- submodules/
            +-- types/
```

### ML Service (ml/) - Modified Capability Structure

```
ml/
+-- services/
    +-- recommender/
    |   +-- sasrec_service.py            # KEEP: runs as separate FastAPI
    |   +-- fashion_clip_embedder.py     # NEW: embedding generation service
    |   +-- fashion_knowledge_rag.py     # KEEP: RAG pipeline for rules
    +-- stylist/
    |   +-- full_outfit_engine.py        # REFACTOR: load from JSON files
    |   +-- intelligent_stylist_service.py
    |   +-- style_understanding_service.py
    +-- analysis/
    |   +-- body_analyzer.py
    |   +-- color_season_analyzer.py
    |   +-- photo_quality_analyzer.py
    +-- tryon/
    |   +-- virtual_tryon_service.py
    |   +-- tryon_preprocessor.py
    +-- rag/
        +-- embeddings.py               # KEEP: uses patrickjohncyh/fashion-clip
        +-- qdrant_client.py
        +-- hybrid_retriever.py
+-- api/
    +-- routes/
        +-- fashion_recommend.py         # REFACTOR: new embedding endpoints
        +-- stylist.py
        +-- analysis.py
        +-- virtual_tryon.py
```

### Structure Rationale

- **Funnel stages as separate files:** Each layer (L1-L6) has distinct filtering logic and test boundaries. Separate files enable independent testing and parallel development.
- **fashion-clip.service.ts on backend:** The NestJS service handles embedding pre-computation orchestration and cache management. Actual embedding generation calls go to the Python FastAPI service.
- **SASRec stays as separate FastAPI process:** Model training and inference have different scaling needs. SASRec on port 8100, main ML on port 8000.
- **Profile aggregator as new service:** The 6-layer user profile (L1-L6) needs a single builder that assembles from User, UserProfile, UserClothing, and UserBehavior tables.

## Architectural Patterns

### Pattern 1: Six-Layer Funnel Pipeline (Core)

**What:** Sequential hard-filter + soft-score pipeline where each layer either eliminates candidates or contributes to a weighted score. Early layers use cheap operations (DB queries, simple comparisons); later layers use expensive operations (vector search, LLM).

**When to use:** Every recommendation request, whether cold-start or warm user.

**Trade-offs:** Sequential layers add latency (~50-80ms per layer) but dramatically reduce candidate set for expensive operations. L5 vector search over 50 candidates is 20x cheaper than over 10,000.

```typescript
// Funnel execution flow
interface FunnelContext {
  userId: string;
  profile: SixLayerProfile;       // Assembled from L1-L6 data
  candidates: FunnelCandidate[];  // Starts as all active ClothingItems
  context: RecommendationContext;  // weather, occasion, season
}

interface FunnelCandidate {
  itemId: string;
  eliminated: boolean;
  scores: Map<FunnelLayer, number>;
  reasons: string[];
}

// Orchestrator runs layers sequentially
async runFunnel(ctx: FunnelContext): Promise<RecommendationResult[]> {
  // Phase 1: Hard filters (cheap, eliminate 80-95%)
  ctx = await this.l1Compliance.filter(ctx);  // ageBand, safetyLevel
  ctx = await this.l2Context.filter(ctx);      // occasion, season, weather
  ctx = await this.l3Fit.filter(ctx);          // sizeCurve, bodyType conflict
  ctx = await this.l4Budget.filter(ctx);       // price > budget ceiling

  // Phase 2: Soft scoring (expensive, rank remaining)
  ctx = await this.l5StyleScorer.score(ctx);   // SASRec + FashionCLIP + Rules + Popularity
  ctx = await this.l6Wardrobe.boost(ctx);      // Complement existing wardrobe

  // Phase 3: Explanation (expensive, only for top results)
  const topResults = ctx.candidates
    .filter(c => !c.eliminated)
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, ctx.options.limit);

  return this.explainer.explain(topResults, ctx.profile);
}
```

### Pattern 2: Pre-Computed Embedding Pipeline (FashionCLIP + Qdrant)

**What:** Product embeddings are pre-computed at ingestion time and stored in Qdrant with rich payload metadata. Search uses Qdrant's native filtering to combine vector similarity with structured attribute filters.

**When to use:** Product sync (batch), new product ingestion (real-time), Onboarding style seed matching.

**Trade-offs:** Pre-computation costs O(N) at ingestion but makes search O(log N) at query time. Embeddings must be regenerated when the model is updated.

```typescript
// Embedding pipeline at product sync time
async syncProductEmbedding(item: ClothingItem): Promise<void> {
  // 1. Generate FashionCLIP embedding via Python service
  const embedding = await this.fashionClipService.embed({
    imageUrl: item.images[0],
    text: `${item.name} ${item.category} ${item.material}`,
  });

  // 2. Store in Qdrant with filterable payload
  await this.qdrantService.upsertClothingItem(item.id, embedding, {
    category: item.category,
    occasion: item.occasion,         // for L2 filter
    season: item.season,             // for L2 filter
    sizeCurve: item.sizeCurve,       // for L3 filter
    price: item.price,               // for L4 filter
    priceBand: item.priceBand,       // for L4 filter
    styleTags: item.styleTags,       // for L5 scoring
    ageBand: item.ageBand,           // for L1 filter
    isActive: true,
    brandId: item.brandId,
  });
}

// L5 Style Scorer uses filtered vector search
async scoreByFashionCLIP(
  seed: number[],          // from user's styleExpression or chosen images
  filters: QdrantFilter,   // pre-applied L1-L4 filters as payload filter
  topK: number
): Promise<ScoredCandidate[]> {
  const results = await this.qdrantService.searchSimilar(seed, {
    topK,
    filter: filters,        // Qdrant does vector search WITH filtering
    minScore: 0.6,
  });
  return results.map(r => ({ itemId: r.id, score: r.score * 0.30 }));
}
```

### Pattern 3: Graceful Degradation Cascade

**What:** Each component in the pipeline has a defined fallback. If a component fails, the system continues with reduced quality rather than failing completely.

**When to use:** Always active -- wrapped around every external call.

**Trade-offs:** Degraded responses are still served, which means quality metrics vary. Must track degradation rate as a production metric.

```
Degradation cascade for a recommendation request:

FashionCLIP unavailable?  --> Skip L5 vector score, upweight rule engine (0.30 -> 0.50)
SASRec unavailable?       --> Skip SASRec signal, redistribute weight
LLM unavailable?          --> Use template explanations ("Selected for your X style")
Qdrant unavailable?       --> Memory fallback (existing), then DB-only search
All AI unavailable?       --> Rule-only: weather + season + scenario templates
Product DB empty?         --> Static curated collection (100 mock items)
```

### Pattern 4: On-Device + Cloud Split

**What:** Privacy-sensitive and latency-critical computations run on-device. Heavy model inference runs on the RTX 4060 dev machine or cloud APIs.

**When to use:** Photo upload, real-time body analysis, color analysis, offline mode.

**Trade-offs:** On-device models are less accurate but faster and private. Must maintain model parity between on-device and cloud versions.

```
ON-DEVICE (React Native / native modules):
  - MediaPipe Pose detection     --> 14 body landmarks
  - CIELAB color analysis        --> skin tone extraction
  - Image quality check          --> blur/exposure detection
  - Rule engine lite             --> basic filtering (subset of 264 rules)

DEV MACHINE (RTX 4060 / FastAPI):
  - FashionCLIP embedding        --> 512-dim vectors
  - SASRec training/inference    --> sequential rec
  - Qdrant vector search         --> similarity retrieval
  - FullOutfitEngine             --> outfit generation
  - RAG pipeline                 --> knowledge retrieval

CLOUD API (pay-per-use):
  - GLM/Doubao LLM               --> explanations, stylist chat
  - Virtual try-on generation     --> image synthesis
```

## Data Flow

### Recommendation Request Flow (Primary Path)

```
[Mobile: Today Tab opened]
    |
    v
[Client sends: userId + weather + selectedOccasion + limit]
    |
    v
[NestJS: RecommendationOrchestrator.getRecommendations()]
    |
    +--> [ProfileAggregator: assemble 6-layer profile from DB]
    |       L1: User.ageBand, safetyLevel (from User table)
    |       L2: UserProfile.primaryScenarios, weather, city (from Profile table)
    |       L3: UserProfile.height, weight, bodyType, usualSize (from Profile)
    |       L4: UserProfile.budgetBand (from Profile)
    |       L5: UserProfile.styleExpression, colorPreferences, avoidances (from Profile)
    |       L6: UserClothing items + wardrobe gaps (from Clothing + Wardrobe tables)
    |
    +--> [Load candidates: all active ClothingItems (cached in Redis)]
    |
    v
[L1 Compliance Filter: eliminate items outside ageBand, safetyLevel mismatches]
    |   Input: ~10,000 items --> Output: ~8,000 items
    v
[L2 Context Filter: eliminate wrong occasion/season/weather]
    |   Input: ~8,000 items --> Output: ~2,000 items
    v
[L3 Fit Filter: eliminate incompatible sizeCurve and bodyType conflicts]
    |   Input: ~2,000 items --> Output: ~800 items
    v
[L4 Budget Filter: eliminate above user's budget ceiling]
    |   Input: ~800 items --> Output: ~400 items
    v
[L5 Style Scorer: weighted multi-signal scoring]
    |   - Rule Engine (0.30): bodyType compatibility, color harmony, fabric matching
    |   - FashionCLIP vector (0.30): Qdrant filtered search with style seed
    |   - SASRec signal (0.25): sequential behavior prediction
    |   - Popularity (0.15): view/purchase count normalization
    |   Input: ~400 items --> Output: ~50 items scored
    v
[L6 Wardrobe Complement: soft boost for items that pair with existing wardrobe]
    |   Input: ~50 scored items --> Output: ~50 re-scored items
    v
[Top-K Selection + LLM Explanation]
    |   Input: ~50 items --> Output: 10-20 items with explanations
    v
[Record RecommendationBatch + Impressions]
    |
    v
[Return RecommendationOutput[] to client]
    - items: ClothingItem[]
    - outfit: OutfitSuggestion
    - explanation.why: string
    - explanation.alternative: ClothingItem[]
    - explanation.nextAction: "tryOn" | "saveToWardrobe" | "addToCart" | "askStylist"
    - explanation.confidence: number
```

### Onboarding Flow (Cold Start Seed Generation)

```
[Mobile: Step 3 - Style Image Selection]
    |
    v
[User selects 2-3 images from 6 style-representative photos]
    |
    v
[Mobile: Extract FashionCLIP embeddings on-device OR send to backend]
    |
    v
[NestJS: ColdStartService.generateSeeds()]
    |
    +--> [ML Service: FashionCLIP encode selected images]
    |       Returns: styleSeedVector (512-dim)
    |
    +--> [Store styleSeedVector in UserProfile.styleEmbedding]
    |
    +--> [Qdrant: searchSimilar(styleSeedVector, filter=L1-L4, topK=20)]
    |
    v
[Return initial recommendations based on style seeds + scenario + rules]
```

### Product Sync Flow (Background)

```
[Cron Job: Daily 03:00]
    |
    v
[NestJS: ProductSyncService]
    |
    +--> [Taobao Ke API: HMAC-SHA256 signed request]
    |       GET /items?category=fashion&page=1
    |
    +--> [JD Alliance API: OAuth2 request]
    |       GET /product/query?cid=服饰
    |
    v
[Normalize to ClothingItem schema]
    - Map Taobao fields --> ClothingItem attributes
    - Map JD fields --> ClothingItem attributes
    - Standardize colors, sizes, materials
    |
    v
[UPSERT to PostgreSQL via Prisma]
    |
    v
[For each new/updated item:]
    +--> [ML Service: FashionCLIP embed image + text]
    +--> [Qdrant: upsert with full payload metadata]
    |
    v
[Redis: invalidate recommendation caches for affected categories]
```

### Feedback Loop (Behavior -> Better Recommendations)

```
[User views/clicks/likes/purchases a recommended item]
    |
    v
[Mobile: trackBehavior(itemId, action)]
    |
    v
[NestJS: BehaviorTrackingService.recordBehavior()]
    |
    +--> [PostgreSQL: INSERT into UserBehaviorEvent]
    +--> [Redis: increment real-time counters]
    |
    v
[Background: PreferenceLearningService.aggregatePreferences()]
    - Batch process every 5 minutes
    - Update category/brand/style preference scores
    |
    v
[Background: SASRec training pipeline]
    - Pull behavior sequences from DB
    - Train SASRec model (port 8100)
    - Save updated model weights
    |
    v
[Next recommendation request uses updated preferences and SASRec model]
```

## Scaling Considerations

| Scale                | Architecture Adjustments                                                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0-1k users (current) | Single NestJS instance + single FastAPI instance. Qdrant with 10K indexing threshold. All model inference on RTX 4060. Estimated cost: 350 RMB/month.                                                                                 |
| 1k-10k users         | Add Redis caching for popular recommendation queries. Pre-compute FashionCLIP embeddings for all products (one-time batch). SASRec training moves to scheduled job (not per-request). Consider read replica for PostgreSQL.           |
| 10k-100k users       | Separate SASRec into dedicated GPU instance. Add Qdrant horizontal scaling (sharding by category). Implement recommendation pre-computation for daily active users. CDN for product images. Consider on-device rule engine migration. |
| 100k+ users          | Full Kubernetes deployment. Model serving via ONNX Runtime or TensorRT. Dedicated embedding service cluster. SASRec ONNX export for edge inference. Product sync moves to event-driven (Kafka) architecture.                          |

### Scaling Priorities

1. **First bottleneck: FashionCLIP embedding generation.** At ingestion time, generating embeddings for thousands of products is CPU/GPU-bound. Mitigation: batch processing with queue, pre-compute at sync time.
2. **Second bottleneck: Qdrant filtered search latency.** When candidate set after L1-L4 exceeds 5,000, vector search slows. Mitigation: use Qdrant's payload indexing + HNSW ef_search tuning.
3. **Third bottleneck: LLM explanation generation.** Each recommendation batch needs 3-5 LLM calls for explanations. Mitigation: template-based fallback for non-premium users, async generation.

## Anti-Patterns

### Anti-Pattern 1: Flat Weighted Sum Without Funnel

**What people do:** Score all 10,000+ products with all algorithms, then take top-K.
**Why it's wrong:** Vector search over 10K items is 20x more expensive than over 500. Rule engine scoring over 10K is wasted when 90% would be eliminated by simple filters. The current orchestrator does exactly this -- it scores everything, then filters.
**Do this instead:** Apply cheap hard filters first (L1-L4) to reduce candidate set to <500, then apply expensive scoring (L5-L6).

### Anti-Pattern 2: Gender-Based User Segmentation

**What people do:** Split recommendation logic into male/female paths with different rule sets and scoring.
**Why it's wrong:** garmentPreference ("does this person wear skirts?") predicts actual behavior far better than gender. Gender binary excludes users. The current ColdStartService uses `demographicRules` split by male/female.
**Do this instead:** Use bodyType + styleExpression + primaryScenarios as primary segmentation axes. gender is L6 optional, never used in L1-L5.

### Anti-Pattern 3: Real-Time Embedding Generation

**What people do:** Generate FashionCLIP embeddings at query time for each recommendation request.
**Why it's wrong:** FashionCLIP inference takes 50-200ms per image. A recommendation request needing 50 candidates would take 2.5-10 seconds.
**Do this instead:** Pre-compute embeddings at product ingestion time. Store in Qdrant. Query-time only does vector search (1-5ms).

### Anti-Pattern 4: Circular Dependencies Between ML and Backend

**What people do:** Backend calls ML service, ML service calls back to backend for user data.
**Why it's wrong:** Creates circular HTTP dependency chains. One service outage cascades. The existing code had this with RecommendationExplainerService depending on AiStylistModule (now fixed).
**Do this instead:** Backend orchestrates. ML service is stateless -- receives all needed data in the request payload. Backend fetches user profile, passes it to ML service in one direction.

### Anti-Pattern 5: Hardcoded Fashion Rules in Code

**What people do:** Embed fashion rules directly in Python/TypeScript code (if/else chains).
**Why it's wrong:** Rules change frequently. Current full_outfit_engine.py has simplified hardcoded rules that diverge from the 264+ detailed JSON rule files.
**Do this instead:** Load rules from JSON files at startup. Cache in memory. Support hot-reload for rule updates without redeployment.

## Integration Points

### External Services

| Service                                       | Integration Pattern                                                                      | Notes                                                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **FashionCLIP (patrickjohncyh/fashion-clip)** | Python FastAPI endpoint: `POST /api/embed`. Backend calls via HTTP.                      | Model loaded once at startup. Batch embedding supported. 512-dim output.                            |
| **Qdrant**                                    | NestJS `@qdrant/js-client-rest` for search. Python `qdrant_client` for embedding upsert. | Two access paths: backend reads, ML service writes. Collection: `clothing_items` (512-dim, Cosine). |
| **SASRec Service**                            | Separate FastAPI on port 8100. NestJS `SASRecClientService` calls via HTTP.              | Has own /predict, /train, /warmup, /save, /load endpoints. PyTorch or NumPy backend.                |
| **GLM/Doubao LLM**                            | Backend calls via HTTP API. `RecommendationExplainerService` has own client.             | Used for explanation generation and stylist chat. Pay-per-use.                                      |
| **Virtual Try-On API**                        | ML service calls external API. Backend proxies through try-on route.                     | Input: user photo + item image. Output: synthesized image + confidence.                             |
| **Taobao Ke API**                             | Backend ProductSyncService. HMAC-SHA256 signed requests.                                 | Daily full sync + 2-hour incremental. Needs enterprise registration for production.                 |
| **JD Alliance API**                           | Backend ProductSyncService. OAuth2 authentication.                                       | Same sync schedule as Taobao. Dual-source redundancy.                                               |
| **Weather API**                               | Backend WeatherService. Cached in Redis.                                                 | Used for L2 context filter and scene card generation.                                               |

### Internal Boundaries

| Boundary                    | Communication                     | Notes                                                                                                                    |
| --------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **NestJS <-> FastAPI (ML)** | HTTP REST (sync)                  | Backend is always the initiator. ML service is stateless. Requests include all needed context (profile data, item data). |
| **NestJS <-> Qdrant**       | HTTP REST (Qdrant JS client)      | Read path: vector search + payload filtering. Write path: embedding upsert (called from ML service indirectly).          |
| **NestJS <-> PostgreSQL**   | Prisma ORM                        | All persistent data. Migrations managed by Prisma schema.                                                                |
| **NestJS <-> Redis**        | ioredis client                    | Caching, sessions, rate limiting, real-time counters.                                                                    |
| **NestJS <-> SASRec**       | HTTP REST (port 8100)             | Separate FastAPI process. Training is async. Inference is sync.                                                          |
| **Mobile <-> NestJS**       | HTTPS REST                        | API gateway pattern. All ML calls proxied through backend, never direct from mobile.                                     |
| **Mobile On-Device**        | Native bridge (MediaPipe, CIELAB) | Runs independently. Results uploaded to backend when network available.                                                  |

## Build Order (Dependency Analysis)

Components must be built in this order because later stages depend on earlier ones:

```
Phase 1: DATA FOUNDATION (no dependencies)
  1a. ClothingItem schema enrichment (material, season, source, attributes)
  1b. 6-layer UserProfile Prisma schema
  1c. RecommendationBatch + Impression tables
  1d. Mock product seed data (100+ items)
  1e. Gender field downgrade (optional everywhere)

Phase 2: PROFILE AGGREGATION (depends on Phase 1)
  2a. ProfileAggregatorService (assembles L1-L6 from DB tables)
  2b. ColdStartService refactor (bodyType + styleExpression, no gender)
  2c. BodyMetricsService de-gendering (continuous functions)
  2d. Onboarding 4-step flow (saves to L1-L5 profile fields)

Phase 3: EMBEDDING PIPELINE (depends on Phase 1a)
  3a. FashionCLIP embedding endpoint in ML service
  3b. FashionClipService in backend (orchestration + caching)
  3c. Qdrant collection setup (clothing_items with full payload)
  3d. Batch embedding job for existing mock products

Phase 4: FUNNEL PIPELINE (depends on Phase 2, 3)
  4a. L1 Compliance filter
  4b. L2 Context filter
  4c. L3 Fit filter
  4d. L4 Budget filter
  4e. L5 Style scorer (integrates rule engine + FashionCLIP + SASRec + popularity)
  4f. L6 Wardrobe complement booster
  4g. RecommendationOrchestrator refactor (replaces flat scoring with funnel)

Phase 5: EXPLANATION + UX (depends on Phase 4)
  5a. LLM explanation generation for top-K results
  5b. Degradation cascade (per-component fallbacks)
  5c. Today Screen integration (scene card + recommendations)
  5d. Stylist chat integration (recommendations in conversation)

Phase 6: PRODUCT SYNC (depends on Phase 1a, 3)
  6a. Taobao Ke API integration (HMAC-SHA256)
  6b. JD Alliance API integration (OAuth2)
  6c. Product normalization service
  6d. Scheduled sync jobs (daily + incremental)

Phase 7: FEEDBACK LOOP (depends on Phase 4, 5)
  7a. Behavior tracking refinement
  7b. Preference learning aggregation
  7c. SASRec training pipeline (scheduled)
  7d. Impression attribution + analytics

Phase 8: ON-DEVICE (depends on Phase 4, can defer)
  8a. MediaPipe Pose integration (React Native native module)
  8b. CIELAB color analysis (native module)
  8c. Rule engine lite (subset of L1-L4 rules)
  8d. SASRec ONNX export (defer until >1000 users)
```

## Sources

- Context7: FashionCLIP (patrickjohncyh/fashion-clip) -- embedding generation, product retrieval API
- Context7: Qdrant Client (qdrant/qdrant-client) -- filtered vector search with payload, Filterable HNSW
- Context7: NestJS (nestjs/docs.nestjs.com) -- module boundaries, custom providers, DI
- [The 3-Stage Funnel Behind Every Modern Recommender System](https://www.mlwhiz.com/p/the-recommendation-engine-under-the) -- industry standard multi-stage funnel architecture
- [Multi-Stage Approach to Building Recommender Systems](https://towardsdatascience.com/multi-stage-approach-to-building-recommender-systems-71a31e58ecb4/) -- candidate generation through ranking stages
- [Qdrant Complete Filtering Guide](https://qdrant.tech/articles/vector-search-filtering/) -- production patterns for filtered vector search
- [NVIDIA: Building ML Microservice with FastAPI](https://developer.nvidia.com/blog/building-a-machine-learning-microservice-with-fastapi/) -- FastAPI + NestJS integration pattern
- Existing codebase: RecommendationOrchestrator, QdrantService, SASRecClientService, ColdStartService, FashionKnowledgeRAG

---

_Architecture research for: AI Fashion Recommendation Pipeline (XUNO)_
_Researched: 2026-04-22_

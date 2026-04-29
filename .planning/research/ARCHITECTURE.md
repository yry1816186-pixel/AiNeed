# Architecture Research

**Domain:** AI Fashion Recommendation Platform (Mobile)
**Researched:** 2026-04-29
**Confidence:** HIGH (existing architecture documented)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    Mobile Client (React Native)                   │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  Today   │ │ Discover │ │ Stylist  │ │       Me         │   │
│  │  Tab     │ │   Tab    │ │   Tab    │ │      Tab         │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───────┬──────────┘   │
│       │             │            │               │               │
│       └─────────────┴────────────┴───────────────┘               │
│                         │ Zustand State                          │
│                         │ TanStack Query                         │
├─────────────────────────┴────────────────────────────────────────┤
│                     HTTP/WS REST API Gateway                      │
├──────────────────────────────────────────────────────────────────┤
│                    Backend (NestJS :3001)                         │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐       │
│  │ ai-core  │ commerce │ fashion  │ identity │  social  │       │
│  │  Domain  │  Domain  │  Domain  │  Domain  │  Domain  │       │
│  └────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┘       │
│       │           │           │           │           │           │
│  ┌────┴───────────┴───────────┴───────────┴───────────┴────┐    │
│  │          Shared Modules (cache/database/security/ws)      │    │
│  └──────────────────────────┬───────────────────────────────┘    │
│                             │                                     │
├─────────────────────────────┴────────────────────────────────────┤
│                    Infrastructure Layer                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │PostgreSQL│  │  Redis   │  │  MinIO   │  │  BullMQ  │        │
│  │    :5432 │  │   :6379  │  │ :9000    │  │ (Redis)  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
├──────────────────────────────────────────────────────────────────┤
│                   AI Service Layer (Python :8000)                 │
│  ┌────────────────────┐  ┌─────────────────┐                     │
│  │   Stylist Engine   │  │  Try-On Service  │                    │
│  │  DialogEngine      │  │  GLM API Client  │                    │
│  │  FashionRuleLoader │  │  Image Processor │                    │
│  │  StudioSignals     │  │  Result Caching  │                    │
│  └────────┬───────────┘  └────────┬────────┘                    │
│           │                        │                              │
│      ┌────┴────────────────────────┴────┐                        │
│      │         GLM-4-Flash API           │                        │
│      │         Qwen API (fallback)        │                        │
│      │         FashionSigLIP (future)     │                        │
│      └───────────────────────────────────┘                        │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component   | Responsibility                                   | Implementation                          |
| ----------- | ------------------------------------------------ | --------------------------------------- |
| Mobile App  | User interaction, state, navigation              | React Native + Zustand + TanStack Query |
| Backend API | Business logic, data persistence, auth           | NestJS 11.x domain-driven               |
| AI Service  | LLM orchestration, prompt engineering, image gen | Python FastAPI + GLM SDK                |
| PostgreSQL  | User data, products, orders, recommendations     | Prisma ORM                              |
| Redis       | Session cache, rec cache, BullMQ queue           | ioredis                                 |
| MinIO       | Product images, try-on outputs, avatars          | S3-compatible API                       |
| BullMQ      | Async AI generation jobs, email                  | Redis-backed queue                      |

## Recommended Project Structure

```
AiNeed/
├── apps/
│   ├── backend/              # NestJS API server
│   │   ├── src/domains/      # 8 domain modules
│   │   ├── src/modules/      # 5 shared modules
│   │   └── prisma/           # Schema + migrations
│   ├── mobile/               # React Native app
│   │   ├── src/features/     # 18 feature modules
│   │   ├── src/shared/       # Shared components/hooks
│   │   └── src/navigation/   # Tab + Stack navigators
│   └── admin/                # Admin dashboard
├── ml/                       # Python AI services
│   ├── services/stylist/     # Dialog engine
│   ├── services/tryon/       # Virtual try-on
│   └── data/                 # Rules + mock data
├── packages/
│   └── shared/               # Shared TypeScript types
├── docs/                     # Project documentation
└── .planning/                # GSD project management
```

### Structure Rationale

- **apps/backend/src/domains/:** Domain-driven design — 8 domains (ai-core, commerce, customization, fashion, identity, mobile-api, platform, social)
- **apps/mobile/src/features/:** Feature-driven — each feature is self-contained with screens, components, hooks, and types
- **ml/:** Separate Python service — different language/runtime, communicates via HTTP
- **packages/:** Shared types contract between frontend and backend

## Architectural Patterns

### Pattern 1: Domain-Driven Design (Backend)

**What:** Backend organized into bounded contexts (domains) with shared kernel (modules)
**When to use:** Complex business logic with clear domain boundaries
**Trade-offs:** More files, clearer separation; overkill for simple CRUD APIs

### Pattern 2: Feature-First Organization (Mobile)

**What:** Each feature is a self-contained directory with all related files
**When to use:** Mobile apps with many distinct user-facing features
**Trade-offs:** Fast navigation within feature; some code duplication across features

### Pattern 3: AI Service Layer as Separate Process

**What:** AI/ML logic in dedicated Python service, called via HTTP from NestJS
**When to use:** AI models require Python ecosystem, different scaling needs
**Trade-offs:** Network latency overhead; independent deployment and scaling

## Data Flow

### Recommendation Request Flow

```
[User opens Today Tab / sends message to Yiyi]
    ↓
[Mobile] → GET /api/stylist/recommend?scene=interview
    ↓
[NestJS] → auth middleware → StylistService
    ↓
[NestJS] → HTTP POST to Python AI service /stylist/dialog
    ↓
[Python] → DialogEngine → FashionRuleLoader → GLM API
    ↓
[Python] ← GLM response (outfit + reasoning)
    ↓
[NestJS] ← JSON recommendations + product IDs
    ↓
[NestJS] → Prisma query for product details
    ↓
[Mobile] ← Full recommendation with product cards
    ↓
[User sees: 3 outfit plans with try-on buttons]
```

### Try-on Flow

```
[User taps "Try On"]
    ↓
[Mobile] → POST /api/tryon {outfitId, userImage}
    ↓
[BullMQ] → Enqueue try-on job (async — returns jobId)
    ↓
[Python] → GLM multi-modal API (image + outfit description)
    ↓
[Python] → Upload result to MinIO
    ↓
[NestJS] → WebSocket notify mobile (jobId complete)
    ↓
[Mobile] → Fetch result image from MinIO URL
```

### State Management (Mobile)

```
[Zustand Store]
    ↓ (subscribe)
[Feature Screens] ←→ [TanStack Query] → [REST API]
    ↓
[Local Analytics] → [Recommendation Cache]
```

## Integration Points

### External Services

| Service             | Integration Pattern           | Notes                           |
| ------------------- | ----------------------------- | ------------------------------- |
| GLM-4-Flash API     | HTTP REST (OpenAI-compatible) | 5s timeout, Qwen fallback       |
| Qwen API            | HTTP REST (fallback)          | Same interface, different model |
| Marqo-FashionSigLIP | HTTP REST (future)            | Phase 6 migration target        |
| Edge-TTS            | HTTP REST                     | Voice response generation       |
| MinIO               | S3-compatible API             | Object storage for images       |

### Internal Boundaries

| Boundary             | Communication    | Notes                                            |
| -------------------- | ---------------- | ------------------------------------------------ |
| Mobile ↔ Backend     | REST + WebSocket | TanStack Query for REST, Socket.io for real-time |
| Backend ↔ AI Service | HTTP REST        | JSON payload, structured prompt + context        |
| Backend ↔ BullMQ     | Redis pub/sub    | Async job processing                             |
| Backend ↔ Prisma     | Direct import    | Type-safe queries                                |

## Anti-Patterns

### Anti-Pattern 1: Direct LLM Calls from Mobile

**What people do:** Call GLM API directly from React Native
**Why it's wrong:** Exposes API keys, no caching, no rate limiting
**Do this instead:** Route all AI calls through backend AI service layer

### Anti-Pattern 2: Monolithic Backend with AI Logic

**What people do:** Put AI prompt logic in NestJS controllers
**Why it's wrong:** Python ML libraries not available, different scaling needs
**Do this instead:** Separate Python AI service with clear API contract

## Sources

- Existing codebase structure (`apps/`, `ml/`, `packages/`)
- `CLAUDE.md` — Architecture overview and monorepo structure
- `README.md` — System architecture diagram
- `docs/XUNO_FINAL_PLAN.md` — Frozen decisions

---

_Architecture research for: AI Fashion Recommendation_
_Researched: 2026-04-29_

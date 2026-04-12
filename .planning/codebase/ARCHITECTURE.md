# Codebase Map: Architecture

**Mapped:** 2026-04-13
**Project:** AiNeed

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  React Native Mobile App                 │
│              (apps/mobile - RN 0.76.8)                   │
│   Zustand stores · React Navigation · TanStack Query     │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP (Axios)
                       │ WebSocket (Socket.IO)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   NestJS Backend API                     │
│              (apps/backend - NestJS 11)                  │
│   35 modules · JWT Auth · BullMQ queues · WebSocket      │
├─────────────────────────────────────────────────────────┤
│  Common Layer: Guards · Interceptors · Filters · Pipes   │
│  Prisma ORM · Redis Cache · MinIO Storage · Prometheus   │
└──────┬──────────┬───────────┬──────────┬────────────────┘
       │          │           │          │
       ▼          ▼           ▼          ▼
  PostgreSQL   Redis      MinIO      Python ML
  (Prisma)    (ioredis)  (S3 API)   Services
                                    (CatVTON,
                                     SASRec, etc.)
```

## Monorepo Structure

**Type:** pnpm workspace monorepo
**Config:** `pnpm-workspace.yaml`

| Workspace | Path | Purpose |
|-----------|------|---------|
| Backend | `apps/backend/` | NestJS API server |
| Mobile | `apps/mobile/` | React Native app |
| Types | `packages/types/` | Shared TypeScript types |
| Shared | `packages/shared/` | Shared utilities |

## Backend Architecture

### Pattern: Modular Monolith (NestJS)

Each business domain is a self-contained NestJS module with its own controller, service, DTOs, and tests.

### Module Layers

```
Module (e.g., clothing/)
├── clothing.module.ts      # Dependency injection, imports/exports
├── clothing.controller.ts  # HTTP endpoints (route handlers)
├── clothing.service.ts     # Business logic
├── dto/                    # Request/response DTOs
│   ├── create-clothing.dto.ts
│   └── update-clothing.dto.ts
└── entities/               # (Optional) Domain entities
```

### All Modules (35 total)

| Category | Modules |
|----------|---------|
| **Core** | `auth`, `users`, `profile`, `database`, `health` |
| **Fashion** | `clothing`, `try-on`, `style-profiles`, `recommendations`, `customization` |
| **Commerce** | `cart`, `order`, `payment`, `subscription`, `merchant`, `brands` |
| **AI** | `ai`, `ai-stylist`, `ai-safety`, `code-rag` |
| **Social** | `community`, `photos`, `favorites`, `search` |
| **Infrastructure** | `cache`, `queue`, `ws`, `analytics`, `metrics`, `notification` |
| **Other** | `address`, `weather`, `demo`, `privacy` |

### Common Layer

Shared infrastructure in `apps/backend/src/common/`:

| Directory | Purpose |
|-----------|---------|
| `config/` | Application configuration |
| `guards/` | Auth guards (JWT, roles) |
| `interceptors/` | Logging, transform interceptors |
| `filters/` | Exception filters (global error handler) |
| `pipes/` | Validation pipes (XSS sanitization) |
| `middleware/` | Metrics, error handler middleware |
| `prisma/` | Prisma client service |
| `redis/` | Redis service |
| `storage/` | MinIO storage service |
| `security/` | Encryption, security utilities |
| `email/` | Email service |
| `circuit-breaker/` | Opossum circuit breaker |
| `logging/` | Logging utilities |
| `soft-delete/` | Soft delete mixin |
| `gateway/` | WebSocket gateway base |
| `types/` | Common TypeScript types |
| `dto/` | Common DTOs |
| `exceptions/` | Custom exceptions |

### Request Flow

```
HTTP Request
  → Helmet (security headers)
  → Compression (response compression)
  → CORS validation
  → Global Error Handler Middleware
  → Metrics Middleware
  → Global Exception Filter
  → Auth Guard (if protected route)
  → XSS Sanitization Pipe
  → Validation Pipe (class-validator)
  → Controller (route handler)
  → Service (business logic)
  → Prisma (database)
  → Response
```

### Data Flow

```
Mobile App
  → Axios HTTP client
  → NestJS Controller (versioned API: /api/v1/*)
  → Service layer (business logic)
  → Prisma ORM → PostgreSQL
  → Redis cache (when applicable)
  → BullMQ queue (async jobs)
  → Python ML services (AI inference)
  → MinIO (file storage)
```

## Mobile Architecture

### Pattern: Screen-based with Zustand + TanStack Query

```
Navigation Stack (React Navigation 6)
  ├── Bottom Tabs
  │   ├── Home → HomeScreen
  │   ├── Wardrobe → WardrobeScreen
  │   ├── Heart → HeartScreen
  │   ├── Community → CommunityScreen
  │   └── Profile → ProfileScreen
  └── Stack Screens (28 total)
```

### State Management

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Server State | TanStack Query ^5.81.0 | API data, caching, refetching |
| Global UI State | Zustand ^5.0.5 | UI preferences, auth state |
| Stores | `stores/clothingStore.ts` | Clothing-specific state |
| Stores | `stores/wardrobeStore.ts` | Wardrobe state |
| Stores | `stores/uiStore.ts` | UI state |

### Directory Organization

| Directory | Purpose |
|-----------|---------|
| `screens/` | 28 screen components (one per route) |
| `components/` | Reusable UI components, organized by domain |
| `services/api/` | API client layer |
| `services/ai/` | AI-specific services |
| `services/speech/` | Speech recognition |
| `stores/` | Zustand stores |
| `hooks/` | Custom React hooks |
| `contexts/` | React context providers |
| `navigation/` | Navigation configuration |
| `theme/` | Theme system with tokens |
| `i18n/` | Internationalization |
| `utils/` | Utility functions |
| `config/` | App configuration |
| `types/` | TypeScript types |

## Database Architecture

### Schema (Prisma)

Located at `apps/backend/prisma/schema.prisma`

**Core entities:**
- `User` - Central entity with relations to nearly everything
- `UserProfile` - Body type, skin tone, face shape
- `UserPhoto` - User uploaded photos
- `Clothing` / `ClothingVariant` - Fashion items
- `VirtualTryOn` - Try-on results
- `StyleProfile` - User style preferences
- `Order` / `CartItem` / `PaymentOrder` - E-commerce
- `CommunityPost` / `PostLike` / `PostComment` - Social
- `AiStylistSession` / `UserDecision` - AI interactions
- `StyleRecommendation` / `RankingFeedback` - Recommendations

**Key patterns:**
- UUID primary keys
- Soft delete on User (GDPR/PIPL compliance)
- Indexes on frequently queried fields
- Cascade deletes where appropriate

## ML/AI Pipeline

```
Backend (NestJS)
  → AI Module (ai/)
    → CatVTON Server (virtual try-on)
    → Body Analysis Server (body shape)
    → SASRec Server (recommendations)
    → Segmentation Server (clothing detection)
    → Trend Prediction Server
    → Aesthetic Scorer
  → Code RAG Module (code-rag/)
    → Qdrant Vector DB
    → Python Indexer (sentence-transformers)
```

## Entry Points

| Entry Point | Location | Purpose |
|-------------|----------|---------|
| Backend API | `apps/backend/src/main.ts` | NestJS bootstrap, port 3001 |
| Mobile App | `apps/mobile/` | React Native entry |
| ML Services | `ml/inference/*.py` | Individual AI model servers |
| Code RAG CLI | `ml/services/code_rag/index_cli.py` | Code indexing |

---
*Last updated: 2026-04-13*

# Architecture

**Project:** 寻裳 (XunO)
**Last mapped:** 2026-04-16

## System Overview

寻裳 is a three-tier AI-powered fashion platform:

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Mobile   │  │  Admin   │  │ HarmonyOS│             │
│  │ (RN 0.76)│  │ (Vite)   │  │ (ArkTS)  │             │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘             │
│        │              │              │                   │
│        └──────────────┼──────────────┘                   │
│                       │ REST + WebSocket                 │
├───────────────────────┼─────────────────────────────────┤
│                       ▼                                  │
│  ┌─────────────────────────────────────────────────┐    │
│  │           Backend API (NestJS 11)                │    │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────────────┐ │    │
│  │  │  Auth   │ │ Business │ │   AI/ML Bridge   │ │    │
│  │  │ Module  │ │ Modules  │ │   (GLM API)      │ │    │
│  │  └─────────┘ └──────────┘ └──────────────────┘ │    │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────────────┐ │    │
│  │  │ Common  │ │  Queue   │ │   WebSocket      │ │    │
│  │  │ Layer   │ │ (BullMQ) │ │   (Socket.IO)    │ │    │
│  │  └─────────┘ └──────────┘ └──────────────────┘ │    │
│  └────────────────────┬────────────────────────────┘    │
│                       │ HTTP                             │
├───────────────────────┼─────────────────────────────────┤
│                       ▼                                  │
│  ┌─────────────────────────────────────────────────┐    │
│  │          AI/ML Service (FastAPI)                  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │    │
│  │  │ Stylist  │ │  Try-On  │ │  Body Analysis   │ │    │
│  │  │ (GLM-5)  │ │  (GLM)   │ │  (ML models)     │ │    │
│  │  └──────────┘ └──────────┘ └──────────────────┘ │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                   Data Layer                             │
│  ┌──────────┐ ┌───────┐ ┌───────┐ ┌───────┐          │
│  │PostgreSQL│ │ Redis │ │ MinIO │ │ Neo4j │          │
│  │   (16)   │ │  (7)  │ │       │ │       │          │
│  └──────────┘ └───────┘ └───────┘ └───────┘          │
│  ┌───────┐                                              │
│  │Qdrant │                                              │
│  └───────┘                                              │
└─────────────────────────────────────────────────────────┘
```

## Backend Architecture (NestJS)

### Layered Module Architecture

```
apps/backend/src/
├── main.ts                    # Bootstrap, global middleware
├── app.module.ts              # Root module (35+ feature modules)
├── common/                    # Shared infrastructure
│   ├── cache/                 # Cache decorator & strategies
│   ├── circuit-breaker/       # Circuit breaker pattern
│   ├── config/                # Env validation, runtime flags
│   ├── decorators/            # Custom decorators (auth, pagination, cache)
│   ├── dto/                   # Shared DTOs (pagination, response, error)
│   ├── email/                 # Email service
│   ├── encryption/            # AES-256-GCM PII encryption
│   ├── exceptions/            # Custom exception classes
│   ├── filters/               # Global exception filters
│   ├── gateway/               # WebSocket gateway base
│   ├── guards/                # Auth guards (JWT, roles, admin, CSRF)
│   ├── interceptors/          # Transform, cache, performance, sensitive-data
│   ├── logger/                # Pino-based logging
│   ├── logging/               # Structured logging + request ID
│   ├── middleware/            # API versioning, error handler, metrics, soft-delete
│   ├── pipes/                 # XSS sanitization
│   ├── prisma/                # Prisma service + soft-delete extension
│   ├── redis/                 # Redis service
│   ├── security/              # bcrypt, image sanitizer, malware scanner, upload validator
│   ├── sentry/                # Sentry integration
│   ├── services/              # Image processing service
│   ├── soft-delete/           # Soft delete service
│   ├── storage/               # MinIO storage service
│   ├── types/                 # Shared type definitions
│   └── utils/                 # Cursor-based pagination, image sizes
├── config/                    # Swagger config, membership plans
└── modules/                   # 35+ feature modules
    ├── auth/                  # Authentication (email, WeChat, SMS)
    ├── ai-stylist/            # AI stylist chat + outfit planning
    ├── try-on/                # Virtual try-on (GLM, Doubao providers)
    ├── recommendations/       # Multi-algorithm recommendation engine
    ├── clothing/              # Clothing catalog
    ├── profile/               # User profiles + body metrics
    ├── photos/                # Photo upload + AI analysis
    ├── style-quiz/            # Style quiz system
    ├── cart/                  # Shopping cart
    ├── order/                 # Order management
    ├── payment/               # Payment (Alipay, WeChat Pay)
    ├── community/             # Social feed + posts
    ├── blogger/               # Blogger/Influencer system
    ├── consultant/            # Private consultant booking
    ├── customization/         # Custom clothing design
    ├── subscription/          # VIP membership
    ├── search/                # Search + visual search
    ├── notification/          # Push + in-app notifications
    ├── admin/                 # Admin dashboard
    ├── merchant/              # Merchant portal
    ├── brands/                # Brand management + QR
    ├── favorites/             # Favorites/Wishlist
    ├── wardrobe-collection/   # Digital wardrobe
    ├── coupon/                # Coupon system
    ├── analytics/             # Behavior tracking
    ├── feature-flags/         # Feature flag system
    ├── health/                # Health checks
    ├── privacy/               # Privacy consent management
    ├── queue/                 # BullMQ task queue
    ├── security/              # Security (content filter, rate limit, encryption, vault)
    ├── size-recommendation/   # Size recommendation
    ├── stock-notification/    # Stock alerts
    ├── style-profiles/        # Style profile management
    ├── share-template/        # Share poster templates
    ├── weather/               # Weather service
    ├── chat/                  # Real-time chat
    ├── ai/                    # AI integration services
    ├── ai-safety/             # AI safety guardrails
    ├── code-rag/              # Code RAG system
    ├── database/              # Database service
    ├── demo/                  # Demo endpoints
    ├── metrics/               # Prometheus metrics
    ├── refund-request/        # Refund handling
    ├── users/                 # User management
    ├── address/               # Address management
    ├── ws/                    # WebSocket module
    └── onboarding/            # Onboarding flow
```

### Key Architectural Patterns

1. **Module-per-feature**: Each business domain is a self-contained NestJS module
2. **Provider pattern**: Try-on uses provider interface (`ai-tryon-provider.interface.ts`) for GLM/Doubao/local
3. **Guard-based auth**: JWT auth guard globally applied, with `@Public()` decorator for open endpoints
4. **Interceptor chain**: Transform → Cache → Performance → Sensitive Data masking
5. **Event-driven**: `@nestjs/event-emitter` for profile events, payment events, order events
6. **Queue-based**: BullMQ for async tasks (try-on, notifications, AI processing)
7. **Soft delete**: Prisma extension + middleware for GDPR/PIPL compliance
8. **PII encryption**: AES-256-GCM per-user encryption for sensitive fields

### Data Flow

```
Mobile App → REST API → Controller → Service → Prisma → PostgreSQL
                      → Service → Redis (cache)
                      → Service → BullMQ → Processor → External API
                      → Service → WebSocket → Client
                      → Service → Event Emitter → Listener
```

## Mobile Architecture (React Native)

### Navigation Structure

```
RootNavigator
├── AuthNavigator (unauthenticated)
│   ├── LoginScreen
│   ├── RegisterScreen
│   └── PhoneLoginScreen
└── MainStackNavigator (authenticated)
    ├── Bottom Tabs
    │   ├── Home (HomeScreen)
    │   ├── Explore (SearchScreen)
    │   ├── Heart (HeartScreen / SwipeRecommendation)
    │   ├── Cart (CartScreen)
    │   ├── Wardrobe (WardrobeScreen)
    │   └── Profile (ProfileScreen)
    └── Stack Screens (50+ screens)
```

### State Management

- **Zustand stores** (20+ stores): `auth.store`, `clothingStore`, `aiStylistStore`, `chatStore`, etc.
- **TanStack Query**: Server state caching, `staleTime: 5min`
- **Context**: ThemeContext, FeatureFlagContext, OutfitContext, VirtualTryOnContext

### Service Layer

```
services/
├── api/           # API client modules (auth, clothing, tryon, etc.)
│   ├── client.ts  # Axios instance with interceptors
│   └── *.api.ts   # Domain-specific API modules
├── ai/            # AI service wrappers
├── auth/          # Token management, WeChat auth
└── websocket.ts   # Socket.IO client
```

## AI/ML Service Architecture

```
ml/
├── api/                    # FastAPI application
│   ├── routes/             # API endpoints
│   │   ├── stylist_chat.py # AI stylist chat
│   │   ├── virtual_tryon.py# Virtual try-on
│   │   ├── body_analysis.py# Body shape analysis
│   │   ├── style_analysis.py# Style analysis
│   │   └── photo_quality.py# Photo quality check
│   ├── middleware/          # Auth, logging
│   └── schemas/            # Pydantic models
├── services/               # Core AI services
│   ├── ai_service.py       # Main AI service entry
│   ├── body_analyzer.py    # Body shape analysis
│   ├── stylist_prompts.py  # Prompt engineering
│   ├── sasrec_service.py   # SASRec recommendation
│   ├── metrics_service.py  # Performance metrics
│   └── task_worker.py      # Async task processing
└── config/                 # Path configuration
```

### AI Pipeline

1. **Stylist Chat**: User message → Context building → GLM API → Response + Outfit plan
2. **Virtual Try-On**: User photo + Clothing → GLM API → Generated try-on image
3. **Body Analysis**: Photo → ML models → Body shape/metrics
4. **Recommendations**: Multi-source (collaborative, content, knowledge graph, vector) → Fusion → Ranked results

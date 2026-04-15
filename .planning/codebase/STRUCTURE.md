# Structure

**Project:** 寻裳 (XunO)
**Last mapped:** 2026-04-16

## Monorepo Root Layout

```
C:\AiNeed\
├── apps/                       # Application packages
│   ├── backend/                # NestJS backend (port 3001)
│   ├── mobile/                 # React Native mobile app (port 8081)
│   ├── admin/                  # React + Vite admin panel
│   └── harmony/                # HarmonyOS app (ArkTS)
├── ml/                         # Python AI/ML service
│   ├── api/                    # FastAPI routes & middleware
│   ├── services/               # AI service implementations
│   ├── config/                 # Path configuration
│   └── scripts/                # Test & utility scripts
├── packages/                   # Shared packages
│   ├── types/                  # @xuno/types - Shared TypeScript types
│   └── shared/                 # @xuno/shared - Shared utilities
├── infrastructure/             # Infrastructure configs
│   └── loki/                   # Grafana Loki config
├── k8s/                        # Kubernetes manifests
├── nginx/                      # Nginx reverse proxy config
├── scripts/                    # Utility scripts
│   ├── backup/                 # Database backup scripts
│   └── *.sh / *.bat            # Setup, start, security scripts
├── docs/                       # Project documentation
├── tests/                      # Cross-project tests (k6 load tests)
├── .github/workflows/          # CI/CD pipelines
├── docker-compose.dev.yml      # Dev environment
├── docker-compose.staging.yml  # Staging environment
├── docker-compose.production.yml # Production environment
├── pnpm-workspace.yaml         # Monorepo workspace config
├── package.json                # Root package (scripts, overrides)
├── CLAUDE.md                   # AI assistant context
└── tsconfig.json               # Root TypeScript config
```

## Backend Structure

```
apps/backend/
├── prisma/
│   ├── schema.prisma           # Database schema (30+ models)
│   ├── seed.ts                 # Main seeder
│   └── seeds/                  # Domain-specific seeders
│       ├── users.seed.ts
│       ├── profiles.seed.ts
│       ├── clothing.seed.ts
│       └── brands.seed.ts
├── src/
│   ├── main.ts                 # Entry point (port 3001)
│   ├── app.module.ts           # Root module (35+ imports)
│   ├── common/                 # Shared infrastructure (20+ subdirs)
│   │   ├── cache/              # Cache decorator & strategies
│   │   ├── circuit-breaker/    # Circuit breaker pattern
│   │   ├── config/             # Env validation, runtime flags, URLs
│   │   ├── decorators/         # @Public, @Roles, @ApiAuth, @Cache
│   │   ├── dto/                # Shared DTOs
│   │   ├── email/              # Email service (Nodemailer)
│   │   ├── encryption/         # PII encryption (AES-256-GCM)
│   │   ├── exceptions/         # Business, Forbidden, NotFound, Validation
│   │   ├── filters/            # Global exception filters
│   │   ├── gateway/            # WebSocket gateway base
│   │   ├── guards/             # JWT, Roles, Admin, CSRF guards
│   │   ├── interceptors/       # Transform, Cache, Performance, Sensitive
│   │   ├── logger/             # Pino logger service
│   │   ├── logging/            # Structured logging + request ID
│   │   ├── middleware/         # API versioning, error handler, metrics
│   │   ├── pipes/              # XSS sanitization pipe
│   │   ├── prisma/             # Prisma service + soft-delete extension
│   │   ├── redis/              # Redis service
│   │   ├── security/           # bcrypt, image sanitizer, malware scanner
│   │   ├── sentry/             # Sentry integration
│   │   ├── services/           # Image processing
│   │   ├── soft-delete/        # Soft delete service
│   │   ├── storage/            # MinIO storage service
│   │   ├── types/              # Shared type definitions
│   │   └── utils/              # Cursor pagination, image sizes
│   ├── config/                 # Swagger, membership plans
│   └── modules/                # 35+ feature modules
│       ├── auth/               # Authentication
│       ├── ai-stylist/         # AI stylist chat
│       ├── try-on/             # Virtual try-on
│       ├── recommendations/    # Recommendation engine
│       ├── clothing/           # Clothing catalog
│       ├── profile/            # User profiles
│       ├── photos/             # Photo analysis
│       ├── style-quiz/         # Style quiz
│       ├── cart/               # Shopping cart
│       ├── order/              # Order management
│       ├── payment/            # Payment processing
│       ├── community/          # Social feed
│       ├── blogger/            # Influencer system
│       ├── consultant/         # Consultant booking
│       ├── customization/      # Custom design
│       ├── subscription/       # VIP membership
│       ├── search/             # Search
│       ├── notification/       # Notifications
│       ├── admin/              # Admin dashboard
│       ├── merchant/           # Merchant portal
│       ├── brands/             # Brand management
│       ├── favorites/          # Wishlist
│       ├── wardrobe-collection/# Digital wardrobe
│       ├── coupon/             # Coupons
│       ├── analytics/          # Behavior tracking
│       ├── feature-flags/      # Feature flags
│       ├── health/             # Health checks
│       ├── privacy/            # Privacy consent
│       ├── queue/              # Task queue
│       ├── security/           # Security services
│       ├── size-recommendation/# Size guide
│       ├── stock-notification/ # Stock alerts
│       ├── style-profiles/     # Style profiles
│       ├── share-template/     # Share templates
│       ├── weather/            # Weather
│       ├── chat/               # Real-time chat
│       ├── ai/                 # AI integration
│       ├── ai-safety/          # AI safety
│       ├── code-rag/           # Code RAG
│       ├── database/           # Database service
│       ├── demo/               # Demo
│       ├── metrics/            # Prometheus metrics
│       ├── refund-request/     # Refunds
│       ├── users/              # User management
│       ├── address/            # Addresses
│       ├── ws/                 # WebSocket
│       └── onboarding/         # Onboarding
└── test/                       # E2E tests
    ├── ai-stylist.e2e-spec.ts
    ├── auth.e2e-spec.ts
    ├── cart-order.e2e-spec.ts
    ├── clothing.e2e-spec.ts
    ├── health.e2e-spec.ts
    ├── payment.e2e-spec.ts
    ├── try-on-flow.e2e-spec.ts
    └── try-on.e2e-spec.ts
```

## Mobile Structure

```
apps/mobile/
├── App.tsx                     # Root component
├── index.js                    # Entry point
├── android/                    # Android native project
├── ios/                        # iOS native project
├── assets/                     # Static assets
├── src/
│   ├── components/             # UI components (30+ subdirs)
│   │   ├── ui/                 # Base UI components (Avatar, Badge, Button, Card...)
│   │   ├── primitives/         # Design system primitives
│   │   ├── aistylist/          # AI stylist components
│   │   ├── aicompanion/        # AI companion ball
│   │   ├── community/          # Social feed components
│   │   ├── consultant/         # Consultant components
│   │   ├── customization/      # Design editor components
│   │   ├── heartrecommend/     # Swipe recommendation
│   │   ├── photo/              # Photo guide/quality
│   │   ├── wardrobe/           # Wardrobe components
│   │   ├── charts/             # Visualization charts
│   │   ├── common/             # Shared components (ErrorBoundary, Image, etc.)
│   │   ├── filter/             # Filter panels
│   │   ├── layout/             # Screen layouts
│   │   ├── loading/            # Loading states
│   │   ├── skeleton/           # Skeleton screens
│   │   ├── ux/                 # UX utilities (AccessibleTouchable, NetworkAware)
│   │   └── ...                 # Many more domain components
│   ├── screens/                # Screen components (50+ screens)
│   │   ├── home/               # Home screen
│   │   ├── community/          # Community screens
│   │   ├── consultant/         # Consultant screens
│   │   ├── onboarding/         # Onboarding wizard
│   │   ├── photo/              # Camera/photo screens
│   │   ├── profile/            # Profile screens
│   │   ├── recommendations/    # Recommendation screens
│   │   ├── style-quiz/         # Style quiz screens
│   │   └── *.Screen.tsx        # Individual screens
│   ├── navigation/             # Navigation structure
│   │   ├── RootNavigator.tsx   # Root navigator
│   │   ├── AuthNavigator.tsx   # Auth flow
│   │   ├── MainStackNavigator.tsx # Main app
│   │   ├── RouteGuards/        # Auth, Profile, VIP guards
│   │   └── navigationService.ts # Deep link handling
│   ├── stores/                 # Zustand stores (20+ stores)
│   ├── services/               # API & service layer
│   │   ├── api/                # API client modules (20+ modules)
│   │   ├── ai/                 # AI service wrappers
│   │   ├── auth/               # Auth services
│   │   └── ...                 # Analytics, WebSocket, etc.
│   ├── hooks/                  # Custom hooks (25+ hooks)
│   ├── contexts/               # React contexts
│   ├── theme/                  # Design tokens & theming
│   │   └── tokens/             # Colors, spacing, typography, shadows, animations
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Utility functions
│   ├── config/                 # Runtime config
│   ├── i18n/                   # Internationalization
│   └── polyfills/              # Expo module polyfills
└── e2e/                        # Detox E2E tests
```

## Key File Locations

| Purpose | Path |
|---------|------|
| Database Schema | `apps/backend/prisma/schema.prisma` |
| Backend Entry | `apps/backend/src/main.ts` |
| Backend Module Registry | `apps/backend/src/app.module.ts` |
| Mobile Entry | `apps/mobile/App.tsx` |
| Navigation Root | `apps/mobile/src/navigation/RootNavigator.tsx` |
| API Client | `apps/mobile/src/services/api/client.ts` |
| Auth Store | `apps/mobile/src/stores/auth.store.ts` |
| Theme Tokens | `apps/mobile/src/theme/tokens/` |
| AI Service Entry | `ml/services/ai_service.py` |
| ML API Entry | `ml/api/main.py` |
| Docker Dev | `docker-compose.dev.yml` |
| CI/CD | `.github/workflows/` |
| K8s Manifests | `k8s/` |

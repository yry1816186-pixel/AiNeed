# Codebase Map: Directory Structure

**Mapped:** 2026-04-13
**Project:** AiNeed

## Root Directory

```
C:\AiNeed/
├── apps/                    # Application workspaces
│   ├── backend/             # NestJS API server
│   └── mobile/              # React Native mobile app
├── packages/                # Shared packages
│   ├── shared/              # Shared utilities
│   └── types/               # Shared TypeScript types
├── ml/                      # Python ML/AI services
├── docs/                    # Project documentation
├── monitoring/              # Prometheus + Grafana config
├── k8s/                     # Kubernetes manifests
├── scripts/                 # Build, deploy, audit scripts
├── delivery/                # Delivery artifacts
├── DELIVERY-V3/             # V3 delivery
├── V3/                      # V3 source
├── .github/                 # GitHub CI/CD, Copilot instructions
├── .pnpm-store/             # pnpm local store
├── docker-compose.yml       # Production Docker setup
├── docker-compose.dev.yml   # Development Docker setup
├── package.json             # Root monorepo config
├── pnpm-workspace.yaml      # Workspace definitions
├── pnpm-lock.yaml           # Lock file
├── CLAUDE.md                # Claude Code instructions
├── README.md                # Project documentation
└── .env.example             # Environment template
```

## Backend (`apps/backend/`)

```
apps/backend/
├── src/
│   ├── main.ts                      # Bootstrap, middleware setup
│   ├── app.module.ts                # Root module
│   ├── config/                      # Configuration files
│   ├── common/                      # Shared infrastructure
│   │   ├── circuit-breaker/         # Opossum circuit breaker
│   │   ├── config/                  # Common config
│   │   ├── dto/                     # Common DTOs
│   │   ├── email/                   # Email service
│   │   ├── encryption/              # AES encryption
│   │   ├── exceptions/              # Custom exceptions
│   │   ├── filters/                 # Exception filters
│   │   ├── gateway/                 # WebSocket gateway
│   │   ├── guards/                  # Auth guards
│   │   ├── interceptors/            # Request/response interceptors
│   │   ├── logging/                 # Logging utilities
│   │   ├── middleware/              # Metrics, error handler
│   │   ├── pipes/                   # Validation, XSS sanitization
│   │   ├── prisma/                  # Prisma service
│   │   ├── redis/                   # Redis service
│   │   ├── security/                # Security utilities
│   │   ├── soft-delete/             # Soft delete mixin
│   │   ├── storage/                 # MinIO storage
│   │   └── types/                   # Common types
│   ├── modules/                     # 35 business modules
│   │   ├── address/
│   │   ├── ai/
│   │   ├── ai-safety/
│   │   ├── ai-stylist/
│   │   ├── analytics/
│   │   ├── auth/
│   │   ├── brands/
│   │   ├── cache/
│   │   ├── cart/
│   │   ├── clothing/
│   │   ├── code-rag/
│   │   ├── community/
│   │   ├── customization/
│   │   ├── database/
│   │   ├── demo/
│   │   ├── favorites/
│   │   ├── health/
│   │   ├── merchant/
│   │   ├── metrics/
│   │   ├── notification/
│   │   ├── order/
│   │   ├── payment/
│   │   ├── photos/
│   │   ├── privacy/
│   │   ├── profile/
│   │   ├── queue/
│   │   ├── recommendations/
│   │   ├── search/
│   │   ├── style-profiles/
│   │   ├── subscription/
│   │   ├── try-on/
│   │   ├── users/
│   │   ├── weather/
│   │   └── ws/
│   └── types/                       # Backend-specific types
├── prisma/
│   ├── schema.prisma                # Database schema
│   ├── migrations/                  # Database migrations
│   ├── seed.ts                      # Database seeder
│   └── enhance-*.ts                 # Data enhancement scripts
├── test/                            # E2E tests
└── package.json
```

## Mobile (`apps/mobile/`)

```
apps/mobile/
├── src/
│   ├── components/                  # Reusable UI components
│   │   ├── aicompanion/             # AI companion UI
│   │   ├── clothing/                # Clothing display components
│   │   ├── common/                  # Generic shared components
│   │   ├── community/               # Social features
│   │   ├── filter/                  # Filter/sort components
│   │   ├── flows/                   # User flow components
│   │   ├── heartrecommend/          # Heart recommendation UI
│   │   ├── home/                    # Home screen components
│   │   ├── immersive/               # Immersive experience
│   │   ├── interactions/            # User interaction components
│   │   ├── layout/                  # Layout components
│   │   ├── loading/                 # Loading indicators
│   │   ├── onboarding/              # Onboarding flow
│   │   ├── primitives/              # Base UI primitives
│   │   ├── recommendations/         # Recommendation display
│   │   ├── screens/                 # Screen-level components
│   │   ├── search/                  # Search UI
│   │   ├── skeleton/                # Skeleton loading
│   │   ├── social/                  # Social features
│   │   ├── states/                  # State components
│   │   ├── theme/                   # Theme components
│   │   ├── transitions/             # Transition animations
│   │   ├── ui/                      # UI kit components
│   │   └── visualization/           # Data visualization
│   ├── config/                      # App configuration
│   ├── contexts/                    # React contexts
│   ├── hooks/                       # Custom hooks
│   ├── i18n/                        # Internationalization
│   ├── navigation/                  # Navigation config
│   ├── polyfills/                   # Polyfills
│   ├── screens/                     # 28 screen components
│   │   ├── HomeScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── WardrobeScreen.tsx
│   │   ├── HeartScreen.tsx
│   │   ├── CommunityScreen.tsx
│   │   ├── SearchScreen.tsx
│   │   ├── VirtualTryOnScreen.tsx
│   │   ├── AiStylistScreen.tsx
│   │   ├── AiStylistScreenV2.tsx
│   │   ├── CartScreen.tsx
│   │   ├── CheckoutScreen.tsx
│   │   ├── OrdersScreen.tsx
│   │   ├── OrderDetailScreen.tsx
│   │   ├── FavoritesScreen.tsx
│   │   ├── ClothingDetailScreen.tsx
│   │   ├── AddClothingScreen.tsx
│   │   ├── CustomizationScreen.tsx
│   │   ├── RecommendationsScreen.tsx
│   │   ├── RecommendationDetailScreen.tsx
│   │   ├── SubscriptionScreen.tsx
│   │   ├── NotificationsScreen.tsx
│   │   ├── NotificationSettingsScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── LegalScreen.tsx
│   │   ├── OnboardingScreen.tsx
│   │   └── OutfitDetailScreen.tsx
│   ├── services/                    # Service layer
│   │   ├── api/                     # API client
│   │   ├── ai/                      # AI services
│   │   └── speech/                  # Speech services
│   ├── stores/                      # Zustand stores
│   │   ├── clothingStore.ts
│   │   ├── wardrobeStore.ts
│   │   ├── uiStore.ts
│   │   └── index.ts
│   ├── theme/                       # Theme system
│   │   └── tokens/                  # Design tokens
│   ├── types/                       # TypeScript types
│   └── utils/                       # Utility functions
└── package.json
```

## ML Services (`ml/`)

```
ml/
├── config/                          # ML configuration
│   ├── algorithm_deployment_config.py
│   ├── model_training_config.py
│   └── paths.py
├── dataset_tools/                   # Data pipeline
│   ├── annotation_tool.py
│   ├── data_pipeline.py
│   ├── enhanced_data_pipeline.py
│   ├── generate_synthetic_data.py
│   └── process_kaggle_data.py
├── inference/                       # Model servers
│   ├── body_analysis_server.py
│   ├── catvton_server.py
│   ├── clothing_segmentation.py
│   ├── inference_service.py
│   ├── local_models.py
│   ├── outfit_aesthetic_scorer.py
│   ├── sasrec_server.py
│   ├── simple_tryon_server.py
│   └── trend_prediction.py
├── ip_adapter/                      # IP-Adapter implementation
│   ├── attention_processor.py
│   ├── ip_adapter.py
│   ├── resampler.py
│   └── utils.py
├── scripts/                         # Utility scripts
├── services/                        # ML services
│   └── code_rag/                    # Code RAG indexer
└── quick_start.py                   # Quick start script
```

## Key File Locations

| Purpose | Path |
|---------|------|
| Database schema | `apps/backend/prisma/schema.prisma` |
| API entry point | `apps/backend/src/main.ts` |
| Root module | `apps/backend/src/app.module.ts` |
| Auth module | `apps/backend/src/modules/auth/` |
| Try-on module | `apps/backend/src/modules/try-on/` |
| AI stylist | `apps/backend/src/modules/ai-stylist/` |
| Mobile navigation | `apps/mobile/src/navigation/` |
| Mobile stores | `apps/mobile/src/stores/` |
| Shared types | `packages/types/src/index.ts` |
| Docker stack | `docker-compose.yml` |
| K8s manifests | `k8s/*.yaml` |
| Prometheus config | `monitoring/prometheus/` |
| Grafana dashboards | `monitoring/grafana/` |

---
*Last updated: 2026-04-13*

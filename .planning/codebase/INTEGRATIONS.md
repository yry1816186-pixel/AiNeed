# Integrations

**Project:** 寻裳 (XunO)
**Last mapped:** 2026-04-16

## External APIs

| Integration | Purpose | Location |
|-------------|---------|----------|
| GLM API (智谱 AI) | Multi-modal AI: text-to-image, image-to-image, chat | `ml/services/ai_service.py`, `ml/services/stylist_prompts.py` |
| GLM Try-On | Virtual try-on image generation | `apps/backend/src/modules/try-on/services/glm-tryon.provider.ts` |
| Doubao Seedream | Alternative try-on provider | `apps/backend/src/modules/try-on/services/doubao-seedream.provider.ts` |
| WeChat OAuth | Social login (WeChat) | `apps/backend/src/modules/auth/services/wechat.service.ts` |
| SMS Service | Phone verification | `apps/backend/src/modules/auth/services/sms.service.ts` |
| Weather API | Weather-based styling | `apps/mobile/src/services/weatherService.ts`, `apps/backend/src/modules/weather/` |
| Alipay | Payment processing | `apps/backend/src/modules/payment/providers/alipay.provider.ts` |
| WeChat Pay | Payment processing | `apps/backend/src/modules/payment/providers/wechat.provider.ts` |
| Nodemailer | Email delivery | `apps/backend/src/common/email/email.service.ts` |
| HuggingFace Hub | Model downloads | `ml/requirements.txt` (huggingface-hub) |

## Databases

| Database | Purpose | Client | Connection |
|----------|---------|--------|------------|
| PostgreSQL 16 | Primary data store | Prisma Client 5.22 | `apps/backend/prisma/schema.prisma` |
| Redis 7 | Cache, sessions, queues | ioredis 5.3 | `apps/backend/src/common/redis/` |
| Neo4j | Knowledge graph (recommendations) | neo4j-driver 6.0 | `apps/backend/src/modules/recommendations/services/neo4j.service.ts` |
| Qdrant | Vector similarity search | @qdrant/js-client-rest 1.17 | `apps/backend/src/modules/recommendations/services/qdrant.service.ts` |

## Object Storage

| Service | Purpose | Client | Location |
|---------|---------|--------|----------|
| MinIO | User photos, try-on results, assets | minio 7.1.3 | `apps/backend/src/common/storage/storage.service.ts` |

## Real-time Communication

| Protocol | Purpose | Library | Location |
|----------|---------|---------|----------|
| WebSocket | Chat, notifications, real-time updates | Socket.IO | `apps/backend/src/common/gateway/`, `apps/mobile/src/services/websocket.ts` |

## Monitoring & Observability

| Service | Purpose | Library | Location |
|---------|---------|---------|----------|
| Sentry | Error tracking, performance | @sentry/node, @sentry/react-native | `apps/backend/src/common/sentry/`, `apps/mobile/src/services/sentry.ts` |
| Prometheus | Metrics collection | prom-client, @willsoto/nestjs-prometheus | `apps/backend/src/modules/metrics/` |
| Grafana Loki | Log aggregation | loki.yml | `infrastructure/loki/` |

## Authentication Providers

| Provider | Strategy | Location |
|----------|----------|----------|
| Email/Password | passport-local | `apps/backend/src/modules/auth/strategies/local.strategy.ts` |
| JWT | passport-jwt | `apps/backend/src/modules/auth/strategies/jwt.strategy.ts` |
| WeChat | Custom strategy | `apps/backend/src/modules/auth/strategies/wechat.strategy.ts` |
| SMS OTP | Custom guard | `apps/backend/src/modules/auth/guards/sms-throttle.guard.ts` |

## Internal Service Communication

| From | To | Protocol | Purpose |
|------|----|----------|---------|
| Mobile | Backend API | REST (axios) | All API calls |
| Mobile | Backend WS | WebSocket (Socket.IO) | Chat, real-time |
| Backend | ML Service | HTTP (axios) | AI inference requests |
| Backend | GLM API | HTTPS | AI model calls |
| Backend | MinIO | S3 API | File storage |
| Backend | Redis | Redis protocol | Cache, queue |
| Backend | PostgreSQL | PostgreSQL wire | Data persistence |
| Backend | Neo4j | Bolt protocol | Knowledge graph |
| Backend | Qdrant | HTTP | Vector search |

## Feature Flags

| System | Purpose | Location |
|--------|---------|----------|
| Custom Feature Flags | A/B testing, gradual rollout | `apps/backend/src/modules/feature-flags/`, `apps/mobile/src/contexts/FeatureFlagContext.tsx` |

## Push Notifications

| Service | Purpose | Location |
|---------|---------|----------|
| Custom Push Service | Mobile push notifications | `apps/backend/src/modules/notification/services/push-notification.service.ts`, `apps/mobile/src/services/push-notification.service.ts` |

# Stack

**Project:** 寻裳 (XunO) — AI 驱动的私人形象定制平台
**Last mapped:** 2026-04-16

## Languages & Runtimes

| Language | Version | Where Used |
|----------|---------|------------|
| TypeScript | 5.7.x | Backend, Mobile, Admin, Shared packages |
| Python | 3.11+ | AI/ML service (FastAPI) |
| Kotlin/Java | — | Android native (mobile) |
| Swift/Obj-C | — | iOS native (mobile) |
| ArkTS | — | HarmonyOS (apps/harmony) |

## Backend Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | NestJS | 11.x |
| ORM | Prisma | 5.22.x |
| Database | PostgreSQL | 16 |
| Cache | Redis | 7 (ioredis 5.3) |
| Object Storage | MinIO | RELEASE.2024-11-07 |
| Auth | JWT + Passport | @nestjs/jwt 11, passport 0.7 |
| Queue | BullMQ | 5.71.x |
| WebSocket | Socket.IO | @nestjs/platform-socket.io 11 |
| Validation | class-validator + Zod | 0.14 / 3.22 |
| API Docs | Swagger | @nestjs/swagger 11.2 |
| Rate Limiting | @nestjs/throttler | 6.5 |
| Logging | Pino | 10.3 |
| Monitoring | Sentry + Prometheus | @sentry/node 10.48, prom-client 15.1 |
| Email | Nodemailer | 7.0 |
| Image Processing | Sharp | 0.33 |
| Graph DB | Neo4j | neo4j-driver 6.0 |
| Vector DB | Qdrant | @qdrant/js-client-rest 1.17 |
| Encryption | AES-256-GCM (PII) | — |
| Security | Helmet, bcryptjs | 7.1 / 2.4 |

## Mobile Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React Native | 0.76.8 |
| Expo SDK | Expo | 52 (partial) |
| Navigation | React Navigation 6 | @react-navigation 6.x |
| State | Zustand | 5.0.5 |
| Server State | TanStack Query | 5.81 |
| UI Library | React Native Paper | 5.12 |
| Animations | Reanimated | 3.16.7 (locked) |
| Gestures | Gesture Handler | 2.20 |
| SVG | react-native-svg | 15.8.0 (locked) |
| Screens | react-native-screens | 4.4.0 (locked) |
| Lists | @shopify/flash-list | 2.3 |
| Secure Storage | expo-secure-store | 14.2.4 |
| Auth Storage | react-native-encrypted-storage | 4.0 |
| Image Picker | react-native-image-picker | 7.1 |
| Haptics | react-native-haptic-feedback | 2.3 |
| Monitoring | Sentry | @sentry/react-native 6.9 |
| WebSocket | socket.io-client | 4.7 |
| i18n | Custom (src/i18n) | — |
| Styling | Tailwind (NativeWind) + Theme tokens | — |

## Admin Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React + Vite | — |
| Language | TypeScript | 5.x |
| Routing | React Router (src/router) | — |

## AI/ML Service Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | FastAPI | 0.100-0.116 |
| AI Provider | GLM API (智谱 AI) | Cloud-based |
| ML Runtime | ONNX Runtime | 1.16+ |
| NLP | Transformers, Sentence-Transformers | 4.30+ / 2.2+ |
| Vector Search | Qdrant Client | 1.7+ |
| Chinese NLP | jieba | 0.42+ |
| Reranker | FlagEmbedding (BGE) | 1.2+ |
| Clustering | scikit-learn | 1.3+ |
| Task Queue | Redis (async) | 5.0+ |
| Monitoring | Prometheus Client | 0.18+ |

## Shared Packages

| Package | Purpose |
|---------|---------|
| `@xuno/types` | Shared TypeScript type definitions |
| `@xuno/shared` | Shared utilities and API types |

## Infrastructure

| Service | Technology | Port |
|---------|-----------|------|
| Backend API | NestJS | 3001 |
| Metro Bundler | React Native CLI | 8081 |
| PostgreSQL | postgres:16-alpine | 5432 |
| Redis | redis:7-alpine | 6379 |
| MinIO | minio/minio | 9000/9001 |
| Neo4j | — | 7687 |
| Nginx | nginx (reverse proxy) | 80/443 |
| Loki | Grafana Loki | 3100 |
| K8s | Kubernetes manifests | k8s/ |

## Build & Dev Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ (v24 current) | Runtime |
| pnpm | 8.15.0 | Package manager (monorepo) |
| Docker | 20.10+ | Containerization |
| Prisma CLI | 5.22 | DB schema & migrations |
| ESLint | 8.x | Linting (all packages) |
| Prettier | 3.8 | Formatting |
| Jest | 29.7 | Testing |
| Detox | — | E2E mobile testing |

## Locked Dependencies (Cannot Upgrade)

- `react-native-screens` 4.4.0
- `react-native-reanimated` 3.16.7
- `react-native-svg` 15.8.0

These are pinned due to compatibility issues with React Native 0.76.8.

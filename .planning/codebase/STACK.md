# Codebase Map: Technology Stack

**Mapped:** 2026-04-13
**Project:** AiNeed - 智能私人形象定制与服装设计助手平台

## Languages & Runtime

| Language | Version | Usage |
|----------|---------|-------|
| TypeScript | ^6.0.2 (root), ^5.0.4 (mobile) | Primary language for backend + mobile |
| Python | 3.11+ | ML services, inference servers, data pipelines |
| SQL | PostgreSQL 16 | Database schema, migrations |
| YAML | Docker Compose, K8s manifests | Infrastructure config |

**Runtime:**
- Node.js >=20.0.0
- pnpm 8.15.0 (workspace monorepo)
- React Native 0.76.8 (mobile)
- NestJS 11.x (backend)

## Backend Stack

**Framework:** NestJS 11.x (`apps/backend/`)

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Framework | @nestjs/core | ^11.1.0 | HTTP server, DI, modules |
| ORM | Prisma | ^5.22.0 | Database schema, queries, migrations |
| Database | PostgreSQL | 16-alpine | Primary data store |
| Cache | Redis (ioredis) | ^5.3.2 | Session, caching, rate limiting |
| Queue | BullMQ | ^5.71.0 | Background job processing |
| Auth | Passport + JWT | passport-jwt ^4.0.1 | Authentication |
| Validation | class-validator + Zod | ^0.14.1 / ^3.22.4 | Input validation |
| API Docs | @nestjs/swagger | ^11.2.0 | OpenAPI/Swagger documentation |
| WebSocket | socket.io | ^4.6.1 | Real-time communication |
| Monitoring | Prometheus + Grafana | prom-client ^15.1.0 | Metrics collection |
| Search | Qdrant | @qdrant/js-client-rest ^1.17.0 | Vector search (Code RAG) |
| Storage | MinIO | minio ^7.1.3 | Object storage |
| Email | Nodemailer | ^7.0.7 | Email delivery |
| Security | Helmet, csurf, bcryptjs | Multiple | HTTP security, CSRF, password hashing |
| Image | Sharp | ^0.33.2 | Image processing |
| Resilience | Opossum | ^8.1.4 | Circuit breaker pattern |
| HTTP Client | Axios | ^1.13.6 | External API calls |
| Schedule | @nestjs/schedule | ^6.0.0 | Cron jobs, task scheduling |

## Mobile Stack

**Framework:** React Native 0.76.8 (`apps/mobile/`)

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Framework | React Native | 0.76.8 | Cross-platform mobile |
| UI Library | React Native Paper | ^5.12.0 | Material Design components |
| Navigation | React Navigation 6 | ^6.1.18 | Screen navigation, bottom tabs |
| State | Zustand | ^5.0.5 | Global state management |
| Data Fetching | TanStack Query | ^5.81.0 | Server state, caching |
| Animations | Reanimated | 3.16.7 | Smooth animations |
| Gesture | Gesture Handler | ^2.20.2 | Touch interactions |
| HTTP | Axios | ^1.12.2 | API client |
| Storage | Encrypted Storage | ^4.0.3 | Secure local storage |
| Error Tracking | Sentry | 6.9.0 | Crash reporting |
| Date | date-fns | ^4.1.0 | Date formatting |

## Shared Packages

| Package | Purpose |
|---------|---------|
| `packages/types` | Shared TypeScript type definitions (tsup build, CJS+ESM) |
| `packages/shared` | Shared utilities (tsc build) |

## ML/AI Stack

**Location:** `ml/`

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Virtual Try-On | CatVTON | AI-powered virtual clothing try-on |
| Body Analysis | Custom model | Body shape analysis |
| Clothing Segmentation | Custom model | Garment segmentation from images |
| Recommendation | SASRec | Sequential recommendation model |
| Trend Prediction | Custom model | Fashion trend forecasting |
| Embeddings | sentence-transformers | Text/code embeddings |
| Vector DB | Qdrant | Code RAG semantic search |
| Aesthetic Scoring | Custom model | Outfit aesthetic evaluation |
| IP-Adapter | Custom implementation | Image prompt adapter |

## Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Containers | Docker + Docker Compose | Local development, deployment |
| Orchestration | Kubernetes | Production deployment |
| Monitoring | Prometheus + Grafana + Alertmanager | Observability stack |
| CI/CD | GitHub Actions | Automated builds, tests |
| Object Storage | MinIO | S3-compatible file storage |

## Build Tools

| Tool | Version | Purpose |
|------|---------|---------|
| pnpm | 8.15.0 | Workspace monorepo management |
| NestJS CLI | ^11.0.16 | Backend scaffolding |
| tsup | ^8.0.2 | Shared types build |
| Jest | ^29.7.0 | Testing (backend + mobile) |
| ESLint | ^8.x | Code linting |
| Prettier | ^2.8.8 / ^3.8.1 | Code formatting |
| TypeScript | ^5.0.4 / ^6.0.2 | Type checking |

## Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| `package.json` | Root | Monorepo workspace config |
| `pnpm-workspace.yaml` | Root | Workspace package definitions |
| `.env.example` | Root | Environment template |
| `.env.security.example` | Root | Security-focused env template |
| `docker-compose.yml` | Root | Full stack Docker setup |
| `docker-compose.dev.yml` | Root | Development Docker setup |
| `prisma/schema.prisma` | `apps/backend/` | Database schema |
| `tsconfig.json` | Multiple | TypeScript configuration |
| `.prettierrc` | Root | Code formatting rules |
| `CLAUDE.md` | Root | Claude Code instructions |

---
*Last updated: 2026-04-13*

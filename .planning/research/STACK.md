# Stack Research

**Domain:** AI Fashion Recommendation Platform (Mobile)
**Researched:** 2026-04-29
**Confidence:** HIGH (existing codebase verified)

## Recommended Stack

### Core Technologies

| Technology     | Version          | Purpose               | Why Recommended                                                 |
| -------------- | ---------------- | --------------------- | --------------------------------------------------------------- |
| React Native   | 0.76.8 (Expo 52) | Mobile cross-platform | Expo managed workflow, OTA updates, mature ecosystem            |
| NestJS         | 11.x             | Backend API           | Enterprise-grade TypeScript framework, decorator-based, modular |
| Prisma         | 5.x              | ORM + Migrations      | Type-safe queries, schema-first, auto-generated types           |
| PostgreSQL     | 16               | Primary database      | JSON support, full-text search, reliable RDBMS                  |
| Redis          | 7                | Cache + Queue         | Session store, recommendation cache, transient data             |
| MinIO          | Latest           | Object storage        | S3-compatible, self-hosted, image/asset storage                 |
| BullMQ         | Latest           | Job queue             | Redis-backed, reliable for async AI tasks                       |
| Python/FastAPI | 3.11+            | AI Service Layer      | ML ecosystem, async support, GLM SDK integration                |
| Turborepo      | 2.5.x            | Monorepo build        | Caching, parallel builds, dependency-aware                      |
| pnpm           | 8.x              | Package manager       | Disk-efficient, strict dependency resolution                    |

### Frontend Libraries

| Library              | Version         | Purpose             | When to Use                              |
| -------------------- | --------------- | ------------------- | ---------------------------------------- |
| React Navigation     | 6.x             | Navigation          | Tab + stack navigation                   |
| Zustand              | Latest          | State management    | Lightweight global state                 |
| TanStack Query       | Latest          | Server state        | API caching, refetch, optimistic updates |
| React Native Paper   | Latest          | UI components       | Material Design consistent components    |
| Reanimated           | 3.16.7 (locked) | Animations          | Complex gesture/transition animations    |
| react-native-screens | 4.4.0 (locked)  | Screen optimization | Native screen containers                 |

### AI/ML Services

| Library             | Version    | Purpose                  | When to Use                         |
| ------------------- | ---------- | ------------------------ | ----------------------------------- |
| GLM-4-Flash         | Latest API | Multi-modal generation   | Primary LLM for outfit reasoning    |
| Qwen                | Latest API | Fallback LLM             | When GLM unavailable                |
| FashionCLIP         | Latest     | Visual similarity        | Garment layout scoring              |
| Marqo-FashionSigLIP | Latest     | Bias-reduced alternative | Phase 6 replacement for FashionCLIP |
| Edge-TTS            | Latest     | Voice synthesis          | Yiyi voice responses                |

### Development Tools

| Tool           | Purpose           | Notes                         |
| -------------- | ----------------- | ----------------------------- |
| Husky          | Git hooks         | Pre-commit linting            |
| commitlint     | Commit convention | Conventional commits enforced |
| Prettier       | Code formatting   | Consistent style              |
| TypeScript 5.x | Type checking     | Shared across monorepo        |

## Alternatives Considered

| Recommended  | Alternative     | When to Use Alternative               |
| ------------ | --------------- | ------------------------------------- |
| NestJS       | Express/Fastify | Simpler projects without DDD needs    |
| Prisma       | TypeORM         | If team prefers Active Record pattern |
| React Native | Flutter         | If iOS design fidelity is critical    |
| GLM-4-Flash  | GPT-4o          | If budget allows higher cost          |

## What NOT to Use

| Avoid                        | Why                               | Use Instead                           |
| ---------------------------- | --------------------------------- | ------------------------------------- |
| LangChain                    | Over-abstracted for LLM calls     | Direct GLM SDK + custom prompt chains |
| Redux                        | Boilerplate-heavy for mobile      | Zustand                               |
| MongoDB                      | Schema-flexible but query-limited | PostgreSQL (JSON fields when needed)  |
| react-native-screens > 4.4.0 | Breaking changes in navigation    | Locked at 4.4.0                       |

## Stack Patterns by Variant

**If offline-first needed:**

- Use WatermelonDB + SQLite local cache
- Because network unreliable in demo scenarios

**If scaling to 10k+ users:**

- Add read replica PostgreSQL
- Because recommendation queries are read-heavy

## Version Compatibility

| Package A                  | Compatible With   | Notes                          |
| -------------------------- | ----------------- | ------------------------------ |
| react-native-screens@4.4.0 | reanimated@3.16.7 | Locked pair - do not upgrade   |
| NestJS 11.x                | Prisma 5.x        | Both use TypeScript 5.x target |
| Expo 52                    | RN 0.76.8         | Expo SDK bundled               |

## Sources

- Existing codebase (`apps/`, `ml/`, `packages/`)
- `CLAUDE.md` — project context
- `README.md` — stack overview

---

_Stack research for: AI Fashion Recommendation_
_Researched: 2026-04-29_

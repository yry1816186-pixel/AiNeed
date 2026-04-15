# Phase 0: 基础设施 & 测试基线 - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

建立工程基础设施，确保后续开发有质量保障和自动化支撑。包括：CI/CD Pipeline、测试框架配置、错误追踪(Sentry)、日志策略、数据库迁移策略、环境配置分离、API 响应格式统一、Git 分支策略、Docker Compose 生产配置。

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key decisions pre-made by project:
- CI/CD: GitHub Actions
- Error tracking: Sentry
- Logging: Winston/Pino (JSON format, request tracing ID)
- DB migration: Prisma migrate (not db push)
- API format: JSON:API specification
- Testing: Jest (backend), Jest + RNTL (mobile)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Docker Compose dev config exists at docker-compose.dev.yml
- Prisma schema at apps/backend/prisma/schema.prisma
- 35 backend modules at apps/backend/src/modules/
- Jest config exists in apps/backend
- Test pass rate currently 94.7% (825/871)

### Established Patterns
- NestJS modular architecture
- BullMQ for async tasks
- JWT + Passport for auth
- PrismaEncryptionMiddleware for PII

### Integration Points
- GitHub repository for CI/CD
- Sentry DSN needed for error tracking
- Docker Compose for production deployment

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>

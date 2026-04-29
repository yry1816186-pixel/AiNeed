---
phase: 22-kai-fang-api-nei-bu-jia-gou-yan-zheng
plan: 02
subsystem: api, rate-limiting
tags: [redis, sorted-set, sliding-window, rate-limit, nestjs, partner-api]

requires:
  - phase: 22-01
    provides: "PartnerAuthGuard and PartnerApiKeyGuard for auth pipeline"
provides:
  - "Redis sliding-window rate limiting with 429 + Retry-After"
  - "5 Partner API forwarding endpoints (recommendation, try-on, body-analysis, color-analysis, wardrobe/tagging)"
  - "PartnerApiLogService for call logging to PartnerApiCallLog table"
affects: [22-03]

tech-stack:
  added: []
  patterns: [redis-sliding-window-rate-limit, forwarding-controller]

key-files:
  created:
    - apps/backend/src/domains/platform/partner-api/guards/partner-rate-limit.guard.ts
    - apps/backend/src/domains/platform/partner-api/services/partner-api-log.service.ts
    - apps/backend/src/domains/platform/partner-api/dto/partner-api.dto.ts
    - apps/backend/src/domains/platform/partner-api/partner-api.controller.ts
  modified:
    - apps/backend/src/domains/platform/partner-api/partner-api.module.ts

key-decisions:
  - "Used Redis sorted set pipeline (zremrangebyscore + zadd + zcard + expire) for atomic sliding window"
  - "Controller-level @UseGuards(PartnerAuthGuard, PartnerRateLimitGuard) applies auth then rate limit"
  - "Each endpoint records startTime and logs in finally block for accurate responseTime tracking"

requirements-completed: [OAPI-03, OAPI-04]

duration: 3min
completed: 2026-04-29
---

# Phase 22 Plan 02: Redis Rate Limiting + 5 Partner API Endpoints Summary

**Redis sorted set sliding-window rate limiter + 5 POST forwarding endpoints with per-key limits and call logging**

## Performance

- **Duration:** 3 min
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- PartnerRateLimitGuard: Redis sorted set sliding window with configurable per-key rate limits
- 429 + Retry-After header on rate limit exceeded
- 5 POST endpoints: /partner/recommendation, /partner/try-on, /partner/body-analysis, /partner/color-analysis, /partner/wardrobe/tagging
- Each endpoint forwards to existing internal services (orchestrator, TryOnService, AIIntegrationService, ClothingService)
- PartnerApiLogService records every call with responseTime, statusCode, endpoint, IP

## Task Commits

1. **Task 1: Rate limit guard + log service** - `8cdd70fa` (feat)
2. **Task 2: Controller + DTOs** - `8cdd70fa` (feat, same commit)

## Files Created/Modified

- `apps/backend/src/domains/platform/partner-api/guards/partner-rate-limit.guard.ts` - Redis sorted set sliding window guard
- `apps/backend/src/domains/platform/partner-api/services/partner-api-log.service.ts` - Call logging service
- `apps/backend/src/domains/platform/partner-api/dto/partner-api.dto.ts` - 5 DTOs with Swagger decorators
- `apps/backend/src/domains/platform/partner-api/partner-api.controller.ts` - 5 POST endpoints with auth + rate limit guards
- `apps/backend/src/domains/platform/partner-api/partner-api.module.ts` - Updated with all imports (RecommendationsModule, TryOnModule, AIModule, ClothingModule)

## Decisions Made

- Used `REDIS_KEY_PREFIX` + `REDIS_KEY_SEPARATOR` for Redis key construction since `RedisKeyBuilder.buildKey` is private
- DTO properties use `!` definite assignment assertion to satisfy strict TypeScript mode
- Each endpoint wraps service call in try/catch/finally for accurate response time measurement

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

- Complete Partner API pipeline (auth → rate limit → forward → log) ready for integration testing
- OpenAPI documentation and seed script needed (Plan 22-03)

---

_Phase: 22-kai-fang-api-nei-bu-jia-gou-yan-zheng_
_Completed: 2026-04-29_

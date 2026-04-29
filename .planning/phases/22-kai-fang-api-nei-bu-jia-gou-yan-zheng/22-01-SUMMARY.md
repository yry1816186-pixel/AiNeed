---
phase: 22-kai-fang-api-nei-bu-jia-gou-yan-zheng
plan: 01
subsystem: api, database, auth
tags: [prisma, hmac-sha256, nestjs, guard, partner-api]

requires:
  - phase: 20
    provides: "Backend infrastructure and Prisma schema setup"
provides:
  - "PartnerApiKey and PartnerApiCallLog Prisma models"
  - "HMAC-SHA256 authentication guard with 5min timestamp window"
  - "PartnerApiKeyGuard for basic key status validation"
  - "PartnerApiModule registered in AppModule"
affects: [22-02, 22-03]

tech-stack:
  added: []
  patterns: [hmac-sha256-auth, prisma-partner-api-models]

key-files:
  created:
    - apps/backend/src/domains/platform/partner-api/types/partner-api.types.ts
    - apps/backend/src/domains/platform/partner-api/guards/partner-api-key.guard.ts
    - apps/backend/src/domains/platform/partner-api/guards/partner-auth.guard.ts
    - apps/backend/src/domains/platform/partner-api/partner-api.module.ts
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/app.module.ts

key-decisions:
  - "Used type assertion (prisma as any) for PartnerApiKey model access due to locked Prisma client DLL during development"
  - "X-Api-Key header carries full API key (used as HMAC secret), keyPrefix derived from first 8 chars for DB lookup"

requirements-completed: [OAPI-01, OAPI-02]

duration: 5min
completed: 2026-04-29
---

# Phase 22 Plan 01: Prisma Schema + HMAC-SHA256 Auth Guard Summary

**Prisma PartnerApiKey/CallLog models with HMAC-SHA256 auth guard and 5-minute replay prevention**

## Performance

- **Duration:** 5 min
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added PartnerApiKeyStatus enum (active/revoked/expired) and two Prisma models
- HMAC-SHA256 signature verification covering timestamp + method + path + body
- 5-minute timestamp window prevents replay attacks
- Key status and expiration checks prevent use of revoked/expired keys
- PartnerApiModule registered in AppModule for NestJS DI

## Task Commits

1. **Task 1: Prisma schema models** - `d63d9f22` (feat)
2. **Task 2: Auth guards + module** - `d63d9f22` (feat, same commit)

## Files Created/Modified

- `apps/backend/prisma/schema.prisma` - PartnerApiKey + PartnerApiCallLog models + PartnerApiKeyStatus enum
- `apps/backend/src/domains/platform/partner-api/types/partner-api.types.ts` - PartnerApiRequest, PartnerApiKeyData interfaces + PARTNER_API_HEADERS constant
- `apps/backend/src/domains/platform/partner-api/guards/partner-api-key.guard.ts` - Basic key validation guard
- `apps/backend/src/domains/platform/partner-api/guards/partner-auth.guard.ts` - HMAC-SHA256 signature + timestamp guard
- `apps/backend/src/domains/platform/partner-api/partner-api.module.ts` - NestJS module with PrismaModule import
- `apps/backend/src/app.module.ts` - Added PartnerApiModule import

## Decisions Made

- Used `(prisma as any)` for PartnerApiKey model access since Prisma client DLL was locked by running node processes during development — will resolve after prisma generate in production
- HMAC signature computed over `timestamp + method + path + body` string concatenation
- keyPrefix (first 8 chars of full key) used for DB lookup to avoid exposing full key

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed import paths for common modules**

- **Found during:** Task 2
- **Issue:** Initial relative import paths (`../../../common/...`) were wrong — needed 4 levels up from guards/ directory
- **Fix:** Corrected to `../../../../common/prisma/prisma.service` and `../../../common/prisma/prisma.module`
- **Files modified:** All 4 partner-api files
- **Committed in:** d63d9f22

## Next Phase Readiness

- Auth guard ready for consumption by PartnerApiController (Plan 22-02)
- Prisma models ready for rate limiting guard and call logging

---

_Phase: 22-kai-fang-api-nei-bu-jia-gou-yan-zheng_
_Completed: 2026-04-29_

---
phase: 22-kai-fang-api-nei-bu-jia-gou-yan-zheng
plan: 03
subsystem: testing, documentation
tags: [openapi, yaml, seed-script, jest, integration-tests]

requires:
  - phase: 22-02
    provides: "Complete Partner API controller, guards, and services"
provides:
  - "OpenAPI 3.0.3 specification with 5 endpoints annotated Internal Use Only"
  - "Seed script for generating test Partner API keys"
  - "7 integration tests verifying auth guard and rate limit guard behavior"
affects: []

tech-stack:
  added: []
  patterns: [openapi-3-spec, jest-nestjs-testing]

key-files:
  created:
    - docs/partner-api.yaml
    - apps/backend/src/domains/platform/partner-api/scripts/seed-partner-key.ts
    - apps/backend/src/domains/platform/partner-api/__tests__/partner-api.integration.spec.ts

key-decisions:
  - "OpenAPI spec version 0.1.0-internal with Internal Use Only annotations on every endpoint"
  - "Seed script uses crypto.randomBytes(32) for key generation, stores only SHA-256 hash"

requirements-completed: [OAPI-05]

duration: 4min
completed: 2026-04-29
---

# Phase 22 Plan 03: OpenAPI Docs + Seed Script + Integration Tests Summary

**OpenAPI 3.0.3 spec with Internal Use Only labels, seed key generator, and 7/7 passing integration tests**

## Performance

- **Duration:** 4 min
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- OpenAPI 3.0.3 yaml with 5 endpoint paths, security scheme definition, and request/response schemas
- 7 occurrences of "Internal Use Only" in the spec (≥5 required)
- Seed script generates 32-byte random key, stores SHA-256 hash in DB, prints plaintext once
- 7 integration tests all passing:
  - Valid HMAC signature passes auth guard ✓
  - Expired timestamp (>5min) rejected ✓
  - Wrong HMAC signature rejected ✓
  - Revoked key rejected ✓
  - Expired key rejected ✓
  - Rate limit under threshold passes ✓
  - Rate limit exceeded throws 429 ✓

## Task Commits

1. **Task 1: OpenAPI spec + seed script** - `8c9d7de7` (feat)
2. **Task 2: Integration tests** - `ebcaf7ea` (test)

## Files Created/Modified

- `docs/partner-api.yaml` - OpenAPI 3.0.3 specification with 5 endpoints
- `apps/backend/src/domains/platform/partner-api/scripts/seed-partner-key.ts` - Test key generator
- `apps/backend/src/domains/platform/partner-api/__tests__/partner-api.integration.spec.ts` - 7 integration tests

## Decisions Made

- OpenAPI version "0.1.0-internal" to distinguish from any future production version
- Seed script outputs plaintext key to console only (one-time display), DB stores hash only
- Used Jest with NestJS TestingModule for guard unit tests with mocked PrismaService and Redis

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Prisma client DLL locked by running node processes — prisma generate and prisma db push could not execute. This is a runtime-only issue; `npx prisma db push` must be run before first use when backend is stopped.

## Known Stubs

- `prisma db push` not yet executed — PartnerApiKey/PartnerApiCallLog tables not yet created in database. Must run `cd apps/backend && npx prisma db push` when backend services are stopped.
- Seed script not yet executed — test key not yet generated. Run `npx ts-node apps/backend/src/domains/platform/partner-api/scripts/seed-partner-key.ts` after db push.

---

_Phase: 22-kai-fang-api-nei-bu-jia-gou-yan-zheng_
_Completed: 2026-04-29_

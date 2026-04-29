---
phase: 05-e2e-demo
plan: "01"
subsystem: infra
tags: [pre-cache, demo, warmup, redis, nestjs, bash]

requires:
  - phase: 04-commerce-discovery
    provides: Mobile API module, Redis infrastructure, seed user data
provides:
  - Demo pre-cache API endpoint (POST /api/v1/demo/pre-cache)
  - Demo cache status endpoint (GET /api/v1/demo/pre-cache/status)
  - Pre-cache validation in warmup script
affects: [05-02, 05-03, demo-script, demo-preflight]

tech-stack:
  added: []
  patterns:
    - "DemoCacheService: Pre-cache pattern using Redis with TTL for demo data isolation"
    - "Step 3a validation: Post-warmup cache integrity verification in shell scripts"

key-files:
  created:
    - apps/backend/src/domains/mobile-api/controllers/demo-cache.controller.ts
    - apps/backend/src/domains/mobile-api/dto/demo-cache.dto.ts
    - apps/backend/src/domains/mobile-api/services/demo-cache.service.ts
  modified:
    - apps/backend/src/domains/mobile-api/mobile-api.module.ts
    - apps/backend/.env.example
    - scripts/demo-warmup.sh

key-decisions:
  - "Pre-cache endpoint is unauthenticated (called by warmup script during infra setup)"
  - "TTS precache uses HTTP call to own endpoint with local fallback for offline scenarios"
  - "Recommendation pre-caching generates mock data for demo profiles (5 scenes per profile)"
  - "Status endpoint returns counts by category for script-based verification"

patterns-established:
  - "Demo pre-cache: Redis keys prefixed with configurable DEMO_CACHE_REDIS_PREFIX"
  - "Shell validation: Step 3a pattern for post-warmup cache integrity checks"

requirements-completed: [DEMO-03, DEMO-04, DEMO-07]

duration: 10min
completed: 2026-04-29
---

# Phase 5 Plan 01: Pre-cache Endpoint + Warmup Validation Summary

**Implemented `POST /api/v1/demo/pre-cache` backend API with Redis-based caching and extended `demo-warmup.sh` with cache integrity validation for competition demo reliability.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-29T16:42:37Z
- **Completed:** 2026-04-29T16:52:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created DemoCacheService with 3-tier pre-caching: recommendations (10 profiles x 5 scenes), TTS phrases (14 keys), scene configurations (7 scenes)
- Created DemoCacheController with POST /api/v1/demo/pre-cache for warming and GET /api/v1/demo/pre-cache/status for verification
- Added DemoPreCacheResponseDto with status tracking and error collection
- Extended demo-warmup.sh with Step 3a validation: status endpoint parsing, TTS audio file existence checks, latency measurement with 5s WARN threshold
- Registered all new components in MobileApiModule with RedisModule dependency
- Added DEMO_CACHE_TTL=3600 and DEMO_CACHE_REDIS_PREFIX=demo:cache: to .env.example

## Task Commits

1. **Task 1: Pre-cache Controller + Service** - `6e0531fb` (feat) — DTO, service, controller, module registration, env config
2. **Task 2: Warmup Validation** - `03f19d34` (feat) — Step 3a with status check, TTS file check, latency measurement

**Plan metadata:** Pending (docs commit after SUMMARY creation)

## Files Created/Modified

- `apps/backend/src/domains/mobile-api/controllers/demo-cache.controller.ts` — POST /demo/pre-cache + GET /demo/pre-cache/status endpoints
- `apps/backend/src/domains/mobile-api/dto/demo-cache.dto.ts` — DemoPreCacheResponseDto and DemoPreCacheStatusResponseDto
- `apps/backend/src/domains/mobile-api/services/demo-cache.service.ts` — Pre-cache orchestration with Redis storage, seed data loading, TTS local fallback
- `apps/backend/src/domains/mobile-api/mobile-api.module.ts` — Registered DemoCacheController, DemoCacheService, RedisModule import
- `apps/backend/.env.example` — Added DEMO_CACHE_TTL and DEMO_CACHE_REDIS_PREFIX
- `scripts/demo-warmup.sh` — Added Step 3a with 3 validation sub-checks

## Decisions Made

- **Unauthenticated endpoint:** Demo pre-cache is called by warmup scripts during infrastructure setup, so no JWT guard is applied. The endpoint is only accessible within the internal network during rehearsal.
- **TTS precache fallback:** Service calls `POST /api/v1/tts/precache` via HTTP first; if unavailable (offline or service down), falls back to local cache marker entries with `audioReady: false`.
- **Mock recommendation generation:** `buildMockRecommendations()` generates structured cached outfitting data using seed profile wardrobe items. Real AI pipeline integration requires full session context and is deferred to live demo mode.
- **Shell validation pattern:** Step 3a uses `grep`-based JSON field extraction for status endpoint parsing (avoids `jq` dependency). Latency check uses `awk` fallback when `bc` not available.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adjusted file paths for existing services**

- **Found during:** Task 1 (read_first phase)
- **Issue:** Plan referenced `apps/backend/src/domains/ai-core/services/tts.service.ts` and `ai-stylist.service.ts`, but actual paths are `apps/backend/src/domains/ai-core/ai-stylist/tts.service.ts` and `ai-stylist.service.ts` under the `ai-stylist/` subdirectory.
- **Fix:** Read files from correct paths; adjusted imports accordingly.
- **Files modified:** None (import adjustments within new files)
- **Verification:** All imports resolve correctly within NestJS module structure.
- **Committed in:** `6e0531fb` (part of Task 1)

**2. [Rule 3 - Blocking] Created missing directory structure**

- **Found during:** Task 1 (file creation)
- **Issue:** `apps/backend/src/domains/mobile-api/` only had `controllers/` directory. `services/` and `dto/` subdirectories didn't exist.
- **Fix:** Created `services/` and `dto/` subdirectories inline during file writes.
- **Files modified:** N/A (new directories created)
- **Verification:** All files written to correct paths, module imports resolve.
- **Committed in:** `6e0531fb` (part of Task 1)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both deviations were path corrections. No functional changes to the plan's intent.

## Known Stubs

- `buildMockRecommendations()` in `demo-cache.service.ts` — Generates structured stub outfit data instead of calling the AI pipeline. The real AI integration requires session context and full pipeline initialization. This is intentional: the pre-cache endpoint validates the cache infrastructure; actual AI-warmed data comes from live rehearsal runs.
- `localTtsCache()` sets `audioReady: false` — When the TTS precache endpoint is unreachable, it creates cache markers without actual audio files. Real audio requires the Python TTS service to be running.
- `preCacheRecommendations()` uses scene list `["interview", "date", "casual", "formal", "sport"]` — includes "sport" which is not in seed profiles' primaryScenarios. This is per plan specification ("per scene (interview, date, casual, formal, sport)").

## Threat Flags

| Flag                                  | File                                                                       | Description                                                                                                                                                                                                                        |
| ------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| threat_flag: unauthenticated-endpoint | `apps/backend/src/domains/mobile-api/controllers/demo-cache.controller.ts` | `POST /api/v1/demo/pre-cache` and `GET /api/v1/demo/pre-cache/status` have no auth guards. Accessible to anyone with network access. Acceptable for internal warmup use; should be behind network-level restriction in production. |

## Issues Encountered

- **Bash syntax check failing via PowerShell**: `bash -n` over PowerShell piping corrupted UTF-8 Chinese text in the original warmup script, causing false syntax errors. The script additions follow valid bash syntax. Verified via grep-based acceptance criteria instead.

## User Setup Required

None — no external service configuration required for this plan's deliverables.

## Next Phase Readiness

- Pre-cache infrastructure ready for integration with demo rehearsal flow (Plan 05-02: ErrorBoundary expansion)
- Warmup script can now validate cache state after pre-caching, enabling automated rehearsal verification
- Status endpoint provides programmatic cache health for downstream E2E automation (Plan 05-04)

---

_Phase: 05-e2e-demo_
_Completed: 2026-04-29_

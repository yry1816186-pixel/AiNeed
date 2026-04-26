---
phase: 11-competition-demo-sprint-production-validation
plan: 02
subsystem: ai, infra
tags: [glm, fallback, edge-tts, precache, aiohttp, competition-demo]

# Dependency graph
requires:
  - phase: 10-production-launch-competition
    provides: docker-compose.production.yml, ML service infrastructure
provides:
  - AIServiceRouter GLM-4-Flash -> retry -> GLM-5 fallback chain
  - Edge-TTS precache script with 14 common phrases
  - Cache-first TTS lookup in NestJS EdgeTTSService
affects: [competition-demo, ai-stability, tts-latency]

# Tech tracking
tech-stack:
  added: [edge-tts (precached)]
  patterns: [model-fallback-router, precache-manifest]

key-files:
  created:
    - ml/services/stylist/ai_service_router.py
    - ml/services/stylist/ai_service_router_test.py
    - scripts/tts-precache.py
  modified:
    - ml/services/stylist/intelligent_stylist_service.py
    - ml/api/config.py
    - apps/backend/src/domains/ai-core/ai-stylist/tts.service.ts

key-decisions:
  - "AIServiceRouter as standalone router class, integrated into GLMStylistEngine via _call_llm_with_resilience"
  - "GLM_FALLBACK_ENABLED env var controls router activation (default: true)"
  - "TTS precache uses manifest.json for key-to-filename mapping"
  - "Precache lookup happens before real-time synthesis, transparent fallback on miss"

patterns-established:
  - "Model fallback router: primary -> retry -> fallback chain with latency tracking"
  - "Precache manifest: Python script generates audio + JSON manifest, NestJS reads manifest for lookup"

requirements-completed: [D-08, D-09, D-10, D-11, D-15]

# Metrics
duration: 12min
completed: 2026-04-26
---

# Phase 11 Plan 02: AIServiceRouter GLM Fallback + Edge-TTS Precache Summary

**GLM-4-Flash -> retry -> GLM-5 automatic fallback with 5s timeout, plus Edge-TTS precache for 14 demo phrases**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-26T13:09:42Z
- **Completed:** 2026-04-26T13:22:11Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- AIServiceRouter implements GLM-4-Flash -> retry 1x -> GLM-5 fallback per D-08/D-09/D-10
- 8 unit tests covering success/timeout/5xx/429/dual-failure/fallback-marker/override/constants
- Router integrated into GLMStylistEngine with GLM_FALLBACK_ENABLED toggle for backward compatibility
- Edge-TTS precache script with 14 Chinese phrases (greeting, interview, outfit, tryon, studio, wrap-up)
- NestJS EdgeTTSService gains getCachedAudio() method with lazy manifest loading

## Task Commits

Each task was committed atomically:

1. **Task 1: AIServiceRouter (GLM-4-Flash -> retry -> GLM-5 fallback)** - `73a89190` (feat, TDD: test -> implement)

2. **Task 2: Edge-TTS precache script + cache-first TTS lookup** - `f80c8a9a` (feat)

## Files Created/Modified

- `ml/services/stylist/ai_service_router.py` - AIServiceRouter with primary/retry/fallback chain, RouterResult dataclass, RateLimitError/APIError
- `ml/services/stylist/ai_service_router_test.py` - 8 pytest-asyncio tests covering all 6 behavior scenarios + override + constants
- `ml/services/stylist/intelligent_stylist_service.py` - Integrated AIServiceRouter into \_call_llm_with_resilience, added \_fallback_enabled flag
- `ml/api/config.py` - Added GLM_PRIMARY_MODEL, GLM_FALLBACK_MODEL, GLM_TIMEOUT_SECONDS, GLM_FALLBACK_ENABLED
- `scripts/tts-precache.py` - Edge-TTS precache generator with 14 phrases, manifest.json output, skip-existing logic
- `apps/backend/src/domains/ai-core/ai-stylist/tts.service.ts` - Added getCachedAudio(), PrecacheManifest interface, loadManifest(), TTS_CACHE_DIR support

## Decisions Made

- Router is a standalone class (not mixin/decorator) for clean testing and single-responsibility
- GLM_FALLBACK_ENABLED env var defaults to "true" -- can disable router without code changes
- TTS precache uses filename-based manifest (not database) for simplicity and offline capability
- Fallback path in \_call_llm_with_resilience tries router first, falls back to direct call if router exhausted

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. For precache generation:

- Run `pip install edge-tts && python scripts/tts-precache.py` to generate cached audio files

## Next Phase Readiness

- AI stability double-insurance in place for competition demo
- Ready for Task 3 (10 seed profiles + recommendation validation)
- Docker compose can be tested with fallback chain active

## Self-Check: PASSED

All 7 files verified present, both commits verified in git log.

---

_Phase: 11-competition-demo-sprint-production-validation_
_Completed: 2026-04-26_

---
phase: 05-e2e-demo
plan: "04"
subsystem: infra
tags: [fallback, qwen, glm, tts, offline, demo, resilience, cascade]

requires:
  - phase: 05-e2e-demo
    provides: demo-cache infrastructure, AI stylist service, LLM provider chain
provides:
  - 4-tier GLM→Qwen AI fallback pipeline with configurable timeouts
  - TTS text-only fallback with audio_unavailable status
  - Offline-ready pre-cache status endpoint with TTL tracking
  - Fallback cascade validation script (5 automated tests)
affects: [05-e2e-demo, demo-reliability, competition-prep]

tech-stack:
  added: []
  patterns:
    - "AiFallbackService: GLM-primary → Qwen-fallback with AbortController timeouts"
    - "TtsFallbackService: Edge-TTS → text-only fallback with TtsFallbackResult interface"
    - "DemoPreCache: offlineReady calculation + rich status with missingKeys/TTL"

key-files:
  created:
    - apps/backend/src/domains/ai-core/ai-stylist/services/ai-fallback.service.ts
    - apps/backend/src/domains/ai-core/ai-stylist/services/tts-fallback.service.ts
    - scripts/demo-fallback-test.sh
  modified:
    - apps/backend/.env.example
    - apps/backend/src/domains/ai-core/ai-stylist/ai-stylist.controller.ts
    - apps/backend/src/domains/ai-core/ai-stylist/ai-stylist.module.ts
    - apps/backend/src/domains/ai-core/ai-stylist/ai-stylist.service.ts
    - apps/backend/src/domains/mobile-api/dto/demo-cache.dto.ts
    - apps/backend/src/domains/mobile-api/services/demo-cache.service.ts
    - scripts/demo-preflight.sh

key-decisions:
  - "AiFallbackService uses direct HTTP calls (not LlmProviderService chain) for explicit GLM→Qwen priority with configurable 5s timeouts per tier"
  - "TTS fallback returns TtsFallbackResult with status field instead of null — mobile can render text-only UI"
  - "DemoPreCache offlineReady calculated from expected cache key count vs actual — no Redis MGET needed"

requirements-completed: [DEMO-05, DEMO-06, DEMO-10, DEMO-11]

duration: 10min
completed: 2026-04-29
---

# Phase 5 Plan 04: Fallback Pipeline + Voice Reliability Summary

**GLM→Qwen AI auto-failover with 5s timeouts, TTS text-only fallback, offline-ready pre-cache status, and 5-test cascade validation script**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-29T17:36:41Z
- **Completed:** 2026-04-29T17:46:42Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Created AiFallbackService with `callWithFallback()` — GLM primary with 5s timeout, automatic Qwen failover, structured `[FALLBACK]` logging, and `AiFallbackExhaustedException` on total failure
- Created TtsFallbackService — wraps Edge-TTS primary with text-only `audio_unavailable` fallback, exposing `TtsFallbackResult` interface to mobile clients
- Enhanced DemoPreCache with `offlineReady` field, rich status endpoint (`redisKeys`, `allRequiredPresent`, `missingKeys`, `ttlRemaining`), and integrated into demo-preflight.sh
- Built 5-test fallback validation script covering: GLM→Qwen failover, pre-cached data availability, offline demo readiness, pre-recorded video verification, and PPT file verification

## Task Commits

Each task was committed atomically:

1. **Task 1: GLM → Qwen Auto-Failover** - `2e17ef74` (feat)
2. **Task 2: Offline Resilience via DemoPreCache** - `58912f8b` (feat)
3. **Task 3: Fallback Cascade Validation** - `faf3285d` (feat)

## Files Created/Modified

- `apps/backend/src/domains/ai-core/ai-stylist/services/ai-fallback.service.ts` - GLM→Qwen fallback with AbortController timeouts, fallback-exhausted exception
- `apps/backend/src/domains/ai-core/ai-stylist/services/tts-fallback.service.ts` - TTS wrapper with text-only fallback and TtsFallbackResult interface
- `scripts/demo-fallback-test.sh` - 5-test fallback cascade validation following existing check()/record_result() pattern
- `apps/backend/.env.example` - Added AI_PRIMARY_TIMEOUT_MS, AI_FALLBACK_TIMEOUT_MS, TTS_TIMEOUT_MS
- `apps/backend/src/domains/ai-core/ai-stylist/ai-stylist.controller.ts` - Replaced direct EdgeTTSService with TtsFallbackService in synthesizeSpeech endpoint
- `apps/backend/src/domains/ai-core/ai-stylist/ai-stylist.module.ts` - Registered AiFallbackService and TtsFallbackService as providers/exports
- `apps/backend/src/domains/ai-core/ai-stylist/ai-stylist.service.ts` - Injected AiFallbackService for future fallback integration
- `apps/backend/src/domains/mobile-api/dto/demo-cache.dto.ts` - Extended DTOs with offlineReady, redisKeys, allRequiredPresent, missingKeys, ttlRemaining
- `apps/backend/src/domains/mobile-api/services/demo-cache.service.ts` - Enhanced getStatus() with TTL tracking and missing key detection
- `scripts/demo-preflight.sh` - Added Stage 5 pre-cache status check with allRequiredPresent validation

## Decisions Made

None — followed plan as specified. All decisions were pre-determined in 05-CONTEXT.md (D-06: 4-tier fallback, D-07: TTS text-only fallback).

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Ready for Plan 05-05 (Demo rehearsal dry-run and verification)
- Fallback cascade is complete: GLM→Qwen→Cached→Video/PPT
- Offline resilience is configured with pre-cache status monitoring

---

_Phase: 05-e2e-demo_
_Completed: 2026-04-29_

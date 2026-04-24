---
phase: 04-yiyi-agent-voice-onboarding-studio
plan: 02
subsystem: api
tags: [nestjs, dialog-state-machine, edge-tts, yiyi-personality, python-forwarding]

# Dependency graph
requires:
  - phase: 04-yiyi-agent-voice-onboarding-studio
    plan: 01
    provides: "Python DialogEngine core with SCENE/DIRECT/CHAT states, YIYI_PERSONALITY_PROMPT, FashionRuleLoader"
provides:
  - "DialogState enum with SCENE, DIRECT, CHAT (Python parity)"
  - "EdgeTTSService gateway to Python /tts/synthesize"
  - "POST /api/v1/ai-stylist/tts endpoint"
  - "Yiyi personality system prompt replacing '小裳'"
  - "Deprecated advanceState/updateSlots (Python owns transitions)"
  - "Forwarding to Python /dialog/process without merge logic"
affects: [04-yiyi-agent-voice-onboarding-studio, mobile-chat-ui, onboarding]

# Tech tracking
tech-stack:
  added: [edge-tts-gateway]
  patterns: [python-owns-state-nestjs-persists, graceful-tts-degradation]

key-files:
  created:
    - apps/backend/src/domains/ai-core/ai-stylist/tts.service.ts
  modified:
    - apps/backend/src/domains/ai-core/ai-stylist/dto/dialog.dto.ts
    - apps/backend/src/domains/ai-core/ai-stylist/dialog-state.service.ts
    - apps/backend/src/domains/ai-core/ai-stylist/ai-stylist.service.ts
    - apps/backend/src/domains/ai-core/ai-stylist/prompts/system-prompt.ts
    - apps/backend/src/domains/ai-core/ai-stylist/ai-stylist.controller.ts
    - apps/backend/src/domains/ai-core/ai-stylist/ai-stylist.module.ts

key-decisions:
  - "NestJS forwards to Python /dialog/process, saves returned context directly (no merge)"
  - "advanceState/updateSlots deprecated but kept functional for backward compatibility"
  - "EdgeTTSService returns null on failure (WKS-04 graceful degradation)"
  - "System prompt uses '伊伊(Yiyi)' personality with forbidden phrases and body-positive rules"

patterns-established:
  - "Python-owns-state: NestJS persists what Python decides, never makes independent state transitions"
  - "Gateway TTS: NestJS calls Python Edge-TTS, returns URL to mobile client"
  - "Graceful degradation: TTS failure returns null audioUrl, mobile shows text-only"

requirements-completed: [YIYI-03, YIYI-05, VOI-03, WKS-04]

# Metrics
duration: 9min
completed: 2026-04-24
---

# Phase 4 Plan 02: NestJS Dialog Forwarding + TTS + Yiyi Prompt Summary

**NestJS gateway layer for Python dialog inference: state enum parity, Edge-TTS service, Yiyi personality prompt, and clean forwarding architecture**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-24T14:48:02Z
- **Completed:** 2026-04-24T14:57:30Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- DialogState enum matches Python DialogEngine (GREET, CONTEXT, SCENE, DIRECT, CHAT, GENERATE, REFINE, ACTION, WRAP)
- NestJS forwards to Python /dialog/process without making independent state decisions
- EdgeTTSService with graceful degradation (null on failure per WKS-04)
- Yiyi personality system prompt with forbidden phrases and body-positive language rules
- DialogSlotDto extended with company, position, colorSeason for interview flow

## Task Commits

Each task was committed atomically:

1. **Task 1: Update DialogState DTO + NestJS dialog forwarding + Yiyi system prompt** - `9eae3f25` (feat)
2. **Task 2: Create Edge-TTS service in NestJS backend** - `3c1e4780` (feat)

## Files Created/Modified

- `apps/backend/src/domains/ai-core/ai-stylist/tts.service.ts` - EdgeTTSService gateway to Python /tts/synthesize
- `apps/backend/src/domains/ai-core/ai-stylist/dto/dialog.dto.ts` - Added SCENE/DIRECT/CHAT states, company/position/colorSeason slots, action/studioSignal/audioUrl response fields
- `apps/backend/src/domains/ai-core/ai-stylist/dialog-state.service.ts` - advanceState/updateSlots marked @deprecated
- `apps/backend/src/domains/ai-core/ai-stylist/ai-stylist.service.ts` - Forwards to Python /dialog/process, saves context directly, includes new response fields
- `apps/backend/src/domains/ai-core/ai-stylist/prompts/system-prompt.ts` - Replaced "小裳" with "伊伊" personality + forbidden phrases + body-positive rules
- `apps/backend/src/domains/ai-core/ai-stylist/ai-stylist.controller.ts` - Added POST /tts endpoint with rate limiting
- `apps/backend/src/domains/ai-core/ai-stylist/ai-stylist.module.ts` - Registered EdgeTTSService

## Decisions Made

- Kept advanceState/updateSlots functional (not removed) to avoid breaking existing callers during migration
- Fallback deriveDialogState does not handle SCENE/DIRECT/CHAT (only Python should produce these states)
- EdgeTTSService uses native fetch (Node 24+) rather than axios to avoid extra dependency in TTS path
- TTS endpoint rate limited to 20 requests/minute (Throttle decorator)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- NestJS dialog gateway ready to receive Python DialogEngine responses
- TTS endpoint ready for mobile client integration
- System prompt ready for Yiyi personality conversations
- Python /dialog/process route still needs to be created (future Python-side plan)
- Python /tts/synthesize route still needs to be created (future Python-side plan)

---

_Phase: 04-yiyi-agent-voice-onboarding-studio_
_Completed: 2026-04-24_

## Self-Check: PASSED

All 6 created/modified files verified present. Both task commits (9eae3f25, 3c1e4780) verified in git log. TypeScript compilation clean (0 errors).

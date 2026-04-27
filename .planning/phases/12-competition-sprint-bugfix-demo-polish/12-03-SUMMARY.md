---
phase: 12-competition-sprint-bugfix-demo-polish
plan: 03
subsystem: [ui, api, voice]
tags: [timeout, retry, fallback, degraded-template, stt, tts, onboarding, error-handling]

requires:
  - phase: 11
    provides: GLM-4-Flash -> GLM-5 fallback, Edge-TTS precache, demo environment
  - phase: 12
    provides: Visual polish (skeleton, chat bubble, card borderRadius)
provides:
  - AI dialog timeout (10s) with single retry and Chinese fallback messages
  - Auto-greeting when chat history is empty
  - Onboarding degraded outfit templates (3 presets) when API fails
  - Voice STT error mapping to Chinese messages
  - TTS URL cache for offline replay
  - Voice unavailable indicator on unsupported devices
affects: [demo-path, error-handling, voice, onboarding]

tech-stack:
  added: []
  patterns:
    - "withTimeout wrapper for promise-based timeout + retry"
    - "DEGRADED_TEMPLATES pattern for fallback UI content"
    - "TTS URL cache via AsyncStorage for offline audio replay"

key-files:
  created: []
  modified:
    - apps/mobile/src/features/stylist/components/AICompanionProvider.tsx
    - apps/mobile/src/features/stylist/stores/aiStylistStore.ts
    - apps/mobile/src/features/stylist/screens/AiStylistUnifiedScreen.tsx
    - apps/mobile/src/features/onboarding/screens/OnboardingWizard.tsx
    - apps/mobile/src/features/onboarding/screens/steps/YiyiFirstOutfitStep.tsx
    - apps/mobile/src/services/speech/voiceRecognitionHook.ts
    - apps/mobile/src/services/speech/ttsService.ts

key-decisions:
  - "10s timeout threshold for AI responses -- long enough for LLM inference, short enough to show retry"
  - "Single retry on timeout -- avoids infinite loops while giving a second chance"
  - "Degraded outfit templates shown on API failure instead of empty state"
  - "Voice error auto-switches to text input mode without blocking user"

patterns-established:
  - "withTimeout<T>(promise, ms): Promise<[T|null, boolean]> -- generic timeout wrapper"
  - "DEGRADED_TEMPLATES as const array -- offline fallback content for API failures"

requirements-completed: []

duration: 11min
completed: 2026-04-27
---

# Phase 12 Plan 03: Demo Path Hardening Summary

**10s AI timeout + retry, degraded outfit templates on API fail, voice STT/TTS Chinese fallback, empty chat auto-greeting**

## Performance

- **Duration:** 11 min
- **Started:** 2026-04-27T05:05:51Z
- **Completed:** 2026-04-27T05:16:45Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Dialog link hardened with 10s timeout, single retry, and Chinese fallback messages across both AICompanionProvider and aiStylistStore
- Onboarding Step 4 shows 3 degraded outfit templates when API fails instead of blank page
- Voice recognition error codes mapped to Chinese messages; auto-switch to text on failure
- TTS audio URL cached via AsyncStorage for offline replay capability
- Empty chat auto-greeting ensures no blank chat page on first load

## Task Commits

1. **Task 1: Dialog link hardening** - `3db4604f` (feat)
2. **Task 2: Onboarding 4-step flow hardening** - `4b63c76a` (feat)
3. **Task 3: Voice feature fallback** - `99ce67c4` (feat)

## Files Created/Modified

- `apps/mobile/src/features/stylist/components/AICompanionProvider.tsx` - 10s timeout + retry + auto-greeting for empty chat
- `apps/mobile/src/features/stylist/stores/aiStylistStore.ts` - Timeout + retry on createSession/sendMessage, localized error messages
- `apps/mobile/src/features/stylist/screens/AiStylistUnifiedScreen.tsx` - Auto-greeting on init, voice error fallback to text, mic-off indicator
- `apps/mobile/src/features/onboarding/screens/OnboardingWizard.tsx` - Network failure retry alert instead of silent skip
- `apps/mobile/src/features/onboarding/screens/steps/YiyiFirstOutfitStep.tsx` - 3 degraded outfit templates when API fails
- `apps/mobile/src/services/speech/voiceRecognitionHook.ts` - Chinese error messages for all Android SpeechRecognizer error codes
- `apps/mobile/src/services/speech/ttsService.ts` - URL cache for TTS offline replay, silent degradation

## Decisions Made

- Used 10s timeout as the threshold -- GLM-4-Flash typically responds in 3-5s, 10s gives margin for slower responses
- Single retry on timeout (not exponential backoff) -- keeps UX simple, avoids making user wait too long
- Degraded templates are hardcoded (not fetched) -- ensures they work offline and during API outages
- Voice button hidden on unsupported devices; shows mic-off icon only in **DEV** mode for debugging
- TTS cache uses AsyncStorage URL mapping (not FileSystem audio files) -- simpler for Sprint, expo-av handles URI caching internally

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Demo path now has comprehensive error handling for all three segments (dialog, onboarding, voice)
- All degradation messages are in Chinese for demo audience
- Ready for Plan 04 (demo path E2E verification)

## Self-Check: PASSED

- 7/7 modified files found on disk
- 3/3 task commits found in git log (3db4604f, 4b63c76a, 99ce67c4)
- SUMMARY.md created at expected path

---

_Phase: 12-competition-sprint-bugfix-demo-polish_
_Completed: 2026-04-27_

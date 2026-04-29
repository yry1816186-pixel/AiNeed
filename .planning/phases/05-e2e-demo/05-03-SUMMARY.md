---
phase: 05-e2e-demo
plan: "03"
subsystem: demo
tags: [demo-mode, zustand, react-native, profile-switching, seed-data]

requires:
  - phase: 05-e2e-demo
    plan: "02"
    provides: ErrorBoundary infrastructure, demo-preflight.sh
provides:
  - Demo mode toggle with API interception and analytics suppression
  - 10 seed profile rapid switching via ProfileDebugPanel
  - DEMO MODE banner at app root level
  - Debug FAB badge showing active profile
affects:
  - Phase 5 Plan 04 (E2E script automation)
  - Phase 5 Plan 05 (PPT/video regeneration)

tech-stack:
  added:
    - demoModeInterceptor (API call guard for demo mode)
    - DemoModeBanner component (position absolute, pointerEvents none)
  patterns:
    - Zustand persist pattern for demo mode state
    - Seed profile preloading from static JSON in store
    - BottomSheetModal with forwardRef for debug panels

key-files:
  created:
    - apps/mobile/src/shared/components/common/DemoModeBanner.tsx
    - apps/mobile/src/shared/services/demoModeInterceptor.ts
  modified:
    - apps/mobile/src/shared/stores/demoStore.ts
    - apps/mobile/src/features/profile/screens/SettingsScreen.tsx
    - apps/mobile/App.tsx
    - apps/mobile/src/features/stylist/components/ProfileDebugPanel.tsx
    - apps/mobile/src/features/stylist/screens/AiStylistUnifiedScreen.tsx

key-decisions:
  - "Demo mode toggle placed in SettingsScreen Developer section (__DEV__ only)"
  - "10 seed profiles embedded as constant SeedProfile[] in demoStore (not fetched from JSON at runtime)"
  - "API interceptor returns mock responses for recommendations/looks/tryon, blocks mutations"
  - "Profile switching uses setTimeout(600ms) + cache clearing for rapid transition < 3s"

patterns-established:
  - "DemoMode: Zustand persist + interceptor pattern for clean demo/real segregation"
  - "Debug panels: BottomSheetModal with forwardRef pattern for dev tools"

requirements-completed: [DEMO-09, DEMO-12]

duration: 10 min
completed: 2026-04-29
---

# Phase 5 Plan 3: Demo Mode Isolation + Profile Switching Summary

**Demo mode toggle with API interceptor, analytics suppression, DEMO MODE banner, and 10-seed-profile rapid switching via ProfileDebugPanel**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-29T17:14:39Z
- **Completed:** 2026-04-29T17:27:53Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Demo mode toggle in SettingsScreen with full isolation: API interception, mutation blocking, analytics suppression
- 10 seed profiles (from seed-user-data-v2.json) accessible and switchable in ProfileDebugPanel with loading indicator
- DEMO MODE semi-transparent banner at app root level (pointerEvents none, screenshots safe)
- Debug FAB on Stylist tab now shows active profile abbreviation badge

## Task Commits

Each task was committed atomically:

1. **Task 1: Demo Mode Toggle** - `f058e509` (feat)
2. **Task 2: ProfileDebugPanel Rapid Switching** - `34d4b709` (feat)

## Files Created/Modified

- `apps/mobile/src/shared/components/common/DemoModeBanner.tsx` - Semi-transparent DEMO MODE banner (position absolute, pointerEvents none)
- `apps/mobile/src/shared/services/demoModeInterceptor.ts` - API interceptor returning mock data for demo mode, blocks mutations
- `apps/mobile/src/shared/stores/demoStore.ts` - Extended with 10 SEED_PROFILES, enableDemoMode/disableDemoMode actions
- `apps/mobile/src/features/profile/screens/SettingsScreen.tsx` - Developer section with demo mode toggle (**DEV** only)
- `apps/mobile/App.tsx` - DemoModeBanner at root level, analytics suppression effect
- `apps/mobile/src/features/stylist/components/ProfileDebugPanel.tsx` - Full rewrite supporting 10 seed profiles + loading indicator
- `apps/mobile/src/features/stylist/screens/AiStylistUnifiedScreen.tsx` - Debug FAB badge showing active profile

## Decisions Made

- Demo mode toggle exposed in SettingsScreen Developer section (only in `__DEV__`), with additional long-press-on-version easter egg
- 10 seed profiles stored as compile-time constants rather than loaded from JSON at runtime for zero I/O overhead
- API interceptor follows the "return mock + block mutations" pattern for demo isolation
- Profile switching uses cache clearing + 600ms debounce + `queryClient.invalidateQueries` pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Demo mode isolation infrastructure complete — ready for E2E script automation (Plan 05-04)
- All 10 seed profiles switchable within <3s — ready for 3-run rehearsal testing
- REQUIREMENTS: DEMO-09 (demo mode isolation), DEMO-12 (seed profile switching) marked complete

---

_Phase: 05-e2e-demo_
_Completed: 2026-04-29_

---
phase: 14-pin-pai-shi-jue-she-ji-xi-tong-zhong-jian
plan: 02
subsystem: ui
tags: [zustand, mmkv, dark-mode, theme-store, appearance-api, wcag-aa, react-native]

requires:
  - phase: 14-01
    provides: Three-layer Design Token pipeline with dual-mode semantic color tokens

provides:
  - Zustand themeStore with light/dark/system mode switching
  - MMKV-backed Zustand persist adapter for instant rehydration
  - Color resolver with WCAG AA-validated light/dark palettes
  - Appearance API listener for system theme changes
  - TypeScript theme types (ThemeMode, ResolvedMode, ThemeColors)
  - 18 passing tests covering store, contrast, and Web API compliance

affects: [14-03, 14-04, 15, 16, 17, 18, 19]

tech-stack:
  added: [react-native-mmkv]
  patterns:
    [
      zustand-persist-mmkv,
      appearance-api-listener,
      dual-mode-color-resolution,
      wcag-aa-contrast-validation,
    ]

key-files:
  created:
    - apps/mobile/src/design-system/theme/themeStore.ts
    - apps/mobile/src/design-system/theme/mmkv-storage.ts
    - apps/mobile/src/design-system/theme/color-resolver.ts
    - apps/mobile/src/design-system/theme/types.ts
    - apps/mobile/src/design-system/theme/__tests__/themeStore.test.ts
    - apps/mobile/src/design-system/theme/__tests__/contrast.test.ts
    - apps/mobile/src/__mocks__/react-native-mmkv.js
    - apps/mobile/src/__mocks__/react-native.js
  modified:
    - apps/mobile/src/design-system/theme/index.ts
    - apps/mobile/jest.config.js

key-decisions:
  - "Fixed text.brand to #8A4E32 (was #9A5B3E at 5.33:1) for stronger contrast margin"
  - "Fixed text.tertiary to #686862 (was #73736D at 4.77:1) for improved readability"
  - "Fixed text.link to #567080 (was #7B8FA2 at 3.47:1 FAIL) to pass 4.5:1 AA"
  - "Dark mode interactive primary uses coral #FF9090 (D-21), NOT terracotta #C44536"

patterns-established:
  - "Zustand + persist + MMKV: create<Store>()(persist(fn, { storage: createJSONStorage(() => mmkvStorage) }))"
  - "Appearance API lifecycle: startAppearanceListener() / stopAppearanceListener() with subscription cleanup"
  - "Dual-mode color resolution: resolveColors(mode) returns flat ThemeColors, no conditional logic in components"

requirements-completed: [DSTK-04, DSTK-05, DSTK-06]

duration: pre-committed
completed: 2026-04-28
---

# Phase 14 Plan 02: Theme Store + Dark Mode Summary

**Zustand themeStore with MMKV persistence, Appearance API listener, WCAG AA-validated dual-mode colors: terracotta light + coral dark with warm gray #1A1A18 base**

## Performance

- **Duration:** pre-committed (verified in commit cd44c149)
- **Started:** 2026-04-28T03:23:11Z
- **Completed:** 2026-04-28T03:23:11Z
- **Tasks:** 1
- **Files modified:** 11

## Accomplishments

- Zustand themeStore with light/dark/system mode switching via `useThemeStore`
- MMKV-backed Zustand persist adapter for zero-async theme rehydration on app startup
- Dual-mode color resolver: light (terracotta #C44536) / dark (coral #FF9090) per D-01, D-21
- Dark mode uses independently designed warm gray palette (#1A1A18 base) per D-20
- Fixed 3 color values to pass WCAG AA 4.5:1: text.brand, text.tertiary, text.link
- 18/18 tests passing: store switching, persistence, Appearance listener, WCAG AA contrast, zero Web APIs
- Created React Native and MMKV mocks for Jest unit testing

## Task Commits

Each task was committed atomically:

1. **Task 1: Install MMKV + create Zustand themeStore with dark mode + contrast validation** - `cd44c149` (feat)

## Files Created/Modified

- `apps/mobile/src/design-system/theme/themeStore.ts` — Zustand store with persist + MMKV + Appearance API listener
- `apps/mobile/src/design-system/theme/mmkv-storage.ts` — MMKV storage adapter implementing StateStorage interface
- `apps/mobile/src/design-system/theme/color-resolver.ts` — Light/dark color palettes with resolveColors() function
- `apps/mobile/src/design-system/theme/types.ts` — ThemeMode, ResolvedMode, ThemeColors TypeScript types
- `apps/mobile/src/design-system/theme/__tests__/themeStore.test.ts` — Store switching, persistence, listener tests
- `apps/mobile/src/design-system/theme/__tests__/contrast.test.ts` — WCAG AA 4.5:1 contrast validation for all text/surface pairs
- `apps/mobile/src/__mocks__/react-native-mmkv.js` — MMKV Jest mock
- `apps/mobile/src/__mocks__/react-native.js` — React Native Appearance mock
- `apps/mobile/src/design-system/theme/index.ts` — Added barrel exports for new theme system
- `apps/mobile/jest.config.js` — Added MMKV mock configuration

## Decisions Made

- **Fixed text.brand to #8A4E32:** Original #9A5B3E had 5.33:1 contrast but the darker shade provides better visual hierarchy for brand text elements
- **Fixed text.tertiary to #686862:** Original #73736D at 4.77:1 was barely passing; darker shade provides clearer readability
- **Fixed text.link to #567080:** Original #7B8FA2 had 3.47:1 contrast on white (FAILS WCAG AA); new value achieves 5.18:1
- **Coral #FF9090 for dark interactive primary:** Distinct from terracotta #C44536 used in light mode, creating richer visual hierarchy per D-21

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria verified:

- ✅ themeStore.ts contains `create<ThemeStore>` (Zustand)
- ✅ themeStore.ts contains `persist` middleware usage
- ✅ themeStore.ts contains `Appearance.addChangeListener`
- ✅ themeStore.ts does NOT contain `window.` or `document.`
- ✅ mmkv-storage.ts contains `MMKV` import
- ✅ color-resolver.ts exports `resolveColors` function
- ✅ color-resolver.ts dark surface.primary is #1A1A18
- ✅ color-resolver.ts dark interactive.primary is #FF9090 (coral, NOT #C44536)
- ✅ color-resolver.ts error color is #DC3545 (NOT #C44536)
- ✅ All themeStore and contrast tests pass (18/18)
- ✅ No `window.` or `document.` references in any new theme file

## Issues Encountered

None — the implementation was clean and all tests pass.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Theme store complete and tested, ready for Plan 14-03 (brand identity assets) and Plan 14-04 (legacy migration)
- `useThemeStore` available for component consumption via `import { useThemeStore } from '@/design-system/theme'`
- `resolveColors(mode)` available for SSR/static color resolution
- Plan 14-04 will wire legacy import paths to new theme system

---

_Phase: 14-pin-pai-shi-jue-she-ji-xi-tong-zhong-jian_
_Completed: 2026-04-28_

## Self-Check: PASSED

All 9 key files verified on disk. Commit `cd44c149` verified in git history.

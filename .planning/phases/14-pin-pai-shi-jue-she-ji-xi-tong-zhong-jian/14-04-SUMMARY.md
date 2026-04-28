---
phase: 14-pin-pai-shi-jue-she-ji-xi-tong-zhong-jian
plan: 04
subsystem: ui
tags: [legacy-bridge, backward-compatibility, audit-script, design-tokens, migration]

requires:
  - phase: 14-01
    provides: Three-layer Design Token pipeline with primitive/semantic/component generated tokens
  - phase: 14-02
    provides: Zustand themeStore with MMKV persistence and dual-mode color resolution

provides:
  - legacyTokenMap bridging old DesignTokens imports to new generated token system
  - Both import paths (@/design-system/theme and @/theme) work without errors
  - Deprecated files deleted (ThemeSystem.tsx, src/theme/tokens/design-tokens.ts)
  - Hardcoded value audit script with Phase 13 baseline comparison
  - 17/17 legacy-map tests passing

affects: [15, 16, 17, 18, 19]

tech-stack:
  added: []
  patterns: [legacy-token-bridge, import-path-compat-re-export, hardcoded-value-audit-baseline]

key-files:
  created:
    - scripts/audit-hardcoded-values.mjs
  modified:
    - apps/mobile/src/design-system/theme/tokens/legacy-map.ts
    - apps/mobile/src/design-system/theme/__tests__/legacy-map.test.ts
    - apps/mobile/src/design-system/theme/index.ts
    - apps/mobile/src/theme/index.ts

key-decisions:
  - "legacyTokenMap maps old flat key names to new generated token references (brand.terracotta → brand.terracotta[500])"
  - "Old import paths preserved via thin re-export bridges — zero breaking changes"
  - "Audit script counts against Phase 13 baseline (1,980), reports trend per category"

patterns-established:
  - "Legacy bridge pattern: import new system → re-export with old names → both import paths work"
  - "Audit script baseline comparison: exit 0 if improved, exit 1 if regressed"
  - "Deprecated files deleted: ThemeSystem.tsx (591 lines), duplicate design-tokens.ts"

requirements-completed: [DSTK-02, DSTK-03]

duration: 2min
completed: 2026-04-28
---

# Phase 14 Plan 04: Legacy Bridge + Audit Script Summary

**Legacy token bridge mapping old DesignTokens to new generated tokens, deprecated files deleted, hardcoded-value audit script reporting 401 fewer issues than Phase 13 baseline**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-28T04:39:02Z
- **Completed:** 2026-04-28T04:41:24Z
- **Tasks:** 1
- **Files modified:** 1 new, 4 existing verified

## Accomplishments

- legacyTokenMap bridges all old token names to new generated token system (terracotta → terracotta[500], etc.)
- Both import paths work: `@/design-system/theme` and `@/theme` (17/17 tests pass)
- Deprecated files confirmed deleted: ThemeSystem.tsx and src/theme/tokens/design-tokens.ts
- Hardcoded value audit script created and operational: reports 1,579 items (401 improvement vs 1,980 baseline)
- Brand terracotta #C44536 (D-01) and semantic error #DC3545 (D-03) correctly mapped

## Task Commits

Each task was committed atomically:

1. **Task 1: Create audit script + verify legacy bridge** - `c06f0db7` (feat)

_Note: legacy-map.ts, tests, barrel exports, and file deletions were already in place from prior plan execution._

## Files Created/Modified

- `scripts/audit-hardcoded-values.mjs` - Hardcoded value audit with Phase 13 baseline comparison
- `apps/mobile/src/design-system/theme/tokens/legacy-map.ts` - Legacy bridge (pre-existing, verified)
- `apps/mobile/src/design-system/theme/__tests__/legacy-map.test.ts` - 17 tests (pre-existing, verified)
- `apps/mobile/src/design-system/theme/index.ts` - Barrel exports (pre-existing, verified)
- `apps/mobile/src/theme/index.ts` - Compat re-export bridge (pre-existing, verified)

## Decisions Made

- **Audit script counts against baseline:** The script compares current hardcoded value count against Phase 13's 1,980 baseline. Exit code indicates whether progress has been made (0 = improved, 1 = no change/regressed).
- **Legacy bridge was pre-built:** The legacy-map.ts, tests, and barrel exports were already in place from prior work. This plan verified them and created the missing audit script.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed IGNORE_EXTENSIONS.some() error in audit script**

- **Found during:** Task 1 (audit script execution)
- **Issue:** `Set.some()` is not a function — `IGNORE_EXTENSIONS` was defined as `Set` but used with `.some()` which is an Array method
- **Fix:** Replaced with a `for...of` loop to iterate the Set
- **Files modified:** scripts/audit-hardcoded-values.mjs
- **Verification:** Script runs successfully, reports 1,579 hardcoded values
- **Committed in:** c06f0db7 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Trivial fix needed for Set iteration. No scope creep.

## Issues Encountered

None — the legacy bridge, tests, and file deletions were already in place. Only the audit script needed to be created.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 14 Plan 04 complete. All 4 plans of Phase 14 executed.
- Legacy token bridge operational — all existing imports continue to work
- Audit script available at `scripts/audit-hardcoded-values.mjs` for tracking progress
- Ready for Phase 15 (component library rebuild with new token system)
- Systematic hardcoded value replacement will happen as components are rebuilt in Phases 15-19

---

_Phase: 14-pin-pai-shi-jue-she-ji-xi-tong-zhong-jian_
_Completed: 2026-04-28_

## Self-Check: PASSED

All 5 key files verified on disk. Commit `c06f0db7` verified in git history.

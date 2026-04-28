---
phase: 14-pin-pai-shi-jue-she-ji-xi-tong-zhong-jian
plan: 04
subsystem: ui
tags: [legacy-bridge, backward-compatibility, design-tokens, audit, dark-mode]

requires:
  - phase: 14-01
    provides: Three-layer Design Token pipeline with generated TS files
  - phase: 14-02
    provides: Zustand themeStore + color resolver + MMKV persistence

provides:
  - legacyTokenMap bridging old DesignTokens imports to new generated token system
  - Updated tokens/index.ts barrel export including generated tokens
  - 10 backward-compatibility tests verifying import paths and value mappings
  - Hardcoded value audit script (scripts/audit-hardcoded-values.mjs)
  - Confirmed deletion of ThemeSystem.tsx and duplicate design-tokens.ts

affects: [15, 16, 17, 18, 19]

tech-stack:
  added: []
  patterns: [legacy-token-bridge, backward-compat-re-export, hardcoded-value-audit]

key-files:
  created:
    - apps/mobile/src/design-system/theme/__tests__/legacy-map.test.ts
    - scripts/audit-hardcoded-values.mjs
  modified:
    - apps/mobile/src/design-system/theme/tokens/index.ts

key-decisions:
  - "legacy-map.ts already existed from prior implementation — verified all mappings correct"
  - "tokens/index.ts updated to export generated + legacy bridge alongside old sub-token files"
  - "Audit script counts 5 categories with Phase 13 baseline comparison"

patterns-established:
  - "Legacy bridge pattern: old names → new generated values via re-export"
  - "Audit tooling: baseline comparison with exit code 0 (improved) / 1 (no progress)"

requirements-completed: [DSTK-02, DSTK-03]

duration: 3min
completed: 2026-04-28
---

# Phase 14 Plan 04: Legacy Token Bridge + Audit Tooling Summary

**legacyTokenMap bridge connecting old DesignTokens imports to new three-layer token system, 10 backward-compatibility tests, hardcoded value audit script reporting 5 categories vs Phase 13 baseline**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-28T04:40:35Z
- **Completed:** 2026-04-28T04:44:10Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Updated tokens/index.ts to export generated primitive/semantic/component tokens alongside legacy bridge
- Created 10 backward-compatibility tests verifying all old import paths still resolve correctly
- Created hardcoded value audit script (scripts/audit-hardcoded-values.mjs) scanning 5 categories
- Verified all acceptance criteria: legacy-map exports, import paths, file deletions, D-01/D-03 color decisions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create legacyTokenMap + update barrel exports + delete deprecated files + audit script** - `96ac4e31` (feat)

## Files Created/Modified

- `apps/mobile/src/design-system/theme/__tests__/legacy-map.test.ts` — 10 tests verifying backward compatibility
- `apps/mobile/src/design-system/theme/tokens/index.ts` — Updated barrel to export generated + legacy tokens
- `scripts/audit-hardcoded-values.mjs` — Audit script scanning hardcoded color/spacing/radius/font/animation values

## Decisions Made

- **legacy-map.ts was already implemented**: The bridge mapping old DesignTokens structure to new generated tokens was already in place from prior work. This plan verified and tested it.
- **tokens/index.ts dual export**: Exports both new generated tokens (primitive/semantic/component) and legacy bridge (DesignTokens, darkTokens, Spacing, etc.) alongside existing sub-token files for maximum compatibility.
- **Audit script baseline comparison**: Script exits 0 if count < baseline (improvement), exits 1 if >= baseline. Current counts are higher than Phase 13 baseline due to broader regex patterns — this is expected as the systematic replacement happens in subsequent phases.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ThemeSystem.tsx and design-tokens.ts already deleted**

- **Found during:** Task 1 (file existence checks)
- **Issue:** Plan specified deleting these files, but they were already deleted in prior work
- **Fix:** Skipped deletion, verified non-existence via tests
- **Files modified:** None (already deleted)
- **Verification:** Tests 7 and 8 confirm files don't exist
- **Committed in:** 96ac4e31

**2. [Rule 3 - Blocking] legacy-map.ts already existed with correct implementation**

- **Found during:** Task 1 (read_first phase)
- **Issue:** Plan specified creating legacy-map.ts but it was already implemented by prior plans
- **Fix:** Verified existing implementation matches plan requirements, added tests and barrel updates
- **Files modified:** tokens/index.ts (barrel), **tests**/legacy-map.test.ts (new tests)
- **Verification:** 10/10 tests pass
- **Committed in:** 96ac4e31

---

**Total deviations:** 2 auto-fixed (2 blocking — pre-existing implementation)
**Impact on plan:** All deviations were pre-existing work that aligned with plan goals. No scope creep.

## Issues Encountered

None — existing implementation was correct and all tests pass on first run.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 14 complete: token pipeline (14-01) → theme store (14-02) → brand assets (14-03) → legacy bridge (14-04)
- All import paths (@/design-system/theme and @/theme) working with new token system
- Hardcoded value audit script operational for tracking progress
- Ready for Phase 15 (原子组件库) which will consume the new token system

---

_Phase: 14-pin-pai-shi-jue-she-ji-xi-tong-zhong-jian_
_Completed: 2026-04-28_

## Self-Check: PASSED

All 4 key files verified on disk. Commit `96ac4e31` verified in git history.

---
phase: 03-navigation-core-screens-calendar
plan: 01
subsystem: architecture
tags: [zustand, store-migration, feature-architecture, import-refactoring]

# Dependency graph
requires:
  - phase: 01-foundation-ts-cleanup
    provides: feature-based directory structure with feature-local stores
provides:
  - "src/stores/ directory fully deleted, zero legacy store imports"
  - "clearAllStores centralized at shared/stores/clearAllStores.ts"
  - "All store imports resolve to feature-local paths"
affects:
  [
    navigation,
    auth,
    commerce,
    wardrobe,
    onboarding,
    style-quiz,
    tryon,
    consultant,
    customization,
    community,
    notifications,
    home,
    stylist,
    profile,
  ]

# Tech tracking
tech-stack:
  added: []
  patterns: [feature-local store imports, no barrel re-exports from central stores]

key-files:
  created:
    - apps/mobile/src/shared/stores/clearAllStores.ts
  modified:
    - apps/mobile/src/features/auth/stores/index.ts
    - apps/mobile/src/features/auth/stores/authStore.ts
    - apps/mobile/src/shared/stores/index.ts
    - apps/mobile/src/navigation/RootNavigator.tsx
    - apps/mobile/src/navigation/navigationService.ts
    - apps/mobile/src/navigation/RouteGuards/AuthGuard.tsx
    - apps/mobile/src/navigation/RouteGuards/ProfileGuard.tsx
    - apps/mobile/src/navigation/RouteGuards/VipGuard.tsx
    - apps/mobile/src/navigation/RouteGuards/useRouteGuard.tsx
    - apps/mobile/src/features/profile/screens/SettingsScreen.tsx
    - apps/mobile/src/features/profile/screens/ProfileScreen.tsx
    - apps/mobile/src/features/profile/screens/SharePosterScreen.tsx
    - apps/mobile/src/features/home/screens/RecommendationsScreen.tsx
    - apps/mobile/src/features/home/components/heartrecommend/HeartRecommendScreen.tsx
    - apps/mobile/src/features/home/components/heartrecommend/PreferenceSetupModal.tsx
    - apps/mobile/src/features/wardrobe/screens/FavoritesScreen.tsx
    - apps/mobile/src/features/wardrobe/screens/ClothingDetailScreen.tsx
    - apps/mobile/src/features/style-quiz/screens/components/QuizImageCard.tsx
    - apps/mobile/src/features/onboarding/screens/steps/BasicInfoStep.tsx
    - apps/mobile/src/hooks/useAuth.ts
    - apps/mobile/src/hooks/useSeasonAccent.ts
    - apps/mobile/src/shared/hooks/useSeasonAccent.ts
    - apps/mobile/src/services/deeplinkService.ts
    - apps/mobile/src/services/quizService.ts
    - apps/mobile/src/services/onboardingService.ts
    - apps/mobile/App.tsx
  deleted:
    - apps/mobile/src/stores/ (42 files, entire directory)

key-decisions:
  - "clearAllStores uses direct feature-local store imports instead of barrel re-exports"
  - "Auth store dynamic imports changed to shared/stores/clearAllStores to break circular dependency"
  - "Feature screens with ../stores/XXX imports left unchanged when they resolve to feature-local stores"

patterns-established:
  - "Store imports always use feature-local paths (../../feature/stores/ or ../stores/ within feature)"
  - "clearAllStores is the single centralized cleanup function imported from shared/stores"

requirements-completed: [NAV-04]

# Metrics
duration: 24min
completed: 2026-04-24
---

# Phase 3 Plan 01: Zustand Store Deduplication Summary

**Deleted 42-file src/stores/ directory, migrated ~30 files to feature-local store imports, centralized clearAllStores at shared/stores/**

## Performance

- **Duration:** 24 min
- **Started:** 2026-04-24T12:11:00Z
- **Completed:** 2026-04-24T12:35:00Z
- **Tasks:** 3
- **Files modified:** 27 (plus 42 deleted)

## Accomplishments

- Eliminated entire src/stores/ directory (42 files, ~8700 lines of duplicated code)
- Created centralized clearAllStores at shared/stores/clearAllStores.ts with feature-local imports
- Migrated all store imports across navigation, feature screens, hooks, and services to feature-local paths
- tsc --noEmit passes with zero errors after migration

## Task Commits

Each task was committed atomically:

1. **Task 1: Create clearAllStores + update auth store dynamic imports** - `dfe8c9f9` (refactor)
2. **Task 2: Migrate all stores/index imports to feature-local paths** - `1541b857` (refactor)
3. **Task 3: Delete src/stores/ + fix remaining cross-feature imports** - `4d04623f` (refactor)

## Files Created/Modified

- `apps/mobile/src/shared/stores/clearAllStores.ts` - Centralized store cleanup function with feature-local imports
- `apps/mobile/src/shared/stores/index.ts` - Added clearAllStores re-export
- `apps/mobile/src/features/auth/stores/index.ts` - Dynamic import changed to shared/stores/clearAllStores
- `apps/mobile/src/features/auth/stores/authStore.ts` - Dynamic import changed to shared/stores/clearAllStores
- `apps/mobile/src/navigation/RootNavigator.tsx` - Split stores/index import to auth + commerce feature paths
- `apps/mobile/src/navigation/navigationService.ts` - Auth store import to features/auth/stores
- `apps/mobile/src/navigation/RouteGuards/*.tsx` (4 files) - Auth store import to features/auth/stores
- `apps/mobile/src/features/profile/screens/*.tsx` (4 files) - Auth store to auth/stores, profileStore stays local
- `apps/mobile/src/features/home/screens/RecommendationsScreen.tsx` - Auth store to auth/stores
- `apps/mobile/src/features/home/components/heartrecommend/*.tsx` (2 files) - Auth store to auth/stores
- `apps/mobile/src/features/wardrobe/screens/FavoritesScreen.tsx` - Auth store to auth/stores
- `apps/mobile/src/features/wardrobe/screens/ClothingDetailScreen.tsx` - SizeRecommendationStore to commerce/stores
- `apps/mobile/src/features/style-quiz/screens/components/QuizImageCard.tsx` - QuizImage type to local stores
- `apps/mobile/src/features/onboarding/screens/steps/BasicInfoStep.tsx` - OnboardingFormData to local stores
- `apps/mobile/src/hooks/useAuth.ts` - Auth store to features/auth/stores
- `apps/mobile/src/hooks/useSeasonAccent.ts` - Profile store to features/profile/stores
- `apps/mobile/src/shared/hooks/useSeasonAccent.ts` - Profile store to features/profile/stores
- `apps/mobile/src/services/deeplinkService.ts` - Auth store to features/auth/stores
- `apps/mobile/src/services/quizService.ts` - Quiz types to features/style-quiz/stores
- `apps/mobile/src/services/onboardingService.ts` - Onboarding types to features/onboarding/stores
- `apps/mobile/App.tsx` - Auth store to features/auth/stores

## Decisions Made

- clearAllStores uses direct feature-local store imports instead of re-exporting through a barrel, avoiding hidden coupling
- Feature screens with `../stores/XXX` imports that resolve within the same feature were left unchanged (already correct)
- Auth screens (`LoginScreen`, `RegisterScreen`, `PhoneLoginScreen`) use `../stores/index` which resolves to their own feature stores -- left unchanged

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] QuizImageCard.tsx had incorrect relative path depth**

- **Found during:** Task 2 (tsc --noEmit verification)
- **Issue:** Plan specified `../../../stores/quizStore` but from `features/style-quiz/screens/components/`, three levels up goes to `features/` not `features/style-quiz/`. Correct path is `../../stores/quizStore` (2 levels up).
- **Fix:** Changed to `../../stores/quizStore` which correctly resolves to `features/style-quiz/stores/quizStore`
- **Files modified:** QuizImageCard.tsx
- **Verification:** tsc --noEmit passes
- **Committed in:** 1541b857 (Task 2 commit)

**2. [Rule 3 - Blocking] App.tsx still importing from deleted src/stores/index**

- **Found during:** Task 3 (tsc --noEmit after directory deletion)
- **Issue:** App.tsx was not listed in plan's file list but imported from `./src/stores/index`
- **Fix:** Updated import to `./src/features/auth/stores`
- **Files modified:** App.tsx
- **Verification:** tsc --noEmit passes
- **Committed in:** 4d04623f (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking issues)
**Impact on plan:** Both fixes were necessary for build correctness. App.tsx omission was a plan gap. QuizImageCard path depth was a plan error.

## Issues Encountered

- Commitlint enforces lowercase subject-case, requiring lowercase commit message subjects
- lint-staged runs prettier on all staged files, occasionally causing file re-reads needed before edits

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All store imports are feature-local, ready for Phase 3 Plan 02 (navigation refactoring)
- clearAllStores is centralized and tested via tsc
- No remaining references to deleted src/stores/ directory

---

_Phase: 03-navigation-core-screens-calendar_
_Completed: 2026-04-24_

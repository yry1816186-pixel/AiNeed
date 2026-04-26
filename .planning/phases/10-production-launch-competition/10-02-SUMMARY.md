---
phase: 10-production-launch-competition
plan: 02
subsystem: mobile/offline
tags: [watermelondb, offline-storage, sync-engine, netinfo, offline-ux]
dependency_graph:
  requires: []
  provides: [watermelondb-schema, sync-engine, offline-hooks, offline-banner]
  affects: [apps/mobile]
tech_stack:
  added: ["@nozbe/watermelondb@^0.28.0", "@babel/plugin-proposal-decorators@legacy"]
  patterns:
    [
      watermelondb-schema,
      model-decorators,
      sync-engine-push-pull,
      netinfo-subscription,
      rxjs-observe-queries,
    ]
key_files:
  created:
    - apps/mobile/src/database/schema.ts
    - apps/mobile/src/database/migrations.ts
    - apps/mobile/src/database/models/CachedRecommendation.ts
    - apps/mobile/src/database/models/WardrobeItem.ts
    - apps/mobile/src/database/models/CalendarPlan.ts
    - apps/mobile/src/database/models/UserProfile.ts
    - apps/mobile/src/database/models/index.ts
    - apps/mobile/src/database/index.ts
    - apps/mobile/src/database/sync/syncEngine.ts
    - apps/mobile/src/database/sync/conflictResolver.ts
    - apps/mobile/src/hooks/useOfflineNetworkStatus.ts
    - apps/mobile/src/features/today/hooks/useOfflineRecommendations.ts
    - apps/mobile/src/features/wardrobe/hooks/useOfflineWardrobe.ts
    - apps/mobile/src/shared/components/OfflineBanner.tsx
    - apps/mobile/src/database/__tests__/schema.test.ts
    - apps/mobile/src/database/__tests__/syncEngine.test.ts
    - apps/mobile/src/hooks/__tests__/useNetworkStatus.test.ts
  modified:
    - apps/mobile/package.json
    - apps/mobile/babel.config.js
    - apps/mobile/jest.config.js
    - apps/mobile/src/hooks/useNetworkStatus.ts
decisions:
  - WatermelonDB v0.28.0 with legacy babel decorators (2023-11 syntax not supported by RN babel preset)
  - SyncEngine uses direct REST calls (not WatermelonDB synchronize()) for explicit API endpoint control
  - Separate useOfflineNetworkStatus hook (NetInfo-based) from existing useNetwork (fetch-ping-based)
  - ConflictResolver: last-write-wins + local is_dirty preservation for wardrobe_items
metrics:
  duration: 16min
  completed: "2026-04-26"
  tasks: 2
  tests: 33
  files_created: 17
  files_modified: 4
---

# Phase 10 Plan 02: WatermelonDB Offline Storage + Sync Engine Summary

WatermelonDB 离线存储替换 AsyncStorage demo 级缓存，支持 50 条推荐 + 衣橱 + 日历离线浏览，网络恢复时自动双向同步

## What Was Done

### Task 1: WatermelonDB Schema + Models + Database Init (commit: ef673e6b)

- Installed `@nozbe/watermelondb@^0.28.0` with `@babel/plugin-proposal-decorators` (legacy mode) for decorator support
- Created 4-table schema: `cached_recommendations` (7 cols), `wardrobe_items` (5 cols), `calendar_plans` (5 cols), `user_profiles` (3 cols)
- Created 4 Model classes with `@field`/`@date` decorators: CachedRecommendation, WardrobeItem, CalendarPlan, UserProfile
- Database singleton with SQLiteAdapter (`jsi: true`, `dbName: xuno_offline`)
- Updated jest.config.js transformIgnorePatterns for `@nozbe/watermelondb`
- 13 unit tests passing

### Task 2: Sync Engine + Network Detection + Offline UX Hooks (commit: 2b5eb53f)

- **SyncEngine**: push/pull/fullSync with explicit REST endpoints
  - `pullLatestRecommendations`: GET `/api/v1/recommendations?limit=50`
  - `pushLocalChanges`: POST `/api/v1/wardrobe/sync` (dirty items only)
  - `pullCalendarPlans`: GET `/api/v1/calendar?days=7`
  - `pullUserProfile`: GET `/api/v1/user/profile`
  - `fullSync`: sequential with per-step error isolation
- **ConflictResolver**: last-write-wins with `is_dirty` merge for wardrobe items
- **useOfflineNetworkStatus**: NetInfo `addEventListener` subscription with cleanup
- **useOfflineRecommendations**: WatermelonDB `observe()` with `Q.sortBy('cached_at', Q.desc)` and `Q.take(50)`
- **useOfflineWardrobe**: WatermelonDB `observe()` with `Q.where('section', ...)` filter
- **OfflineBanner**: `#E17055` brand orange animated banner with "离线模式" text
- 20 new tests (10 SyncEngine + 4 network status + 6 ConflictResolver)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Babel decorators version mismatch**

- **Found during:** Task 1 test execution
- **Issue:** `@babel/plugin-proposal-decorators` version `2023-11` uses static class blocks not supported by RN babel preset
- **Fix:** Switched to `legacy` decorator mode
- **Files modified:** apps/mobile/babel.config.js
- **Commit:** ef673e6b

**2. [Rule 3 - Blocking] .gitignore `models/` pattern blocks database/models/ directory**

- **Found during:** Task 1 git staging
- **Issue:** Root `.gitignore` has `models/` pattern that matches `apps/mobile/src/database/models/`
- **Fix:** Used `git add -f` to force-add model files
- **Files:** all files in apps/mobile/src/database/models/

**3. [Rule 1 - Bug] WatermelonDB schema tables ColumnMap structure in tests**

- **Found during:** Task 1 test execution
- **Issue:** Tests assumed `table.columns` was an array, but WatermelonDB stores it as an object (ColumnMap)
- **Fix:** Changed test assertions to use `Object.keys(table.columns)` and direct property access
- **Files:** apps/mobile/src/database/**tests**/schema.test.ts
- **Commit:** ef673e6b

## Verification Results

- 33/33 tests passing (`pnpm test -- --testPathPattern="database|sync|useNetworkStatus"`)
- `@nozbe/watermelondb` in dependencies
- `database/` directory: schema.ts, models/, sync/, index.ts
- `#E17055` in OfflineBanner.tsx
- `/api/v1/recommendations`, `/api/v1/wardrobe/sync`, `/api/v1/calendar` in syncEngine.ts

## Threat Flags

No new threat surface beyond plan's threat_model. All cached data is non-PII per T-10-10 mitigation.

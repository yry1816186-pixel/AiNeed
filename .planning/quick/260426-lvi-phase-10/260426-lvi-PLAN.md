# Quick Task 260426-lvi: Phase 10 全部完成，修复后跑全栈 - Plan

**Mode:** quick
**Created:** 2026-04-26

## Task 1: Fix DesignTokens type gaps

**Files:**

- `apps/mobile/src/design-system/theme/tokens/design-tokens.ts`
- `apps/mobile/src/shared/contexts/ThemeContext.tsx`

**Action:**

1. Add missing `funnel` colors to `darkTokens` (light already has it)
2. Add missing `warmPrimary` color section with `ocean`, `mint`, `coral` sub-palettes to both DesignTokens and darkTokens
3. Add missing `semantic.error.light` and `semantic.error.dark` as aliases for `errorLight`/`errorDark`
4. Fix ThemeContext TokenSet type to match actual token structure

**Verify:** `tsc --noEmit` passes for both token file and ThemeContext

## Task 2: Fix module resolution errors (TS2307)

**Files:**

- `apps/mobile/src/database/models/*.ts` (WatermelonDB models)
- `apps/mobile/src/database/sync/syncEngine.ts`
- Various files with broken relative imports

**Action:**

1. Add WatermelonDB type declarations if missing (`@nozbe/watermelondb` types)
2. Fix broken relative import paths (`../../types/clothing`, `../../design-system/theme/tokens/*`, etc.)
3. Add missing module declarations for `path`, `fs` (Node.js built-ins used in scripts)

**Verify:** No more TS2307 errors

## Task 3: Fix remaining type errors across all files

**Files:**

- 80 files with TS errors (see tsc output)

**Action:**

1. Fix TS2339 property-not-exist errors (mostly warmPrimary.ocean/mint/coral references)
2. Fix TS2322 type mismatches (ThemeContext, AlgorithmVisualization)
3. Fix TS2304 cannot-find-name errors (withSequence import, missing variables)
4. Fix TS2769/TS2345 overload/argument type errors
5. Fix TS1240 export definition issues
6. Fix TS7006 implicit-any parameters
7. Exclude `scripts/` from tsconfig (audit scripts use Node.js APIs not available in RN)

**Verify:** `tsc --noEmit` returns 0 errors

## Task 4: Start full-stack services

**Action:**

1. Start backend: `pnpm dev` (NestJS on port 3001)
2. Start mobile: `pnpm dev:mobile` (Metro on port 8081)
3. Verify both services start without errors

**Verify:** Backend responds on :3001, Metro bundler runs on :8081

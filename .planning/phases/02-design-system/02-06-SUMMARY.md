---
phase: 02
plan: 06
status: complete
started: "2026-04-17T01:00:00Z"
completed: "2026-04-17T02:00:00Z"
---

# Plan 06 Summary: 移除废弃配置 + 最终审计

## What Was Built

Removed the dead `src/theme/` shim directory and updated all consumers to import directly from `design-system/theme`. Fixed import conflicts and truncated files.

## Tasks Completed

1. **Removed `src/theme/` directory** — All 10 files were pure re-export shims pointing to `design-system/theme/`. Deleted the entire directory.
2. **Updated 20+ consumer files** — Replaced `@/src/theme/tokens/*` and `../theme/tokens/*` imports with direct `design-system/theme` barrel imports.
3. **Fixed duplicate imports** — Merged separate `DesignTokens` + `Colors` + `Spacing` imports into single barrel imports.
4. **Fixed `design-system/ui/index.tsx`** — ThemeSystem import path was broken (pointed to non-existent `../theme/ThemeSystem`), updated to `../../shared/components/theme/ThemeSystem`.
5. **Fixed SmartRecommendations.tsx** — File was truncated at `PersonalizedFe`, restored to `PersonalizedFeed`.
6. **Fixed SKU selector naming conflicts** — `colors` prop name conflicted with `flatColors as colors` import and `useTheme()` destructured `colors`. Renamed to avoid collision.

## Known Issues

- **TS errors remain (~1105)**: The codemod from Plan 02-05 introduced `flatColors as colors` imports in ~100 files that also use `const { colors } = useTheme()`, creating duplicate identifier errors. This is a systematic issue that needs a follow-up phase to resolve.
- **Pre-existing TS errors**: commerce/types/index.ts has duplicate enum declarations, and there are ~415 TS2304 (Cannot find name) errors from other sources.

## Files Modified

- Deleted: `apps/mobile/src/theme/` (10 files)
- Modified: ~30 consumer files (import path updates)
- Fixed: `design-system/ui/index.tsx`, `SmartRecommendations.tsx`, `InlineSKUSelector.tsx`, `SKUSelector.tsx`

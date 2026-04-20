---
phase: 02
plan: 01
status: complete
started: "2026-04-17T00:00:00Z"
completed: "2026-04-17T00:15:00Z"
---

# Plan 01 Summary: 统一令牌定义冲突 + 废弃 PlayfairDisplay

## What Was Built

Unified design token definitions across the token system, resolving conflicts between DesignTokens and typography.ts/spacing.ts.

## Tasks Completed

1. **Task 01-01**: FontSizes aligned with DesignTokens.typography.sizes — xs=11, sm=12, base=14, md=16 added
2. **Task 01-02**: BorderRadiusScale aligned with DesignTokens.borderRadius — lg=10, xl=16, 2xl=24, 3xl=32, full=9999. Removed duplicate 5xl/6xl/7xl entries
3. **Task 01-03**: Deprecated PlayfairDisplay font, replaced with Georgia (iOS) / serif (Android) fallback
4. **Task 01-04**: Fixed purple→terracottaDark alias in buildFlatThemeColors. themeColors export already existed for nested DesignTokens access. Kept nested properties in flatColors (brand, text, etc.) as objects to avoid breaking 77 consumer files.

## Key Decisions

- **Did NOT flatten brand/text/semantic to strings in flatColors**: 320 references across 77 files use `colors.brand.terracotta`, `colors.text.primary` etc. Flattening would break all of them. The `themeColors` export already provides the nested access pattern.
- **Removed duplicate BorderRadiusScale entries**: 5xl:32 was same as 3xl, 6xl:40 and 7xl:48 were redundant with 4xl:48

## Files Modified

- `apps/mobile/src/design-system/theme/tokens/typography.ts` — FontSizes aligned, PlayfairDisplay deprecated
- `apps/mobile/src/design-system/theme/tokens/spacing.ts` — BorderRadiusScale aligned, duplicates removed
- `apps/mobile/src/design-system/theme/index.ts` — purple→terracottaDark alias fix
- `apps/mobile/src/design-system/theme/FlatColors.ts` — No net change (reverted flattening)

## Deviations

- Task 01-04 was adjusted: kept nested object properties in flatColors instead of flattening to strings, as the impact analysis showed 77 files would break. The plan's intent (ensuring `theme.colors.text` returns a usable value) is already served by the existing `textPrimary`, `textSecondary` etc. flat properties.

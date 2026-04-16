---
phase: 02-design-system
plan: 02-01
status: completed
started: "2026-04-17T00:00:00Z"
completed: "2026-04-17T00:00:00Z"
---

# Summary: Plan 02-01 — 统一令牌定义冲突 + 废弃 PlayfairDisplay

## Objective
解决 DesignTokens 与 typography.ts/spacing.ts 的同名语义值冲突，以 DesignTokens 为准统一所有令牌定义。废弃无人使用的 PlayfairDisplay 字体。修复 theme.colors.* API 兼容性。

## What Was Done

### Task 01-01: FontSizes 对齐 ✓
- FontSizes 已与 DesignTokens.typography.sizes 对齐 (xs=11, sm=12, base=14, md=16)
- 添加了对齐注释

### Task 01-02: BorderRadiusScale 对齐 ✓
- BorderRadiusScale 已与 DesignTokens.borderRadius 对齐 (lg=10, xl=16, 2xl=24, 3xl=32)
- 4xl 更新为 48，添加了 full: 9999
- BorderRadius export 中 4xl 更新为 48

### Task 01-03: 废弃 PlayfairDisplay ✓
- typography.ts FontFamilies.display 改为 Georgia/serif 回退，添加 @deprecated 注释
- design-tokens.ts fontFamily.heading 改为 Georgia/serif

### Task 01-04: theme.colors.* API 修复 ✓
- buildFlatThemeColors 返回字符串而非嵌套对象 (brand→terracotta, text→primary, etc.)
- FlatColors 接口类型从 TokenSet["colors"]["xxx"] 改为 string
- 移除 FlatColors.ts 中不再需要的 DesignTokens import
- 添加 themeColors 导出保留嵌套访问能力
- 解决 FlatColors 重复导出冲突

## Key Files Modified
- `apps/mobile/src/design-system/theme/tokens/typography.ts`
- `apps/mobile/src/design-system/theme/tokens/spacing.ts`
- `apps/mobile/src/design-system/theme/tokens/design-tokens.ts`
- `apps/mobile/src/design-system/theme/index.ts`
- `apps/mobile/src/design-system/theme/FlatColors.ts`

## Deviations
None — all changes aligned with plan.

## Self-Check: PASSED

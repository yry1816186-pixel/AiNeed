# Phase 2: 设计系统统一 - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning
**Source:** User-provided detailed requirements

<domain>
## Phase Boundary

将所有硬编码颜色、字号、间距替换为设计令牌引用，实现品牌一致性。具体范围：
1. 60+ 处屏幕文件硬编码十六进制颜色
2. 60+ 处组件文件硬编码颜色
3. ProfileSetupFlow 紫色/粉色渐变与品牌色冲突
4. DragSortList 紫色硬编码
5. SearchScreenParts 紫色调
6. ClothingCard 自定义颜色映射未走设计令牌
7. fontSize 随意硬编码
8. DesignTokens 与 typography.ts 同名语义值冲突
9. borderRadius 两套定义值不同
10. PlayfairDisplay 字体定义了但无人使用

</domain>

<decisions>
## Implementation Decisions

### 冲突解决（以 DesignTokens 为准）
- D-01: DesignTokens.typography.sizes 与 typography.ts FontSizes 冲突，以 DesignTokens 为准（sm:12, base:14, xs:11）
- D-02: DesignTokens.borderRadius.lg=10 与另一套定义 lg=8 冲突，以 DesignTokens 为准（lg:10）
- D-03: typography.ts 中 FontSizes 的 sm=14/base=16 需要修改为与 DesignTokens 一致（sm:12, base:14）
- D-04: PlayfairDisplay 字体在 FontFamilies.display 中定义但无人使用，标记为 @deprecated 或删除（无字体文件）

### 颜色替换策略
- D-05: 所有硬编码颜色替换为 colors.xxx 令牌引用
- D-06: 紫色系（#a855f7, #ec4899, #6C5CE7, #F3F1FF 等）替换为品牌色系（Terracotta/warmPrimary/coral）
- D-07: Material Design 默认色（#4CAF50, #FFC107 等）替换为 DesignTokens.semantic 对应值
- D-08: ClothingCard 自定义颜色映射改为走 DesignTokens.colors 令牌

### 字体替换策略
- D-09: 所有硬编码 fontSize 替换为 typography.fontSize.xxx（使用 DesignTokens.typography.sizes 值）
- D-10: 不在设计令牌中的 fontSize 值（13, 15, 26 等）映射到最近的令牌值

### 间距替换策略
- D-11: 所有硬编码间距替换为 spacing.xxx

### 品牌色优先级
- D-12: 优先修复品牌色冲突（紫色→Terracotta），这是最显眼的品牌不一致问题
- D-13: ProfileSetupFlow 渐变从 #a855f7/#ec4899 改为 DesignTokens.gradients.brand 或 Terracotta 系渐变
- D-14: DragSortList #6C5CE7 改为 DesignTokens.colors.brand.terracotta
- D-15: SearchScreenParts #F3F1FF 改为 DesignTokens.colors.backgrounds.tertiary 或 warmPrimary 色调

### 约束
- D-16: 不改变设计令牌的定义值
- D-17: 每替换一个文件验证编译通过
- D-18: 优先修复品牌色冲突（紫色→Terracotta）

### Claude's Discretion
- 具体文件的替换顺序和分组策略
- codemod vs 手动替换的选择
- 暗色模式兼容性的处理方式（静态 vs 响应式 token）
- 视觉回归验证方法

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Token System
- `apps/mobile/src/design-system/theme/tokens/design-tokens.ts` — 主设计令牌定义（品牌色、排版、间距、圆角、阴影）
- `apps/mobile/src/design-system/theme/tokens/typography.ts` — 字体系统（FontFamilies, FontSizes, FontWeights, LineHeights, TextStyles）
- `apps/mobile/src/design-system/theme/tokens/colors.ts` — 颜色系统（WarmPrimaryColors, BrandColors, PrimaryColors 等）
- `apps/mobile/src/design-system/theme/tokens/spacing.ts` — 间距系统（SpacingScale, SpacingAliases, BorderRadiusScale）
- `apps/mobile/src/design-system/theme/tokens/animations.ts` — 动画令牌
- `apps/mobile/src/design-system/theme/FlatColors.ts` — 扁平化颜色类型定义
- `apps/mobile/src/design-system/theme/index.ts` — 主题入口和导出

### Theme Context
- `apps/mobile/src/contexts/ThemeContext.tsx` — 暗色模式支持，useTheme() hook

### Research
- `.planning/phases/02-design-system/02-RESEARCH.md` — 完整审计数据（972 hex colors, 856 fontSize, 1174 spacing）

</canonical_refs>

<specifics>
## Specific Ideas

### 冲突值对照表

| 属性 | DesignTokens | typography.ts | 决策 |
|------|-------------|---------------|------|
| sizes.sm | 12 | 14 | 以 DesignTokens 为准: 12 |
| sizes.base | 14 | 16 | 以 DesignTokens 为准: 14 |
| sizes.xs | 11 | 12 | 以 DesignTokens 为准: 11 |
| borderRadius.lg | 10 | 8 | 以 DesignTokens 为准: 10 |

### 紫色→品牌色替换映射

| 硬编码值 | 所在文件 | 替换为 |
|---------|---------|--------|
| #a855f7 | ProfileSetupFlow | DesignTokens.colors.brand.terracotta (#C67B5C) |
| #ec4899 | ProfileSetupFlow | DesignTokens.colors.brand.camel (#B5A08C) |
| #6C5CE7 | DragSortList | DesignTokens.colors.brand.terracotta (#C67B5C) |
| #F3F1FF | SearchScreenParts | DesignTokens.colors.backgrounds.tertiary (#F5F5F3) |

### Material Design 默认色替换

| 硬编码值 | 语义 | 替换为 |
|---------|------|--------|
| #4CAF50 | 成功绿 | DesignTokens.colors.semantic.success (#5B8A72) |
| #FFC107 | 警告黄 | DesignTokens.colors.semantic.warning (#D9A441) |
| #F44336 | 错误红 | DesignTokens.colors.semantic.error (#C44536) |
| #2196F3 | 信息蓝 | DesignTokens.colors.semantic.info (#7B8FA2) |

</specifics>

<deferred>
## Deferred Ideas

- 暗色模式全面迁移（将颜色从 StyleSheet.create 移到 useTheme()）— 需要大规模重构，建议作为后续 phase
- 视觉回归自动化测试（Detox 截图对比）— 需要基础设施
- codemod 工具开发 — 可选，手动替换也可行

</deferred>

---

*Phase: 02-design-system*
*Context gathered: 2026-04-17 via user-provided requirements*

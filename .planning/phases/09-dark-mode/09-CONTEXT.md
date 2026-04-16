# Phase 9: 深色模式可用化 - Context

**Gathered:** 2026-04-17 (updated)
**Status:** Ready for replanning (Plans 01-04 executed, Plan 05 pending)
**Source:** User requirements + codebase research + execution audit

<domain>
## Phase Boundary

将深色模式从"纸上谈兵"变为真正可用。Plans 01-04 已完成主要迁移工作（86 文件 useTheme、75 文件 createStyles），剩余 Plan 05 需要处理子组件硬编码颜色、elevation 阴影修复、以及最终审计。

**不包含：** 新增暗色模式设计稿、新增暗色专属功能、修改后端 API。

</domain>

<decisions>
## Implementation Decisions

### D-01: 开启 dark_mode feature flag ✅ DONE
- FeatureFlagDefaults.dark_mode 从 false 改为 true
- ThemeContext 中读取 dark_mode 标志控制暗色模式可用性
- 当 flag 关闭时，强制使用浅色模式（忽略用户设置）

### D-02: 迁移策略 — 渐进式迁移 ✅ DONE
- 将 `import { theme }` 逐步迁移为 `const { colors } = useTheme()`
- 静态 theme 导入和动态 useTheme 可以共存过渡期
- 迁移顺序：先核心页面（Home、Profile、TryOn），再次要页面
- StyleSheet.create 中的静态引用改为函数式 createStyles 模式

### D-03: StatusBar 动态化 ✅ DONE
- `barStyle` 改为 `isDark ? "light-content" : "dark-content"`
- `backgroundColor` 改为 `colors.surface`（动态值）

### D-04: 消除硬编码白色背景 — PARTIAL
- `backgroundColor: "#FFFFFF"` 替换为 `colors.surface`
- 浅色变体 `#FFF5F0`、`#FFF8F5` 等替换为语义化 token
- 原始 71 处 → 当前 5 文件 13 处（82% 消除）
- **剩余文件：** TrendingCard.tsx(1), FollowButton.tsx(2), ProductImageCarousel.tsx(1), PaperThemeProvider.tsx(1)
- **`#FFF*` 变体剩余：** TimeSlotItem.tsx(1), TrendingCard.tsx(1), FollowButton.tsx(2), ProductImageCarousel.tsx(1), SKUSelector.tsx(1), ThemeContext.tsx(1)

### D-05: 统一 FlatColors 接口 ✅ DONE
- 合并三处 FlatColors 定义为一处（保留 design-system/theme/FlatColors.ts 作为唯一来源）
- 旧版 contexts/ThemeContext.tsx 标记 @deprecated

### D-06: Paper elevation 层级差异 — TODO
- PaperThemeProvider 已正确配置暗色 elevation
- 57 处 elevation 使用（30 文件），其中 design-tokens.ts(13) + shadows.ts(10) 是 token 定义
- 组件层约 34 处需添加 shadowColor/shadowOpacity
- 关键浮动组件：AICompanionBall, AICompanionMenu, EnhancedAICompanionBall, CreatePostFab, SwipeRecommendationCard

### D-07: 不改变浅色模式视觉效果 ✅ CONFIRMED
- 所有修改在浅色模式下必须产生与当前完全一致的视觉效果
- 迁移后浅色模式的 colors 值应与静态 theme.colors 完全相同

### D-08: 静态 theme 导入残留 — TODO
- 6 个文件仍使用 `import { theme } from design-system/theme`:
  - ImportSheet.tsx, PostDetailScreen.tsx, FollowButton.tsx, BookmarkSheet.tsx, Toast.tsx, compat.test.ts
- compat.test.ts 是测试文件，可保留
- 其余 5 个需迁移

### Claude's Discretion
- 具体迁移每个文件的实现细节
- elevation 修复的优先级和范围
- 是否需要 codemod 脚本辅助批量迁移
- 测试策略的具体实施

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 主题系统核心
- `apps/mobile/src/shared/contexts/ThemeContext.tsx` — 动态主题 Provider，useTheme() + createStyles 钩子来源
- `apps/mobile/src/design-system/theme/index.ts` — 静态 theme 对象导出（需消除的导入目标）
- `apps/mobile/src/design-system/theme/FlatColors.ts` — FlatColors 接口定义（唯一来源）
- `apps/mobile/src/design-system/theme/tokens/design-tokens.ts` — DesignTokens + darkTokens 定义，elevation 颜色需添加
- `apps/mobile/src/design-system/theme/tokens/shadows.ts` — 阴影 token 定义

### Paper 主题适配
- `apps/mobile/src/design-system/ui/PaperThemeProvider.tsx` — Paper 主题 Provider，消费 isDark，elevation 层级配置

### Feature Flags
- `apps/mobile/src/constants/feature-flags.ts` — dark_mode 特性标志定义

### 入口文件
- `apps/mobile/App.tsx` — StatusBar 动态化已完成

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useTheme()` — 86 文件已使用，返回 `{ colors, isDark }` 等
- `createStyles()` — 75 文件已使用，动态 StyleSheet 工厂函数
- `FlatColors` — 统一接口，包含 surface, textPrimary, border 等 40+ 语义化颜色

### Established Patterns
- 标准迁移模式：`import { theme }` → `const { colors } = useTheme()` + `const styles = createStyles(colors)`
- 硬编码颜色替换：`#FFFFFF` → `colors.surface`，`#FFF5F0` → `colors.cartLight`
- elevation 修复模式：添加 `shadowColor: colors.textPrimary, shadowOpacity: isDark ? 0.3 : 0.1`

### Integration Points
- ThemeContext.tsx 是所有动态颜色的来源
- PaperThemeProvider.tsx 消费 isDark 配置 Paper 组件库主题
- FeatureFlagDefaults.dark_mode 控制暗色模式可用性

### Current Metrics
| 指标 | 原始 | 当前 | 目标 |
|------|------|------|------|
| useTheme 使用 | ~0 | 86 文件 | 所有 UI 文件 |
| createStyles 使用 | 0 | 75 文件 | 所有 StyleSheet 文件 |
| #FFFFFF 硬编码 | 71 | 5 文件/13处 | < 5 (仅 token 定义) |
| 静态 theme 导入 | ~100 | 6 文件 | 2 (PaperThemeProvider + theme/index.ts) |
| elevation 无阴影 | 92 | 34 组件层 | 关键浮动组件修复 |

</code_context>

<specifics>
## Specific Ideas

1. **elevation 修复策略**: 优先处理用户可见的浮动元素（FAB、浮动卡片、弹窗），非关键 elevation 可暂不处理
2. **剩余硬编码颜色**: TrendingCard, FollowButton, ProductImageCarousel, SKUSelector, TimeSlotItem, BookmarkSheet, ImportSheet, PostDetailScreen
3. **验证方法**: 每迁移一个页面，在浅色/深色模式下分别截图对比

</specifics>

<deferred>
## Deferred Ideas

- 暗色模式专属设计优化（如调整暗色下的对比度、色彩饱和度）
- 自动暗色模式截图回归测试
- 暗色模式动画过渡效果
- 旧版 contexts/ThemeContext.tsx 的完全移除（仅标记 @deprecated）
- 非关键 elevation 组件的全面修复

</deferred>

---

*Phase: 09-dark-mode*
*Context gathered: 2026-04-17*
*Context updated: 2026-04-17*

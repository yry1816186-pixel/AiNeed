# Phase 2: 设计系统统一 — Research

**Gathered:** 2026-04-16
**Status:** Complete

## 关键发现：三重主题 API 问题

移动应用中存在三种不同的主题 API 并存，这是最关键的问题：

| API | 模式 | 使用情况 | 暗色模式 |
|-----|------|---------|----------|
| **旧版 `theme.colors.*`** | `theme.colors.text`, `theme.colors.primary`, `theme.colors.surface` | ~86 文件, ~1,671 处 | 不支持（静态） |
| **基于规模的 `Colors.*`** | `Colors.primary[500]`, `Colors.neutral[200]`, `Colors.white` | ~89 文件, ~886 处 | 不支持（静态） |
| **新语义化 `DesignTokens.*`** | `DesignTokens.colors.text.primary`, `DesignTokens.colors.backgrounds.primary` | ~100 文件, ~1,034 处 | 通过 ThemeContext 支持 |

**严重错误**：`theme` 导出现在指向 `DesignTokens.colors`，它具有嵌套结构。这意味着 `theme.colors.text` 返回的是一个对象 `{ primary, secondary, tertiary, inverse, brand }`，而不是一个字符串。在 86 个文件中，所有使用 `theme.colors.text` 作为颜色值的地方目前都已损坏。

## 硬编码值审计（更新数据）

| 类别 | 计数 | 文件数 | 备注 |
|------|------|--------|------|
| 十六进制颜色 (`#xxx`) | ~972 | ~100 | 包括 token 定义 |
| rgba() 颜色 | ~271 | ~81 | 许多是覆盖/玻璃效果 |
| 硬编码 `fontSize` | ~856 | ~100 | 主要是内联数字 |
| 硬编码 `fontWeight` | ~551 | ~100 | 字符串如 "600", "700" |
| 硬编码 `lineHeight` | ~132 | ~69 | 通常与 fontSize 配对 |
| 硬编码间距 | ~1,174 | ~100 | padding/margin/gap/width/height |

## 当前 Token 系统（已存在且功能完善）

位于 `src/theme/tokens/` 的 token 系统已包含：

- **design-tokens.ts**：包含 `colors`（品牌、中性、语义、背景、文本、边框）、`typography`、`spacing`、`borderRadius`、`shadows`、`animation`、`gradients`、`breakpoints`、`motif` 的 `DesignTokens` + `darkTokens`
- **colors.ts**：`WarmPrimaryColors`、`BrandColors`、`PrimaryColors`、`SecondaryColors`、`GradientPresets`、`SemanticColors`、`FashionColors`
- **typography.ts**：`FontFamilies`、`FontSizes`、`FontWeights`、`LineHeights`、`LetterSpacing`、`TextStyles`（hero, h1-h6, body, caption, overline, label, button, price）
- **spacing.ts**：`SpacingScale`、`SpacingAliases`、`BorderRadiusScale`、`LayoutSpacing`
- **animations.ts**：`SpringConfigs`、`Duration`、`Easing`、`FadeAnimations`、`ScaleAnimations` 等
- **season-colors.ts**：季节性强调色系统

## 暗色模式（已实现）

`ThemeContext.tsx` 提供了完整的暗色模式支持：
- 三种模式：light / dark / system
- 通过 `AsyncStorage` 持久化
- `darkTokens` 包含适当的反转中性色阶和提亮的品牌色
- `useTheme()` hook 提供响应式 token
- **问题**：只有 10 个文件使用了 `useTheme()`，大多数文件使用了静态导入

## NativeWind/Tailwind（死配置）

三个配置文件，**零源代码使用**：
- `tailwind.config.js` — 包含品牌颜色定义，但未被消费
- `nativewind.config.js` — 指向 tailwind config
- `postcss.config.js` — 引用 nativewind/postcss
- 源代码中没有 `className=`，也没有 `import from 'nativewind'` 或 `import from 'tailwind'`

## React Native Paper（最小使用）

只有 1 个文件导入了 Paper：`PaperThemeProvider.tsx`。它从 `DesignTokens` 创建了 MD3 主题。没有组件直接使用 Paper 组件。

## 样式消费模式

| 模式 | 计数 | 备注 |
|------|------|------|
| `StyleSheet.create` | 101 文件 | 主要模式 |
| `from '../../theme'` | 100 文件 | 静态 token 导入 |
| `from '../../theme/tokens/design-tokens'` | 100 文件 | 直接 DesignTokens 导入 |
| `from '../../theme/tokens/animations'` | 17 文件 | 动画 token |
| `from '../../contexts/ThemeContext'` | 11 文件 | 响应式暗色模式 |
| 内联样式 | 35 文件 | 混合 |

## 已使用 Token（无需迁移）

- `Spacing[4]` / `Spacing.md`：64 文件中约 898 处
- `BorderRadius.xl`：63 文件中约 248 处
- `Shadows.md`：39 文件中约 54 处
- `Typography.heading.xl`：20 文件中约 73 处

## 语义化 Token 命名（DSGN-06 所需）

`DesignTokens` 已经有了语义化名称：
- `colors.text.primary` / `.secondary` / `.tertiary` / `.inverse` / `.brand`
- `colors.backgrounds.primary` / `.secondary` / `.tertiary / `.elevated` / `.overlay`
- `colors.borders.light` / `.default` / `.strong` / `.brand`
- `colors.semantic.success` / `.warning` / `.error` / `.info`

**缺失的语义化 token** 需要创建：
- `typography.styles.*` 已存在（hero, h1-h6, body, caption, label, button, price），但很少使用
- 间距目前是数字型的（`Spacing[4]`），需要语义化别名（`padding.screen`, `gap.card` 等）
- 需要为常见组合（卡片高度、按钮尺寸等）创建尺寸 token

## 对 Phase 1 的依赖

Phase 2 依赖于 Phase 1 的完成，具体包括：
- Phase 0：CI 流水线（在批量替换前需要视觉回归测试）
- Phase 1：根目录清理（移除可能干扰 codemod 的临时文件）
- Phase 1：ESLint 配置（可以添加规则来阻止新的硬编码值）

## Codemod 策略考量

1. **ts-morph** 是 React Native 样式迁移的最佳工具（项目已在 Phase 7 中用于 any 修复）
2. **三阶段方法**：首先审计/分类，然后生成映射，最后替换
3. **关键顺序**：首先修复损坏的 `theme.colors.*` API，然后迁移硬编码值
4. **`StyleSheet.create` 限制**：静态 token 可以在 `StyleSheet.create` 中使用，但响应式暗色模式 token 需要 `useTheme()` hook，这需要将样式移出 `StyleSheet.create`

## 暗色模式架构决策

最大的架构决策是：**静态 token 还是响应式 token？**

- **静态**（当前大多数代码的方法）：`import { Colors } from '../../theme'` — 暗色模式下不工作
- **响应式**（`ThemeContext` 方法）：`const { colors } = useTheme()` — 暗色模式下工作，但需要将样式移出 `StyleSheet.create` 到内联/组件中

**建议**：对于暗色模式兼容性，需要使用响应式方法。这意味着 `StyleSheet.create` 中的样式只能包含非颜色值（间距、排版、布局），而颜色必须通过 `useTheme()` 动态应用。

## 视觉回归测试

对于 React Native，选项包括：
- **Detox**：项目已配置（`apps/mobile/e2e/`），但需要截图测试插件
- **React Native 截图测试**：Jest + `react-test-renderer` 快照
- **手动方法**：在迁移前后对关键屏幕进行截图

## 风险评估

| 风险 | 严重性 | 缓解措施 |
|------|----------|------------|
| 损坏的 `theme.colors.*` API 导致迁移后渲染损坏 | 高 | 首先修复，映射旧平面名称到新的嵌套名称 |
| 语义分类错误（相同的十六进制值，不同的含义） | 高 | 按上下文审计，而非按值审计 |
| 暗色模式回归 | 中 | 需要响应式 token，而不仅仅是静态替换 |
| `StyleSheet.create` 重构范围 | 中 | 逐步迁移，而非一次性完成 |
| Codemod 误报 | 中 | 人工审查语义映射 |

## Validation Architecture

### Dimension 1: Token Completeness
- **验证点**：每个硬编码值都有对应的语义化 token
- **方法**：审计脚本扫描所有硬编码值，与 DesignTokens 定义交叉验证
- **阈值**：用户可见组件中 0 处硬编码值

### Dimension 2: Semantic Correctness
- **验证点**：相同值不同语义不会被错误合并
- **方法**：人工审查语义映射表，确认每个替换的上下文正确
- **阈值**：0 处语义错误替换

### Dimension 3: Dark Mode Compatibility
- **验证点**：所有颜色 token 在暗色模式下有正确的替代值
- **方法**：切换暗色模式后截图对比
- **阈值**：核心页面暗色模式无视觉异常

### Dimension 4: Visual Regression
- **验证点**：迁移前后视觉一致
- **方法**：核心页面截图对比
- **阈值**：0 处非预期的视觉变化

### Dimension 5: API Compatibility
- **验证点**：旧版 `theme.colors.*` API 兼容层正确工作
- **方法**：运行时验证所有 theme.colors 引用返回字符串
- **阈值**：0 处类型错误（返回对象而非字符串）

### Dimension 6: Build Integrity
- **验证点**：Metro bundler 正常启动，TypeScript 编译无错误
- **方法**：`tsc --noEmit` + Metro 启动验证
- **阈值**：0 处编译错误

### Dimension 7: Dead Code Removal
- **验证点**：NativeWind/Tailwind 配置完全移除
- **方法**：文件不存在检查 + import 扫描
- **阈值**：0 处 NativeWind/Tailwind 引用

### Dimension 8: Performance
- **验证点**：样式迁移不引入性能回退
- **方法**：核心页面渲染时间对比
- **阈值**：渲染时间增加 < 5%

## 计划建议

1. **步骤 0**：修复损坏的 `theme.colors.*` API — 创建兼容层，将旧平面名称映射到新的嵌套名称
2. **步骤 1**：审计所有硬编码值，按语义上下文分类（而非按值）
3. **步骤 2**：创建缺失的语义化 token（间距别名、尺寸 token）
4. **步骤 3**：编写 codemod，分三波替换：颜色 -> 排版 -> 间距
5. **步骤 4**：将颜色从 `StyleSheet.create` 迁移到响应式 `useTheme()`
6. **步骤 5**：移除 NativeWind/Tailwind 死配置
7. **步骤 6**：验证暗色模式和视觉回归

---

*Phase: 02-design-system*
*Research gathered: 2026-04-16*

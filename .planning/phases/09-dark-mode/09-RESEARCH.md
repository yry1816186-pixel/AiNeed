# Phase 9: 深色模式可用化 - Research

**Researched:** 2026-04-17
**Status:** Complete

## Research Summary

ThemeContext 动态基础设施已完整就绪，但 UI 层几乎完全未接入。核心矛盾是：约 100 个文件使用静态 `import { theme }`，仅 19 处使用 `useTheme()`，且大多数 useTheme 调用仅获取 seasonAccent 而非动态颜色。

---

## 1. FeatureFlagDefaults.dark_mode

**文件**: `apps/mobile/src/constants/feature-flags.ts`
- `DARK_MODE: "dark_mode"` (第8行)
- `dark_mode: false` (第21行)
- **死开关**: 没有任何代码读取 `dark_mode` 标志来控制主题行为
- `useFeatureFlags` 仅在 5 个文件中使用，均与暗色模式无关

## 2. 静态主题导入统计

**总计约 100 处**，分两类：

### 从 design-system/theme 导入（约 80 处）
- 所有 features/ 下的屏幕文件
- 所有 design-system/ui/ 组件
- App.tsx

### 从旧路径 ../../theme 导入（约 20 处）
- screens/ 下的旧版页面
- components/ 下的旧版组件

**根因**: `design-system/theme/index.ts` 第479行静态构建 theme 对象：
```typescript
const flatColors = buildFlatThemeColors(DesignTokens.colors);
export const theme = { colors: flatColors, ... };
```
永远使用浅色 tokens，不响应主题切换。

## 3. useTheme() 使用统计

**总计 19 处调用**，但仅 2 处实际感知暗色模式：
- `SettingsScreen.tsx` — 使用 `{ isDark, setMode }`
- `PaperThemeProvider.tsx` — 使用 `{ isDark }`

其余 17 处仅获取 `seasonAccent`，与暗色模式无关。

**关键缺失**: 没有任何屏幕使用 `useTheme().colors` 获取动态颜色。

## 4. ThemeContext 架构

### 新版（App.tsx 使用）: shared/contexts/ThemeContext.tsx
- 完整的暗色模式支持：darkTokens、darkFlatColors、isDark
- 持久化到 AsyncStorage
- 支持 light/dark/system 三种模式
- 提供：theme, mode, isDark, tokens, colors, typography, spacing, setMode, toggleTheme

### 旧版: contexts/ThemeContext.tsx
- 逻辑基本相同，从 FlatColors.ts 导入类型
- 应标记为 @deprecated

### Provider 嵌套（App.tsx 第230-267行）
```
GestureHandlerRootView → UnifiedThemeProvider → PaperThemeProvider → I18nProvider → FeatureFlagProvider → SafeAreaProvider → QueryClientProvider → NavigationContainer
```

## 5. FlatColors 接口不一致

| 定义位置 | text 字段类型 | like 字段 |
|----------|-------------|-----------|
| design-system/theme/FlatColors.ts | `string` | 不存在 |
| shared/contexts/ThemeContext.tsx | `TokenSet["colors"]["text"]` (对象) | 不存在 |
| contexts/ThemeContext.tsx | 继承 FlatColors.ts = `string` | 不存在 |

**问题**: `text` 字段类型冲突。实际赋值 `text: base.text.primary` 为 string，所以 FlatColors.ts 的 `string` 类型正确，shared/ThemeContext.tsx 的对象类型定义错误。

**"like" 字段不存在于任何定义中** — 用户提到的 like 字段可能是历史遗留或误解。

## 6. StatusBar 硬编码

| 文件 | 行号 | 硬编码值 |
|------|------|----------|
| App.tsx | 204 | `barStyle="dark-content"` |
| App.tsx | 256 | `barStyle="dark-content"` |
| HeartRecommendScreen.tsx | 278 | `barStyle="dark-content"` |
| ProfileSetupFlow.tsx | 579 | `barStyle="light-content"` |
| ImmersiveCardViewer.tsx | 325 | `barStyle="light-content"` |

暗色模式下 `dark-content`（深色文字）在深色背景上不可见。

## 7. 硬编码白色背景

**71 处** `backgroundColor: "#FFFFFF"` + 浅色变体（#FFF5F0, #FFF8F5, #FFF0F0, #FFF5F5, #FFF8F8）。

高频文件：consultant 模块（AdvisorListScreen, AdvisorProfileScreen）、commerce 组件（CouponSelector, FilterTags, InlineSKUSelector）、community 屏幕。

## 8. Paper Elevation

PaperThemeProvider 已正确配置暗色 elevation。但 92 处直接使用 RN `elevation` 数字值的组件不经过 Paper 主题系统，暗色模式下阴影不可见。

## 9. App.tsx 问题

- 第23行静态导入 `import { theme } from './src/design-system/theme'`
- 第204/256行 StatusBar 硬编码
- 第279/287/295行 StyleSheet 使用静态 theme
- **未使用 useTheme()**，无法获取动态主题值

## 10. 主题 Token 系统

DesignTokens（浅色）和 darkTokens（暗色）均已完整定义，包含：
- colors (brand, neutral, semantic, backgrounds, text, borders, colorSeasons)
- typography, spacing, borderRadius, shadows, gradients, animation

darkTokens 中 backgrounds.elevated 为 `#1F1B18`，surface 为 `#141210`，正确适配暗色模式。

---

## Technical Approach Recommendations

### 迁移模式: createStyles

```typescript
// 之前（静态）
const styles = StyleSheet.create({
  container: { backgroundColor: theme.colors.surface }
});

// 之后（动态）
const createStyles = (colors: FlatColors) => StyleSheet.create({
  container: { backgroundColor: colors.surface }
});

// 在组件中
const { colors } = useTheme();
const styles = createStyles(colors);
```

### 迁移优先级

| 优先级 | 文件 | 原因 |
|--------|------|------|
| P0 | App.tsx | StatusBar + SplashScreen，全局影响 |
| P0 | HomeScreen | 首页，用户第一印象 |
| P0 | ProfileScreen | 设置入口，暗色模式切换在此 |
| P0 | SettingsScreen | 已使用 useTheme()，需补充 colors |
| P1 | AiStylistScreen, AiStylistChatScreen | AI 核心功能 |
| P1 | TryOnScreen, TryOnResultScreen | 虚拟试衣核心 |
| P1 | WardrobeScreen, CartScreen | 购物核心流程 |
| P1 | LoginScreen, RegisterScreen | 认证入口 |
| P2 | 其余所有屏幕和组件 | 完整覆盖 |

### 风险评估

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 浅色模式视觉回归 | 中 | 高 | 每次迁移后对比浅色截图 |
| useTheme 在非组件中不可用 | 低 | 中 | 工具函数不接受 hook，需传入 colors |
| 性能影响（频繁 createStyles） | 低 | 低 | StyleSheet.create 有缓存 |
| 遗漏硬编码颜色 | 中 | 中 | 用 grep 审计确认 |

---

## RESEARCH COMPLETE

# 寻裳 XUNO — 前端视觉补全修复 Prompt

> 基于 FRONTEND-VISUAL-VERIFICATION.md 验收报告
> 优先级: 🔴 Critical → 🟡 Medium → 🔵 Nice-to-have
> 预计工时: 4-6 小时

---

## 你的角色

你是一位顶级 React Native 前端工程师，专注于动效和视觉细节。你对代码质量要求极高：每个动画必须流畅，每个交互必须有反馈。

**工作目录:** `C:\AiNeed\apps\mobile\src`

---

## 🔴 P0: Critical Bug Fixes (必须立即修复)

### Fix 1: MatchScoreBadge 数字滚动动画不可见

**文件:** `design-system/ui/MatchScoreBadge.tsx`

**问题:** `displayScore` SharedValue 被 `withTiming` 驱动，但渲染时直接使用 `Math.round(score)` 静态值，导致数字滚动完全不可见。

**修复方案:**

```typescript
// 当前 (broken):
<Text>{Math.round(score)}</Text>;

// 修复: 使用 useAnimatedProps 驱动 Animated.Text
import Animated, { useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";

// 在组件内:
const displayScore = useSharedValue(0);

useEffect(() => {
  if (animated) {
    displayScore.value = withTiming(score, { duration: 800 });
  }
}, [score, animated]);

const animatedTextProps = useAnimatedProps(() => ({
  text: `${Math.round(displayScore.value)}`,
}));

// 渲染:
<Animated.Text animatedProps={animatedTextProps} style={styles.scoreText} />;
```

**验证:** 打开包含 MatchScoreBadge 的页面，数字应从 0 滚动到目标值。

---

### Fix 2: PullToRefresh onRefresh 从未触发

**文件:** `features/discover/components/PullToRefresh.tsx`

**问题:** `pullDistance` 超过 `PULL_THRESHOLD` 时没有调用 `onRefresh` 回调。

**修复方案:**

```typescript
// 在 useAnimatedScrollHandler 的 onScroll 回调中:
const scrollHandler = useAnimatedScrollHandler({
  onScroll: (event) => {
    // 现有的 pullDistance 计算...

    // 添加: 当超过阈值且不在刷新中时触发
    if (pullDistance.value > PULL_THRESHOLD && !isRefreshing.value) {
      isRefreshing.value = true;
      runOnJS(onRefresh)();
    }
  },
});
```

**同时修复 DiscoverScreen.tsx:**

```typescript
// features/discover/screens/DiscoverScreen.tsx
// 替换 ScrollView 为 PullToRefresh 组件
import { PullToRefresh } from "../components/PullToRefresh";

// 包装页面内容
<PullToRefresh onRefresh={handleRefresh}>{/* 现有内容 */}</PullToRefresh>;
```

**验证:** 在发现页下拉应触发刷新动画和数据重新加载。

---

### Fix 3: ChatBubble 完全无动画

**文件:** `features/stylist/components/ChatBubble.tsx`

**当前问题:**

- 零动画实现
- 使用 Ionicons 而非 phosphor-react-native
- 使用 StyleSheet.create 而非 createStyles

**修复方案 — 重写 ChatBubble:**

```typescript
import React, { useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInRight,
  FadeInLeft,
} from "react-native-reanimated";
import { User, Robot } from "phosphor-react-native";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { SpringConfigs } from "../../../design-system/theme/tokens/animations";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
}

export function ChatBubble({ message, isUser, timestamp }: ChatBubbleProps) {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const pressScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePressIn = useCallback(() => {
    pressScale.value = withSpring(0.98, SpringConfigs.snappy);
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withSpring(1, SpringConfigs.gentle);
  }, [pressScale]);

  // 用户消息从右侧进入，AI消息从左侧进入
  const entering = isUser
    ? FadeInRight.springify().damping(12).stiffness(150)
    : FadeInLeft.springify().damping(12).stiffness(150);

  return (
    <Animated.View
      entering={entering}
      style={[styles.container, isUser ? styles.userContainer : styles.aiContainer, animatedStyle]}
    >
      {!isUser && (
        <View style={styles.avatar}>
          <Robot size={16} color={DesignTokens.colors.brand.terracotta} weight="fill" />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.aiText]}>{message}</Text>
      </View>
      {timestamp && <Text style={styles.timestamp}>{timestamp}</Text>}
    </Animated.View>
  );
}

const useStyles = createStyles((colors) => ({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: DesignTokens.spacing[3],
    paddingHorizontal: DesignTokens.spacing[4],
  },
  userContainer: {
    justifyContent: "flex-end",
  },
  aiContainer: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: DesignTokens.borderRadius.full,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: DesignTokens.spacing[2],
  },
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: DesignTokens.spacing[4],
    paddingVertical: DesignTokens.spacing[3],
    borderRadius: DesignTokens.borderRadius.xl,
    ...DesignTokens.shadows.xs,
  },
  userBubble: {
    backgroundColor: DesignTokens.colors.brand.terracotta,
    borderBottomRightRadius: DesignTokens.borderRadius.xs,
  },
  aiBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: DesignTokens.borderRadius.xs,
  },
  text: {
    fontSize: DesignTokens.typography.sizes.base,
    lineHeight: DesignTokens.typography.sizes.base * DesignTokens.typography.lineHeights.relaxed,
  },
  userText: {
    color: DesignTokens.colors.neutral.white,
  },
  aiText: {
    color: colors.textPrimary,
  },
  timestamp: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.textTertiary,
    marginTop: DesignTokens.spacing[1],
  },
}));
```

**验证:** 在造型师对话页发送消息，气泡应弹性滑入，AI 回复从左滑入，用户消息从右滑入。

---

## 🟡 P1: Medium Priority (系统性提升)

### Fix 4: StatsCard 数字滚动迁移到 Reanimated

**文件:** `features/profile/components/StatsCard.tsx`

**问题:** 使用 `requestAnimationFrame` + `useState` 在 JS 线程执行数字滚动，可能掉帧。

**修复:** 替换为 Reanimated SharedValue + useAnimatedProps，参照 Fix 1 的 MatchScoreBadge 修复模式。

---

### Fix 5: 统一图标库 → phosphor-react-native

**涉及文件 (全量替换 Ionicons):**

```
features/stylist/components/ChatBubble.tsx        ← Ionicons → phosphor
features/consultant/components/TypingIndicator.tsx ← Ionicons → phosphor
features/consultant/components/ConsultantCard.tsx  ← Ionicons → phosphor
features/wardrobe/screens/FavoritesScreen.tsx      ← Ionicons → phosphor
polyfills/ionicons.tsx                             ← 确认是否仍需要
```

**替换映射 (常见 Ionicons → Phosphor):**

```
Ionicons.heart         → Heart from 'phosphor-react-native'
Ionicons.heartOutline  → Heart weight="regular"
Ionicons.search        → MagnifyingGlass
Ionicons.close         → X
Ionicons.arrowBack     → ArrowLeft
Ionicons.send          → PaperPlaneRight
Ionicons.mic           → Microphone
Ionicons.image         → Image
Ionicons.share         → ShareNetwork
Ionicons.settings      → Gear
```

---

### Fix 6: RootNavigator 接入 PageTransitions

**文件:** `navigation/RootNavigator.tsx`

**问题:** `PageTransitions` 组件和 `animations.ts` 中的 `PageTransitions` token 完全闲置，导航器使用系统默认转场。

**修复方案:**

```typescript
import { DesignTokens } from "../design-system/theme/tokens/design-tokens";

const screenOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: DesignTokens.colors.backgrounds.primary },
  // 使用iOS风格的水平滑动转场 + 淡入淡出
  animation: "slide_from_right" as const,
  presentation: "card" as const,
  gestureEnabled: true,
  gestureDirection: "horizontal" as const,
};

// 对于 Modal 页面:
const modalScreenOptions = {
  ...screenOptions,
  presentation: "modal" as const,
  animation: "slide_from_bottom" as const,
};
```

**注意:** `shared/components/transitions/PageTransitions.tsx` 有 `@ts-nocheck`，需要先修复类型问题再考虑更高级的转场。

---

### Fix 7: Animation Token 消费统一化

**涉及文件 (使用内联 spring config 的组件):**

```
shared/components/animations/ShimmerSkeleton.tsx  ← 加入 SpringConfigs
shared/components/animations/RippleButton.tsx      ← 加入 SpringConfigs
shared/components/animations/TabBarIndicator.tsx   ← 加入 SpringConfigs
shared/components/animations/AnimatedSplash.tsx    ← 加入 Duration + SpringConfigs
features/onboarding/screens/OnboardingWizard.tsx   ← 加入 SpringConfigs
design-system/ui/FluidAnimations.tsx               ← 加入 SpringConfigs (9个子组件)
```

**修复模式 (统一):**

```typescript
// 在文件顶部:
import { SpringConfigs, Duration } from "../../design-system/theme/tokens/animations";

// 替换所有内联:
// withSpring(1, { damping: 15, stiffness: 150 })
// → withSpring(1, SpringConfigs.bouncy)
```

---

### Fix 8: ReducedMotion 全覆盖

**涉及文件 (缺失 reducedMotion 支持):**

```
design-system/primitives/Toast/Toast.tsx
shared/components/animations/ShimmerSkeleton.tsx
shared/components/animations/RippleButton.tsx
shared/components/animations/TabBarIndicator.tsx
shared/components/animations/AnimatedSplash.tsx
design-system/ui/FluidAnimations.tsx               ← 9个子组件
features/onboarding/screens/OnboardingWizard.tsx
features/onboarding/components/OnboardingSteps.tsx
features/stylist/components/TypingIndicator.tsx
features/stylist/components/QuickReplyBar.tsx
features/discover/components/SearchBar.tsx
features/discover/components/ScenePills.tsx
```

**修复模式:**

```typescript
import { useReducedMotion } from 'react-native';

// 在组件内:
const reducedMotion = useReducedMotion();

// 在动画逻辑中:
const springConfig = reducedMotion ? { duration: 0 } : SpringConfigs.bouncy;
// 或跳过重复动画:
if (!reducedMotion) {
  scale.value = withRepeat(withSequence(...), -1, true);
}
```

---

## 🔵 P2: Nice-to-have (品质提升)

### Fix 9: Lottie 收藏心形粒子效果

**文件:** `design-system/ui/AnimatedHeartButton.tsx`

**当前:** 弹性缩放 + "+1" 弹出
**升级:** 添加 Lottie 粒子爆炸效果

```typescript
import LottieView from "lottie-react-native";

// 需要一个 heart-burst.json Lottie 动画文件
// 放到 assets/animations/heart-burst.json
// 收藏成功时播放
```

---

### Fix 10: OnboardingSteps 颜色面板 Bug

**文件:** `features/onboarding/components/OnboardingSteps.tsx`

**问题:** `COLOR_PALETTES` 数组中部分条目使用字符串字面量 `"colors.primary"` 代替实际颜色值 (约行 102-144)。

**修复:** 将所有字符串字面量替换为 `DesignTokens.colors.brand.terracotta` 等实际色值。

---

### Fix 11: SharedTransition 升级为真正 Shared Element

**文件:** `shared/components/animations/SharedTransition.tsx`

**当前:** 仅做 cross-fade + scale，id 参数未使用。
**升级方案:** 使用 `react-native-shared-element` + `react-navigation-shared-element` 实现真正的 position/size morphing。

---

### Fix 12: ScenePills 选中过渡动画

**文件:** `features/discover/components/ScenePills.tsx`

**当前:** 选中/取消是即时切换。
**升级:** 添加背景色/边框的 `withTiming` 过渡动画。

```typescript
// 选中状态切换:
const bgColor = useSharedValue(isSelected ? 1 : 0);

useEffect(() => {
  bgColor.value = withTiming(isSelected ? 1 : 0, { duration: Duration.normal });
}, [isSelected]);

const animatedBg = useAnimatedStyle(() => ({
  backgroundColor: interpolateColor(
    bgColor.value,
    [0, 1],
    [DesignTokens.colors.neutral[100], DesignTokens.colors.brand.terracotta]
  ),
}));
```

---

## 执行顺序建议

```
Phase 1 (必须): Fix 1 + Fix 2 + Fix 3          → 2小时
Phase 2 (重要): Fix 4 + Fix 5 + Fix 6           → 1.5小时
Phase 3 (统一): Fix 7 + Fix 8                   → 1.5小时
Phase 4 (提升): Fix 9-12                        → 1小时
```

每个 Fix 完成后运行:

```bash
cd C:\AiNeed\apps\mobile
npx tsc --noEmit          # 类型检查
npm run lint              # 代码质量
npm run test              # 单元测试
```

---

## 验收标准

| Fix    | 验收方法                                             |
| ------ | ---------------------------------------------------- |
| Fix 1  | 打开含 MatchScoreBadge 的页面，数字从 0 滚动到目标值 |
| Fix 2  | 发现页下拉触发刷新动画和数据 reload                  |
| Fix 3  | 造型师对话页气泡弹性滑入，AI 左进用户右进            |
| Fix 4  | Profile 页数字滚动流畅不掉帧                         |
| Fix 5  | 全局无 Ionicons 引用，统一 phosphor 图标             |
| Fix 6  | 页面切换有滑动转场效果                               |
| Fix 7  | 无内联 spring config                                 |
| Fix 8  | 开启 reducedMotion 后所有动画即时切换                |
| Fix 9  | 收藏时有 Lottie 粒子爆炸                             |
| Fix 10 | Onboarding 色彩分析步骤显示正确色值                  |
| Fix 11 | 页面间图片共享元素平滑过渡                           |
| Fix 12 | 场景 pill 选中/取消有颜色过渡动画                    |

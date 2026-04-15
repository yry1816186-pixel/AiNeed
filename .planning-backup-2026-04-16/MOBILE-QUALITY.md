# AiNeed 移动端质量审计报告

> 审计日期: 2026-04-13
> 审计范围: C:\AiNeed\apps\mobile\src
> 审计人: 前端架构师 (自动化扫描)

---

## 审计摘要

| 维度 | 严重程度 | 问题数 | 状态 |
|------|----------|--------|------|
| 1. TypeScript 类型完整性 | 严重 | 100+ | 不合格 |
| 2. inline styles | 中等 | 67 | 需改进 |
| 3. loading/error/empty 状态覆盖 | 严重 | 19 屏幕缺失 | 不合格 |
| 4. FlashList 使用 | 高 | 11 处 FlatList | 需改进 |
| 5. 导航类型定义 | 中等 | 8 处未类型化 | 需改进 |
| 6. accessibilityLabel 覆盖率 | 高 | 覆盖率 ~35% | 不合格 |
| 7. 浅色模式合规 | 高 | 67+ 硬编码深色值 | 不合格 |
| 8. console.log 残留 | 中等 | 132 处 | 需改进 |
| 9. 未使用 import | 低 | 需 IDE 级验证 | 待确认 |

---

## 1. TypeScript 类型完整性

**严重程度: 严重**

### 1.1 `as any` 类型断言 (100 处)

#### 1.1.1 `fontWeight as any` 模式 (31 处)

这是最集中的 any 使用模式，`typography.fontWeight.bold/semibold/medium` 的返回值与 RN 的 `FontWeight` 类型不兼容，统一用 `as any` 绕过。

| 文件 | 行号 | 当前状态 | 期望状态 |
|------|------|----------|----------|
| [OutfitCard.tsx](file:///C:/AiNeed/apps/mobile/src/components/ui/OutfitCard.tsx#L174) | 174 | `fontWeight: typography.fontWeight.bold as any` | 修正 typography 类型定义，消除 as any |
| [EmptyState.tsx](file:///C:/AiNeed/apps/mobile/src/components/ui/EmptyState.tsx#L120) | 120 | `fontWeight: typography.fontWeight.bold as any` | 同上 |
| [ProfileScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/ProfileScreen.tsx#L261) | 261, 289, 305, 326, 344, 368, 400 | 7 处 `fontWeight as any` | 同上 |
| [TryOnScreen.tsx](file:///C:/AiNeed/apps/mobile/src/components/screens/TryOnScreen.tsx#L471) | 471, 492, 516, 521, 527, 560, 589, 609, 649, 682, 715, 750, 766 | 13 处 | 同上 |
| [AiStylistScreenV2.tsx](file:///C:/AiNeed/apps/mobile/src/screens/AiStylistScreenV2.tsx#L879) | 879, 1017, 1044, 1068, 1089, 1094, 1123, 1158, 1179 | 9 处 | 同上 |

**根因**: `typography.fontWeight` 返回值类型与 React Native `TextStyle.fontWeight` 不匹配。应修正 typography token 的类型定义。

#### 1.1.2 `icon as any` 模式 (12 处)

Ionicons name 属性类型不匹配，用 `as any` 绕过。

| 文件 | 行号 | 当前状态 | 期望状态 |
|------|------|----------|----------|
| [GradientButton.tsx](file:///C:/AiNeed/apps/mobile/src/components/ui/GradientButton.tsx#L135) | 135 | `name={icon as any}` | 定义 icon 类型为 Ionicons name 联合类型 |
| [EmptyState.tsx](file:///C:/AiNeed/apps/mobile/src/components/ui/EmptyState.tsx#L47) | 47 | `name={icon as any}` | 同上 |
| [BodyTypeCard.tsx](file:///C:/AiNeed/apps/mobile/src/screens/profile/components/BodyTypeCard.tsx#L203) | 203 | `name={bodyTypeIcon as any}` | 同上 |
| [CompleteStep.tsx](file:///C:/AiNeed/apps/mobile/src/screens/onboarding/steps/CompleteStep.tsx#L113) | 113 | `name={item.icon as any}` | 同上 |
| [BasicInfoStep.tsx](file:///C:/AiNeed/apps/mobile/src/screens/onboarding/steps/BasicInfoStep.tsx#L86) | 86 | `name={option.icon as any}` | 同上 |
| [StyleTestStep.tsx](file:///C:/AiNeed/apps/mobile/src/screens/onboarding/steps/StyleTestStep.tsx#L76) | 76 | `name={feature.icon as any}` | 同上 |
| [SubscriptionScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/SubscriptionScreen.tsx#L265) | 265 | `name={TIER_ICON[plan.tier] as any}` | 同上 |
| [CustomizationScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/CustomizationScreen.tsx#L252) | 252, 412 | 2 处 | 同上 |
| [SocialInteractions.tsx](file:///C:/AiNeed/apps/mobile/src/components/social/SocialInteractions.tsx#L242) | 242 | `name={platform.icon as any}` | 同上 |
| [StateComponents.tsx](file:///C:/AiNeed/apps/mobile/src/components/states/StateComponents.tsx#L185) | 185, 523 | 2 处 | 同上 |
| [MicroInteractions.tsx](file:///C:/AiNeed/apps/mobile/src/components/interactions/MicroInteractions.tsx#L493) | 493, 507 | 2 处 | 同上 |
| [AlgorithmVisualization.tsx](file:///C:/AiNeed/apps/mobile/src/components/visualization/AlgorithmVisualization.tsx#L1073) | 1073 | `name={trendIcons[trend] as any}` | 同上 |
| [OnboardingSteps.tsx](file:///C:/AiNeed/apps/mobile/src/components/onboarding/OnboardingSteps.tsx#L184) | 184, 402, 490 | 3 处 | 同上 |

#### 1.1.3 其他 `any` 使用 (关键项)

| 文件 | 行号 | 当前状态 | 期望状态 |
|------|------|----------|----------|
| [WaterfallFlashList.tsx](file:///C:/AiNeed/apps/mobile/src/components/ux/WaterfallFlashList.tsx#L20) | 20 | `[key: string]: any` | 定义具体的 item 类型接口 |
| [FeatureFlagContext.tsx](file:///C:/AiNeed/apps/mobile/src/contexts/FeatureFlagContext.tsx#L139) | 139 | `(wsService as any).socket` | 为 wsService 添加 socket 属性类型 |
| [SkeletonScreen.tsx](file:///C:/AiNeed/apps/mobile/src/components/ux/SkeletonScreen.tsx#L9) | 9 | `style?: any` | 使用 `ViewStyle` 类型 |
| [Skeleton.tsx](file:///C:/AiNeed/apps/mobile/src/components/skeleton/Skeleton.tsx#L9) | 9, 39, 55, 73, 93 | 5 处 `style?: any` | 使用 `ViewStyle` 类型 |
| [AlgorithmVisualization.tsx](file:///C:/AiNeed/apps/mobile/src/components/visualization/AlgorithmVisualization.tsx#L334) | 334, 525, 707, 775, 923, 1019 | 6 处 `style?: any` | 使用 `ViewStyle` 类型 |
| [SocialInteractions.tsx](file:///C:/AiNeed/apps/mobile/src/components/social/SocialInteractions.tsx#L67) | 67, 382 | `style?: any` | 使用 `ViewStyle` 类型 |
| [ImmersiveComponents.tsx](file:///C:/AiNeed/apps/mobile/src/components/immersive/ImmersiveComponents.tsx#L882) | 882 | `progress: any` | 定义 progress 类型接口 |
| [offline-cache.ts](file:///C:/AiNeed/apps/mobile/src/services/offline-cache.ts#L45) | 45-50 | `users: any[]`, `clothing: any[]`, `recommendations: any[]`, `conversations: any[]`, `brands: any[]`, `stats: any` | 为每个字段定义具体类型 |
| [offline-cache.ts](file:///C:/AiNeed/apps/mobile/src/services/offline-cache.ts#L57) | 57, 228, 233 | `CacheEntry<any>` 3 处 | 定义具体缓存值类型 |
| [imageCache.tsx](file:///C:/AiNeed/apps/mobile/src/utils/imageCache.tsx#L323) | 323, 337 | `(event: any)` | 使用具体事件类型 |
| [performanceUtils.ts](file:///C:/AiNeed/apps/mobile/src/utils/performanceUtils.ts#L119) | 119, 124, 137, 142, 197 | 5 处泛型 `any` | 工具函数可接受，但 `MemoryCache<any>` 应定义具体类型 |
| [Input.tsx](file:///C:/AiNeed/apps/mobile/src/components/primitives/Input/Input.tsx#L133) | 133, 141 | `(e: any)` | 使用 `NativeSyntheticEvent<TextInputFocusEventData>` |
| [Card.tsx](file:///C:/AiNeed/apps/mobile/src/components/primitives/Card/Card.tsx#L70) | 70 | `(event: any)` | 使用 `GestureResponderEvent` |
| [RecommendationsScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/RecommendationsScreen.tsx#L133) | 133 | `(navigation as any).navigate(...)` | 使用正确的导航类型 |
| [WardrobeScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/WardrobeScreen.tsx#L237) | 237 | `(_data: any, index: number)` | 定义数据类型 |
| [RecommendationsScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/RecommendationsScreen.tsx#L154) | 154 | `(_data: any, index: number)` | 定义数据类型 |
| [FavoritesScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/FavoritesScreen.tsx#L152) | 152 | `(_data: any, index: number)` | 定义数据类型 |
| [CartScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/CartScreen.tsx#L55) | 55 | `item: item as any` | 定义具体 item 类型 |
| [aiService.ts](file:///C:/AiNeed/apps/mobile/src/services/ai/aiService.ts#L182) | 182 | `} as any)` | 定义具体请求体类型 |
| [SearchScreenParts.tsx](file:///C:/AiNeed/apps/mobile/src/components/search/SearchScreenParts.tsx#L552) | 552 | `React.ComponentType<any>` | 定义具体组件 props 类型 |
| [LoadingStates.tsx](file:///C:/AiNeed/apps/mobile/src/components/loading/LoadingStates.tsx#L91) | 91 | `width: width as any` | 修正 width 类型 |
| [SmartRecommendations.tsx](file:///C:/AiNeed/apps/mobile/src/components/recommendations/SmartRecommendations.tsx#L419) | 419 | `cardOpacity as any` | 修正 Animated.Value 类型兼容性 |
| [useAdvancedAnimations.ts](file:///C:/AiNeed/apps/mobile/src/hooks/useAdvancedAnimations.ts#L66) | 66 | `(event: any)` | 使用具体动画事件类型 |

### 1.2 `@ts-ignore` / `@ts-expect-error` (1 处)

| 文件 | 行号 | 当前状态 | 期望状态 |
|------|------|----------|----------|
| [performanceUtils.ts](file:///C:/AiNeed/apps/mobile/src/utils/performanceUtils.ts#L22) | 22 | `@ts-expect-error - FastImage.preload 可能不存在于某些版本` | 添加条件类型检查替代 ts-expect-error |

---

## 2. inline styles 检查

**严重程度: 中等**

共发现 67 处 `style={{ }}` 内联样式，应使用 `StyleSheet.create` 以获得性能优化（样式验证和一次性创建）。

### 高频文件

| 文件 | 行号 | 内联样式数 | 典型模式 |
|------|------|-----------|----------|
| [LoadingStates.tsx](file:///C:/AiNeed/apps/mobile/src/components/loading/LoadingStates.tsx#L132) | 132-250 | 15 处 | `style={{ marginTop: 12 }}` |
| [LoadingShimmer.tsx](file:///C:/AiNeed/apps/mobile/src/components/ui/LoadingShimmer.tsx#L78) | 78-117 | 8 处 | `style={{ marginTop: 8 }}`, `style={{ padding: 20 }}` |
| [Skeleton.tsx](file:///C:/AiNeed/apps/mobile/src/components/skeleton/Skeleton.tsx#L48) | 48-61 | 4 处 | `style={{ marginBottom: 8 }}` |
| [ui/index.tsx](file:///C:/AiNeed/apps/mobile/src/components/ui/index.tsx#L261) | 261-636 | 4 处 | `style={{ transform: [{ scale: scaleAnim }] }}` |
| [ModernComponents.tsx](file:///C:/AiNeed/apps/mobile/src/components/ui/ModernComponents.tsx#L184) | 184-318 | 3 处 | `style={{ transform: [{ scale: scaleAnim }] }}` |
| [ImmersiveComponents.tsx](file:///C:/AiNeed/apps/mobile/src/components/immersive/ImmersiveComponents.tsx#L558) | 558-825 | 3 处 | `style={{ width: 28 }}`, `style={{ height: 120 }}` |
| [WaterfallFlashList.tsx](file:///C:/AiNeed/apps/mobile/src/components/ux/WaterfallFlashList.tsx#L90) | 90 | 1 处 | `style={{ marginBottom: gap }}` |
| [NotificationsScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/NotificationsScreen.tsx#L278) | 278 | 1 处 | `style={{ height: 20 }}` |
| [CommunityScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/CommunityScreen.tsx#L398) | 398 | 1 处 | `style={{ height: 80 }}` |
| [AlgorithmVisualization.tsx](file:///C:/AiNeed/apps/mobile/src/components/visualization/AlgorithmVisualization.tsx#L420) | 420 | 1 处 | `style={{ width: config.circleSize, height: config.circleSize }}` |
| [ScreenLayout.tsx](file:///C:/AiNeed/apps/mobile/src/components/layout/ScreenLayout.tsx#L70) | 70, 379 | 2 处 | `style={{ flex: 1 }}` |
| [SmartRecommendations.tsx](file:///C:/AiNeed/apps/mobile/src/components/recommendations/SmartRecommendations.tsx#L428) | 428, 506 | 2 处 | `style={{ width: 20 }}`, `style={{ height: 100 }}` |
| [LoadingStates.tsx (primitives)](file:///C:/AiNeed/apps/mobile/src/components/primitives/LoadingStates/LoadingStates.tsx#L117) | 117-165 | 5 处 | `style={{ marginTop: 8 }}` |
| [Card.tsx](file:///C:/AiNeed/apps/mobile/src/components/primitives/Card/Card.tsx#L244) | 244, 328 | 2 处 | `style={{ overflow: "visible" }}` |
| [ClothingCard.tsx](file:///C:/AiNeed/apps/mobile/src/components/clothing/ClothingCard.tsx#L248) | 248 | 1 处 | `style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.md }}` |
| [ThemeSystem.tsx](file:///C:/AiNeed/apps/mobile/src/components/theme/ThemeSystem.tsx#L755) | 755 | 1 处 | `style={{ position: "relative", zIndex: 1 }}` |
| [Rating.tsx](file:///C:/AiNeed/apps/mobile/src/components/ui/Rating.tsx#L20) | 20 | 1 处 | `style={{ fontSize: size, color }}` |
| [TryOnScreen.tsx](file:///C:/AiNeed/apps/mobile/src/components/screens/TryOnScreen.tsx#L416) | 416 | 1 处 | `style={{ color: "#FFFFFF" }}` |

**说明**: 动画相关的内联样式（如 `transform: [{ scale: scaleAnim }]`）是合理用法，因为 Animated 值必须在运行时求值。但静态间距/布局值应迁移到 StyleSheet。

---

## 3. loading/error/empty 状态覆盖率

**严重程度: 严重**

### 3.1 状态覆盖矩阵

共 33 个屏幕组件，检查 loading/error/empty 三态覆盖情况：

| 屏幕 | loading | error | empty | 评估 |
|------|---------|-------|-------|------|
| ProfileScreen | 有 | 有(ErrorBoundary) | 无 | 部分覆盖 |
| AiStylistScreenV2 | 有 | 有(ErrorBoundary) | 无 | 部分覆盖 |
| HomeScreen | 有 | 有(ErrorBoundary) | 无 | 部分覆盖 |
| SearchScreen | 有 | 有 | 有 | 完整 |
| ClothingDetailScreen | 有 | 有 | 无 | 部分覆盖 |
| WardrobeScreen | 有 | 有 | 有 | 完整 |
| VirtualTryOnScreen | 有 | 有(ErrorBoundary) | 无 | 部分覆盖 |
| SubscriptionScreen | 有 | 有 | 无 | 部分覆盖 |
| SettingsScreen | 有 | 有 | 无 | 部分覆盖 |
| RegisterScreen | 有 | 有 | 无 | 部分覆盖 |
| RecommendationsScreen | 有 | 有 | 有 | 完整 |
| RecommendationDetailScreen | 有 | 有 | 无 | 部分覆盖 |
| OutfitDetailScreen | 有 | 有 | 无 | 部分覆盖 |
| OrdersScreen | 有 | 有 | 有 | 完整 |
| OrderDetailScreen | 有 | 有 | 无 | 部分覆盖 |
| NotificationsScreen | 有 | 有 | 有 | 完整 |
| NotificationSettingsScreen | 有 | 无 | 无 | 缺失 error+empty |
| LoginScreen | 有 | 有 | N/A | 部分覆盖 |
| LegalScreen | 有 | 有 | N/A | 部分覆盖 |
| OnboardingScreen | 有 | 有 | N/A | 部分覆盖 |
| FavoritesScreen | 有 | 有 | 有 | 完整 |
| HeartScreen | 有 | 有(ErrorBoundary) | 无 | 部分覆盖 |
| CheckoutScreen | 有 | 有 | 无 | 部分覆盖 |
| CommunityScreen | 有 | 有 | 有 | 完整 |
| CustomizationScreen | 有 | 有 | 有 | 完整 |
| CartScreen | 有 | 有(ErrorBoundary) | 有 | 完整 |
| AiStylistScreen | 有 | 有 | 无 | 部分覆盖 |
| AddClothingScreen | 有 | 有 | N/A | 部分覆盖 |
| CameraScreen | 有 | 无 | N/A | 缺失 error |
| ProfileReportScreen | 有 | 有 | 有 | 完整 |
| StyleQuizScreen | 有 | 有 | 无 | 部分覆盖 |
| QuizResultScreen | 有 | 无 | 无 | 缺失 error+empty |

### 3.2 关键缺失

| 问题 | 涉及屏幕 | 严重程度 |
|------|----------|----------|
| 缺少 empty 状态 | ProfileScreen, AiStylistScreenV2, HomeScreen, ClothingDetailScreen, VirtualTryOnScreen, SubscriptionScreen, RecommendationDetailScreen, OutfitDetailScreen, OrderDetailScreen, HeartScreen, CheckoutScreen, AiStylistScreen, StyleQuizScreen | 高 |
| 缺少 error 状态 | NotificationSettingsScreen, CameraScreen, QuizResultScreen | 高 |
| 仅有 ErrorBoundary 无内联 error 处理 | 多个屏幕依赖 ErrorBoundary 但无局部 error 回退 | 中 |

---

## 4. FlashList 使用正确性

**严重程度: 高**

### 4.1 当前状态

项目已安装 `@shopify/flash-list`，但大量列表仍使用 `FlatList`。存在一个 polyfill 文件 [flash-list.tsx](file:///C:/AiNeed/apps/mobile/src/polyfills/flash-list.tsx) 将 FlashList 降级为 FlatList。

### 4.2 使用 FlatList 的文件 (11 处)

| 文件 | 行号 | 当前状态 | 期望状态 |
|------|------|----------|----------|
| [AiStylistScreenV2.tsx](file:///C:/AiNeed/apps/mobile/src/screens/AiStylistScreenV2.tsx#L809) | 809 | `<FlatList>` (聊天消息列表) | 使用 FlashList 或优化为 VirtualizedList |
| [SearchScreenParts.tsx](file:///C:/AiNeed/apps/mobile/src/components/search/SearchScreenParts.tsx#L564) | 564 | `<FlatList>` | 使用 FlashList |
| [WardrobeScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/WardrobeScreen.tsx#L314) | 314 | `<FlatList>` (网格列表) | 使用 FlashList |
| [RecommendationsScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/RecommendationsScreen.tsx#L230) | 230 | `<FlatList>` | 使用 FlashList |
| [OrdersScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/OrdersScreen.tsx#L254) | 254, 277 | 2 处 `<FlatList>` | 使用 FlashList |
| [FavoritesScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/FavoritesScreen.tsx#L180) | 180 | `<FlatList>` | 使用 FlashList |
| [CartScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/CartScreen.tsx#L244) | 244 | `<FlatList>` | 使用 FlashList |
| [AiStylistScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/AiStylistScreen.tsx#L530) | 530 | `<FlatList>` (聊天消息列表) | 使用 FlashList 或优化 |
| [ProductGrid.tsx](file:///C:/AiNeed/apps/mobile/src/components/ui/ProductGrid.tsx#L157) | 157, 214 | 2 处 `<FlatList>` | 使用 FlashList |
| [SocialInteractions.tsx](file:///C:/AiNeed/apps/mobile/src/components/social/SocialInteractions.tsx#L661) | 661 | `<FlatList>` | 使用 FlashList |
| [ImmersiveComponents.tsx](file:///C:/AiNeed/apps/mobile/src/components/immersive/ImmersiveComponents.tsx#L284) | 284, 307 | 2 处 `<FlatList>` | 使用 FlashList |
| [WaterfallFeed.tsx](file:///C:/AiNeed/apps/mobile/src/components/community/WaterfallFeed.tsx#L237) | 237 | `<FlatList>` | 使用 FlashList |

### 4.3 已正确使用 FlashList 的文件

| 文件 | 行号 | 说明 |
|------|------|------|
| [WaterfallFlashList.tsx](file:///C:/AiNeed/apps/mobile/src/components/ux/WaterfallFlashList.tsx#L125) | 125 | 正确使用 `@shopify/flash-list` 的 FlashList |
| [HomeScreen.tsx (home)](file:///C:/AiNeed/apps/mobile/src/screens/home/HomeScreen.tsx#L200) | 200 | 使用 polyfill FlashList (实际降级为 FlatList) |

### 4.4 Polyfill 问题

[flash-list.tsx](file:///C:/AiNeed/apps/mobile/src/polyfills/flash-list.tsx) 将 FlashList 完全降级为 FlatList，这意味着即使代码中使用了 FlashList，运行时仍然是 FlatList，无法获得 FlashList 的性能优势。

---

## 5. 导航类型定义

**严重程度: 中等**

### 5.1 类型定义文件

[types/navigation.ts](file:///C:/AiNeed/apps/mobile/src/types/navigation.ts) 定义了完整的 `RootStackParamList`（46 个路由），包含参数类型。这是良好的基础。

### 5.2 未类型化的 useNavigation/useRoute 调用 (8 处)

| 文件 | 行号 | 当前状态 | 期望状态 |
|------|------|----------|----------|
| [TryOnScreen.tsx](file:///C:/AiNeed/apps/mobile/src/components/screens/TryOnScreen.tsx#L38) | 38-39 | `useNavigation()` / `useRoute()` 无泛型 | 添加 `NativeStackNavigationProp<RootStackParamList>` 和 `RouteProp` |
| [QuizResultScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/style-quiz/QuizResultScreen.tsx#L47) | 47 | `useNavigation()` 无泛型 | 添加导航类型 |
| [RecommendationsScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/RecommendationsScreen.tsx#L82) | 82 | `useNavigation()` 无泛型 | 添加导航类型 |
| [OutfitDetailScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/OutfitDetailScreen.tsx#L18) | 18 | `useNavigation()` 无泛型 | 添加导航类型 |
| [NotificationSettingsScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/NotificationSettingsScreen.tsx#L9) | 9 | `useNavigation()` 无泛型 | 添加导航类型 |
| [NotificationsScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/NotificationsScreen.tsx#L87) | 87 | `useNavigation()` 无泛型 | 添加导航类型 |
| [CheckoutScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/CheckoutScreen.tsx#L53) | 53 | `useNavigation()` 无泛型 | 添加导航类型 |
| [AddClothingScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/AddClothingScreen.tsx#L55) | 55 | `useNavigation()` 无泛型 | 添加导航类型 |

### 5.3 navigation as any (1 处)

| 文件 | 行号 | 当前状态 | 期望状态 |
|------|------|----------|----------|
| [RecommendationsScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/RecommendationsScreen.tsx#L133) | 133 | `(navigation as any).navigate('RecommendationDetail', ...)` | 使用类型化的 navigation.navigate |

---

## 6. accessibilityLabel 覆盖率

**严重程度: 高**

### 6.1 覆盖率统计

- 屏幕 `TouchableOpacity`/`Pressable` 总数: 351 处 (31 个屏幕文件)
- 屏幕 `accessibilityLabel` 总数: 122 处 (20 个屏幕文件)
- **覆盖率: 约 35%**

### 6.2 完全缺失 accessibilityLabel 的屏幕

| 屏幕 | 可交互组件数 | accessibilityLabel 数 | 覆盖率 |
|------|-------------|----------------------|--------|
| AiStylistScreenV2 | 23 | 0 | 0% |
| CameraScreen | 15 | 0 | 0% |
| HomeScreen | 13 | 0 | 0% |
| SubscriptionScreen | 7 | 0 | 0% |
| OnboardingScreen | 5 | 0 | 0% |
| HeartScreen | 0 (仅 ErrorBoundary) | 0 | N/A |
| QuizResultScreen | 7 | 0 | 0% |
| StyleQuizScreen | 7 | 0 | 0% |
| VirtualTryOnScreen | 0 (使用 TryOnScreen 组件) | 0 | N/A |

### 6.3 覆盖较好的屏幕

| 屏幕 | 可交互组件数 | accessibilityLabel 数 | 覆盖率 |
|------|-------------|----------------------|--------|
| ProfileScreen | 5 | 11 | 良好 |
| SettingsScreen | 21 | 17 | 良好 |
| CheckoutScreen | 25 | 12 | 中等 |
| CartScreen | 17 | 8 | 中等 |
| ClothingDetailScreen | 15 | 7 | 中等 |
| WardrobeScreen | 13 | 7 | 中等 |

---

## 7. 浅色模式合规

**严重程度: 高**

### 7.1 硬编码深色背景/文字颜色 (非主题 token)

以下硬编码颜色在浅色模式下可能导致可读性问题或视觉不一致：

#### 深色文字颜色 (浅色模式下合理，但应使用 token)

| 文件 | 行号 | 硬编码值 | 用途 | 期望状态 |
|------|------|----------|------|----------|
| [HomeScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/HomeScreen.tsx#L275) | 275, 305, 365, 447, 465 | `#1C1C1E` | 文字颜色 | 使用 `theme.colors.textPrimary` |
| [HomeScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/HomeScreen.tsx#L269) | 269, 342, 370 | `#8E8E93` | 次要文字 | 使用 `theme.colors.textSecondary` |
| [HomeScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/HomeScreen.tsx#L386) | 386 | `#FF6B9D` | 品牌色 | 使用 `theme.colors.brand` |
| [HomeScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/HomeScreen.tsx#L253) | 253 | `#F5F5F7` | 背景色 | 使用 `theme.colors.background` |
| [HomeScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/HomeScreen.tsx#L279) | 279, 328, 346 | `#FFFFFF` | 卡片背景 | 使用 `theme.colors.card` |
| [HomeScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/HomeScreen.tsx#L297) | 297 | `#F8F8F8` | 搜索栏背景 | 使用 theme token |
| [ClothingDetailScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/ClothingDetailScreen.tsx#L283) | 283, 286, 290, 295 | `#F1F3F4` | 占位/标签背景 | 使用 theme token |
| [ClothingDetailScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/ClothingDetailScreen.tsx#L301) | 301 | `#EEF2FF` | 标签背景 | 使用 theme token |
| [ClothingDetailScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/ClothingDetailScreen.tsx#L319) | 319 | `#5BCEA6` | 试衣按钮背景 | 使用 theme token |
| [SearchScreenParts.tsx](file:///C:/AiNeed/apps/mobile/src/components/search/SearchScreenParts.tsx#L717) | 717 | `#F3F1FF` | 背景色 | 使用 theme token |
| [SearchScreenParts.tsx](file:///C:/AiNeed/apps/mobile/src/components/search/SearchScreenParts.tsx#L757) | 757 | `#F3F4F6` | 背景色 | 使用 theme token |
| [SearchScreenParts.tsx](file:///C:/AiNeed/apps/mobile/src/components/search/SearchScreenParts.tsx#L796) | 796 | `#D1D5DB` | 背景色 | 使用 theme token |
| [SearchScreenParts.tsx](file:///C:/AiNeed/apps/mobile/src/components/search/SearchScreenParts.tsx#L798) | 798 | `#9CA3AF` | 边框色 | 使用 theme token |

#### 深色背景 (浅色模式下不合规)

| 文件 | 行号 | 硬编码值 | 用途 | 期望状态 |
|------|------|----------|------|----------|
| [CameraScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/photo/CameraScreen.tsx#L302) | 302 | `#000000` | 相机背景 | 相机场景可接受，但应通过 theme.dark |
| [CameraScreen.tsx](file:///C:/AiNeed/apps/mobile/src/screens/photo/CameraScreen.tsx#L332) | 332 | `#1A1A1A` | 控制栏背景 | 同上 |
| [ImmersiveComponents.tsx](file:///C:/AiNeed/apps/mobile/src/components/immersive/ImmersiveComponents.tsx#L121) | 121 | `backgroundColor = "#000"` | 沉浸式组件默认背景 | 应支持浅色模式 |
| [ImmersiveComponents.tsx](file:///C:/AiNeed/apps/mobile/src/components/immersive/ImmersiveComponents.tsx#L1504) | 1504 | `backgroundColor: "#000"` | 背景色 | 同上 |
| [PageTransitions.tsx](file:///C:/AiNeed/apps/mobile/src/components/transitions/PageTransitions.tsx#L892) | 892, 919 | `backgroundColor: "#000"` | 过渡背景 | 应使用 theme token |
| [FlowAnimations.tsx](file:///C:/AiNeed/apps/mobile/src/components/flows/FlowAnimations.tsx#L1004) | 1004 | `backgroundColor: "#0f0a1a"` | 动画背景 | 应使用 theme token |
| [AICompanionMenu.tsx](file:///C:/AiNeed/apps/mobile/src/components/aicompanion/AICompanionMenu.tsx#L364) | 364 | `backgroundColor: "#000"` | 菜单背景 | 应使用 theme token |

#### 大量 #FFFFFF 硬编码 (67+ 处)

在按钮文字、图标颜色等场景中大量使用 `#FFFFFF`，在浅色背景下可能导致白色文字不可见。应使用 `theme.colors.onPrimary` 或 `colors.textOnPrimary` 等 token。

主要文件: TryOnScreen.tsx (15 处), ProfileScreen.tsx (4 处), CameraScreen.tsx (8 处), ProfileReportScreen.tsx (5 处), SharePosterPreview.tsx (4 处), CompleteStep.tsx (3 处), StyleTestStep.tsx (3 处), GradientButton.tsx (3 处), HomeScreen.tsx (3 处), QuickActions.tsx (1 处)。

### 7.2 rgba 硬编码 (100+ 处)

大量 `rgba()` 硬编码值，主要模式：
- `rgba(0,0,0,0.x)` - 遮罩/阴影 (在 theme tokens 中已定义但未在组件中引用)
- `rgba(255,255,255,0.x)` - 白色半透明 (渐变/毛玻璃效果)
- `rgba(198, 123, 92, 0.x)` - 品牌色半透明

应统一使用 theme tokens 中已定义的 `theme.overlays` 系列。

---

## 8. console.log 残留

**严重程度: 中等**

共发现 132 处 console 输出调用，分布如下：

### 8.1 按类型统计

| 类型 | 数量 | 评估 |
|------|------|------|
| `console.log` | ~45 | 大部分应移除或替换为 logger |
| `console.error` | ~35 | 错误处理中可保留，但应替换为 logger.error |
| `console.warn` | ~30 | 警告中可保留，但应替换为 logger.warn |
| `console.debug` | ~2 | 应移除或替换为 logger.debug |

### 8.2 高频文件

| 文件 | 数量 | 说明 |
|------|------|------|
| [ScreenErrorBoundaries.ts](file:///C:/AiNeed/apps/mobile/src/components/screens/ScreenErrorBoundaries.ts#L30) | 22 处 | 所有 ErrorBoundary 的 onReset 回调使用 console.log |
| [AICompanionProvider.tsx](file:///C:/AiNeed/apps/mobile/src/components/aicompanion/AICompanionProvider.tsx#L156) | 14 处 | 大量 console.error/warn/log |
| [offline-cache.ts](file:///C:/AiNeed/apps/mobile/src/services/offline-cache.ts#L72) | 9 处 | 大量 console.log 用于调试 |
| [performanceMonitor.ts](file:///C:/AiNeed/apps/mobile/src/utils/performanceMonitor.ts#L62) | 6 处 | 性能监控日志 |
| [imageCache.tsx](file:///C:/AiNeed/apps/mobile/src/utils/imageCache.tsx#L65) | 6 处 | 缓存操作日志 |
| [apiClient.ts](file:///C:/AiNeed/apps/mobile/src/services/apiClient.ts#L96) | 3 处 | API 请求日志 (生产环境应移除) |
| [secure-storage.ts](file:///C:/AiNeed/apps/mobile/src/utils/security/secure-storage.ts#L51) | 4 处 | 安全模块日志 |
| [polyfills/*.ts](file:///C:/AiNeed/apps/mobile/src/polyfills/expo-file-system.ts#L40) | 6 处 | polyfill 警告 (合理保留) |

### 8.3 已有 logger 工具

项目已有 [utils/logger.ts](file:///C:/AiNeed/apps/mobile/src/utils/logger.ts)，支持 dev-only 日志，但大部分文件未使用它。

---

## 9. 未使用 import

**严重程度: 低**

此维度需要 IDE 级别的 TypeScript 语言服务分析才能精确检测。以下是通过代码模式识别发现的疑似未使用 import：

| 文件 | 疑似未使用 import | 说明 |
|------|-------------------|------|
| 需 IDE 验证 | - | Grep 无法可靠检测未使用 import，需运行 `tsc --noEmit` 或 ESLint `no-unused-vars` 规则 |

**建议**: 运行 `npx tsc --noEmit` 和 `npx eslint --rule 'no-unused-vars: error'` 获取精确结果。

---

## 修复优先级建议

### P0 - 立即修复 (影响用户体验/安全)

1. **浅色模式合规**: HomeScreen.tsx 中 15+ 处硬编码颜色，浅色模式下可能正常但深色模式下会出问题
2. **loading/error/empty 状态**: 19 个屏幕缺少至少一种状态处理，用户在异常情况下看到空白页

### P1 - 短期修复 (1-2 周)

3. **TypeScript any 类型**: 100+ 处 `as any`，特别是 `fontWeight as any` (31 处) 应通过修正 typography token 类型一次性解决
4. **FlashList 迁移**: 11 处 FlatList 应迁移到 FlashList，同时修复 polyfill 降级问题
5. **导航类型化**: 8 处未类型化的 useNavigation/useRoute

### P2 - 中期修复 (2-4 周)

6. **accessibilityLabel**: 从 35% 提升到 80%+，优先处理主要用户流程
7. **console.log 清理**: 统一使用 logger 工具，移除生产环境调试日志
8. **inline styles 迁移**: 67 处内联样式迁移到 StyleSheet.create

### P3 - 长期优化

9. **未使用 import 清理**: 配置 ESLint 规则自动检测
10. **主题 token 统一**: 将所有硬编码颜色迁移到 theme tokens

---

## 审计方法说明

本审计使用以下工具进行自动化扫描：
- `Grep`: 正则模式匹配搜索代码内容
- `Glob`: 文件名模式匹配
- `Read`: 读取关键文件内容

审计仅基于静态代码扫描，未运行时验证。部分问题（如未使用 import）需要 IDE/TypeScript 编译器精确检测。

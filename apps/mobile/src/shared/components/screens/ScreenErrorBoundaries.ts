/**
 * Screen Error Boundaries
 *
 * 这个文件展示了如何为各个 Screen 添加局部错误边界。
 * 使用方式：
 * 1. 在对应的 Screen 文件中导入 withErrorBoundary
 * 2. 使用 withErrorBoundary 包装组件导出
 *
 * 示例：
 * ```typescript
 * import { withErrorBoundary } from '../common/ErrorBoundary';
 *
 * export default withErrorBoundary(MyScreen, {
 *   screenName: 'MyScreen',
 * });
 * ```
 */

import { withErrorBoundary } from "../common/ErrorBoundary";

/**
 * 错误边界配置
 * 为每个 Screen 提供专用的错误处理配置
 */
export const screenErrorBoundaryConfigs = {
  // 主要 Tab 页面
  HomeScreen: {
    screenName: "HomeScreen",
  },
  SearchScreen: {
    screenName: "SearchScreen",
  },
  HeartScreen: {
    screenName: "HeartScreen",
  },
  CartScreen: {
    screenName: "CartScreen",
  },
  WardrobeScreen: {
    screenName: "WardrobeScreen",
  },
  ProfileScreen: {
    screenName: "ProfileScreen",
  },

  // 认证相关页面
  LoginScreen: {
    screenName: "LoginScreen",
  },
  RegisterScreen: {
    screenName: "RegisterScreen",
  },

  // AI 功能页面
  AiStylistScreen: {
    screenName: "AiStylistScreen",
  },
  VirtualTryOnScreen: {
    screenName: "VirtualTryOnScreen",
  },

  // 订单相关页面
  OrdersScreen: {
    screenName: "OrdersScreen",
  },
  OrderDetailScreen: {
    screenName: "OrderDetailScreen",
  },
  CheckoutScreen: {
    screenName: "CheckoutScreen",
  },

  // 设置相关页面
  SettingsScreen: {
    screenName: "SettingsScreen",
  },
  NotificationSettingsScreen: {
    screenName: "NotificationSettingsScreen",
  },

  // 其他页面
  FavoritesScreen: {
    screenName: "FavoritesScreen",
  },
  CommunityScreen: {
    screenName: "CommunityScreen",
  },
  OnboardingScreen: {
    screenName: "OnboardingScreen",
  },
  SubscriptionScreen: {
    screenName: "SubscriptionScreen",
  },
  CustomizationScreen: {
    screenName: "CustomizationScreen",
  },
  AddClothingScreen: {
    screenName: "AddClothingScreen",
  },
  ClothingDetailScreen: {
    screenName: "ClothingDetailScreen",
  },
  OutfitDetailScreen: {
    screenName: "OutfitDetailScreen",
  },
  RecommendationDetailScreen: {
    screenName: "RecommendationDetailScreen",
  },
  NotificationsScreen: {
    screenName: "NotificationsScreen",
  },
  LegalScreen: {
    screenName: "LegalScreen",
  },
} as const;

/**
 * 为 Screen 组件添加错误边界的便捷函数
 * @param screenName - Screen 名称
 * @param Component - React 组件
 * @returns 带错误边界的组件
 *
 * @example
 * ```typescript
 * import { wrapScreenWithErrorBoundary } from '../components/screens/ScreenErrorBoundaries';
 *
 * export default wrapScreenWithErrorBoundary('HomeScreen', HomeScreen);
 * ```
 */
export function wrapScreenWithErrorBoundary<P extends Record<string, unknown>>(
  screenName: keyof typeof screenErrorBoundaryConfigs,
  Component: React.ComponentType<P>
): React.FC<P> {
  const config = screenErrorBoundaryConfigs[screenName];
  return withErrorBoundary(Component, config);
}

/**
 * 使用示例：
 *
 * 在各个 Screen 文件中：
 *
 * 1. HomeScreen.tsx:
 * ```typescript
 * import { withErrorBoundary } from '../shared/components/common/ErrorBoundary';
 *
 * export const HomeScreen: React.FC = () => {
 *   // ... 组件实现
 * };
 *
 * export default withErrorBoundary(HomeScreen, {
 *   screenName: 'HomeScreen',
 * });
 * ```
 *
 * 2. 或者使用 wrapScreenWithErrorBoundary:
 * ```typescript
 * import { wrapScreenWithErrorBoundary } from '../components/screens/ScreenErrorBoundaries';
 *
 * export const HomeScreen: React.FC = () => {
 *   // ... 组件实现
 * };
 *
 * export default wrapScreenWithErrorBoundary('HomeScreen', HomeScreen);
 * ```
 */

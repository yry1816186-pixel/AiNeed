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
 *   onReset: () => console.log('[MyScreen] Reset'),
 * });
 * ```
 */

import { withErrorBoundary } from '../common/ErrorBoundary';

/**
 * 错误边界配置
 * 为每个 Screen 提供专用的错误处理配置
 */
export const screenErrorBoundaryConfigs = {
  // 主要 Tab 页面
  HomeScreen: {
    screenName: 'HomeScreen',
    onReset: () => console.log('[HomeScreen] Error boundary reset'),
  },
  SearchScreen: {
    screenName: 'SearchScreen',
    onReset: () => console.log('[SearchScreen] Error boundary reset'),
  },
  HeartScreen: {
    screenName: 'HeartScreen',
    onReset: () => console.log('[HeartScreen] Error boundary reset'),
  },
  CartScreen: {
    screenName: 'CartScreen',
    onReset: () => console.log('[CartScreen] Error boundary reset'),
  },
  WardrobeScreen: {
    screenName: 'WardrobeScreen',
    onReset: () => console.log('[WardrobeScreen] Error boundary reset'),
  },
  ProfileScreen: {
    screenName: 'ProfileScreen',
    onReset: () => console.log('[ProfileScreen] Error boundary reset'),
  },

  // 认证相关页面
  LoginScreen: {
    screenName: 'LoginScreen',
    onReset: () => console.log('[LoginScreen] Error boundary reset'),
  },
  RegisterScreen: {
    screenName: 'RegisterScreen',
    onReset: () => console.log('[RegisterScreen] Error boundary reset'),
  },

  // AI 功能页面
  AiStylistScreen: {
    screenName: 'AiStylistScreen',
    onReset: () => console.log('[AiStylistScreen] Error boundary reset'),
  },
  VirtualTryOnScreen: {
    screenName: 'VirtualTryOnScreen',
    onReset: () => console.log('[VirtualTryOnScreen] Error boundary reset'),
  },

  // 订单相关页面
  OrdersScreen: {
    screenName: 'OrdersScreen',
    onReset: () => console.log('[OrdersScreen] Error boundary reset'),
  },
  OrderDetailScreen: {
    screenName: 'OrderDetailScreen',
    onReset: () => console.log('[OrderDetailScreen] Error boundary reset'),
  },
  CheckoutScreen: {
    screenName: 'CheckoutScreen',
    onReset: () => console.log('[CheckoutScreen] Error boundary reset'),
  },

  // 设置相关页面
  SettingsScreen: {
    screenName: 'SettingsScreen',
    onReset: () => console.log('[SettingsScreen] Error boundary reset'),
  },
  NotificationSettingsScreen: {
    screenName: 'NotificationSettingsScreen',
    onReset: () => console.log('[NotificationSettingsScreen] Error boundary reset'),
  },

  // 其他页面
  FavoritesScreen: {
    screenName: 'FavoritesScreen',
    onReset: () => console.log('[FavoritesScreen] Error boundary reset'),
  },
  CommunityScreen: {
    screenName: 'CommunityScreen',
    onReset: () => console.log('[CommunityScreen] Error boundary reset'),
  },
  OnboardingScreen: {
    screenName: 'OnboardingScreen',
    onReset: () => console.log('[OnboardingScreen] Error boundary reset'),
  },
  SubscriptionScreen: {
    screenName: 'SubscriptionScreen',
    onReset: () => console.log('[SubscriptionScreen] Error boundary reset'),
  },
  CustomizationScreen: {
    screenName: 'CustomizationScreen',
    onReset: () => console.log('[CustomizationScreen] Error boundary reset'),
  },
  AddClothingScreen: {
    screenName: 'AddClothingScreen',
    onReset: () => console.log('[AddClothingScreen] Error boundary reset'),
  },
  ClothingDetailScreen: {
    screenName: 'ClothingDetailScreen',
    onReset: () => console.log('[ClothingDetailScreen] Error boundary reset'),
  },
  OutfitDetailScreen: {
    screenName: 'OutfitDetailScreen',
    onReset: () => console.log('[OutfitDetailScreen] Error boundary reset'),
  },
  RecommendationDetailScreen: {
    screenName: 'RecommendationDetailScreen',
    onReset: () => console.log('[RecommendationDetailScreen] Error boundary reset'),
  },
  NotificationsScreen: {
    screenName: 'NotificationsScreen',
    onReset: () => console.log('[NotificationsScreen] Error boundary reset'),
  },
  LegalScreen: {
    screenName: 'LegalScreen',
    onReset: () => console.log('[LegalScreen] Error boundary reset'),
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
 * import { withErrorBoundary } from '../components/common/ErrorBoundary';
 * 
 * export const HomeScreen: React.FC = () => {
 *   // ... 组件实现
 * };
 * 
 * export default withErrorBoundary(HomeScreen, {
 *   screenName: 'HomeScreen',
 *   onReset: () => console.log('[HomeScreen] Reset'),
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

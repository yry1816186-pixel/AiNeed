import { createNavigationContainerRef, NavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList, MainTabParamList } from '../types/navigation';
import type { NavigationState, PartialState, Route } from '@react-navigation/native';

/**
 * 类型安全的导航引用
 * 支持 RootStack 和 MainTab 的所有路由
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * 设置导航引用（向后兼容）
 * @deprecated 直接使用 navigationRef 即可
 */
export const setNavigationRef = (ref: NavigationContainerRef<RootStackParamList> | null) => {
  console.warn('setNavigationRef is deprecated, use navigationRef directly');
};

/**
 * 获取当前路由名称
 */
export const getCurrentRouteName = (): string | undefined => {
  if (navigationRef.isReady()) {
    return navigationRef.getCurrentRoute()?.name;
  }
  return undefined;
};

/**
 * 类型安全的导航函数
 * @param name - 目标路由名称
 * @param params - 路由参数
 */
export function navigate<T extends keyof RootStackParamList>(
  name: T,
  params?: RootStackParamList[T]
): void {
  if (navigationRef.isReady()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigationRef as any).navigate(name as string, params as Record<string, unknown>);
  }
}

/**
 * 导航到 Tab 页面
 */
export function navigateTab<T extends keyof MainTabParamList>(
  name: T,
  params?: MainTabParamList[T]
): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('MainTabs', { screen: name, params });
  }
}

/**
 * 返回上一页
 */
export const goBack = (): void => {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
};

/**
 * 重置导航栈
 */
export function reset(
  routes: Array<{ name: keyof RootStackParamList; params?: RootStackParamList[keyof RootStackParamList] }>,
  index: number = 0
): void {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index,
      routes,
    });
  }
}

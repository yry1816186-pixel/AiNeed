import { useEffect, useCallback, useRef } from "react";
import { analytics } from "../services/analytics";

/** 预定义事件名常量，与后端 AnalyticsService eventType 对齐 */
export const AnalyticsEvents = {
  SCREEN_VIEW: "screen_view",
  BUTTON_CLICK: "click",
  ADD_TO_CART: "add_to_cart",
  REMOVE_FROM_CART: "remove_from_cart",
  PURCHASE: "purchase",
  TRY_ON_START: "try_on_start",
  TRY_ON_COMPLETE: "try_on_complete",
  SEARCH: "search",
  FILTER: "filter",
  FAVORITE: "favorite",
  UNFAVORITE: "unfavorite",
  SHARE: "share",
  RECOMMENDATION_VIEW: "recommendation_view",
  RECOMMENDATION_CLICK: "recommendation_click",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

interface UseAnalyticsOptions {
  /** 自动在 mount 时发送 screen_view 事件 */
  screenName?: string;
  /** 附加到 screen_view 的额外属性 */
  screenParams?: Record<string, unknown>;
}

/**
 * 便捷埋点 hook。
 *
 * @example
 * ```tsx
 * // 自动上报页面浏览
 * useAnalytics({ screenName: "HomeScreen" });
 *
 * // 手动上报事件
 * const { track } = useAnalytics();
 * track(AnalyticsEvents.ADD_TO_CART, { itemId: "123", price: 99.9 });
 * ```
 */
export function useAnalytics(options?: UseAnalyticsOptions) {
  const { screenName, screenParams } = options ?? {};

  // 自动上报页面浏览
  useEffect(() => {
    if (screenName) {
      analytics.trackScreen(screenName, screenParams);
    }
  }, [screenName, screenParams]);

  const track = useCallback(
    (eventName: string, properties?: Record<string, unknown>) => {
      analytics.track(eventName, properties);
    },
    []
  );

  const trackScreen = useCallback(
    (name: string, params?: Record<string, unknown>) => {
      analytics.trackScreen(name, params);
    },
    []
  );

  return { track, trackScreen };
}

/**
 * 自动上报页面浏览的便捷 hook。
 * 使用 ref 确保同一 screenName 只上报一次，避免 StrictMode 双重触发。
 *
 * @example
 * ```tsx
 * function HomeScreen() {
 *   useScreenTracking("Home");
 *   // ...
 * }
 * ```
 */
export function useScreenTracking(screenName: string, properties?: Record<string, unknown>) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!hasTracked.current) {
      hasTracked.current = true;
      analytics.trackScreen(screenName, properties);
    }
  }, [screenName]);
}

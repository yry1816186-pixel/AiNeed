import { useDemoStore } from "../stores/demoStore";
import { logger } from "../utils/logger";

export function isDemoModeEnabled(): boolean {
  return useDemoStore.getState().demoMode;
}

export function getDemoMockResponse(endpoint: string): unknown | null {
  const state = useDemoStore.getState();
  if (!state.demoMode) {return null;}

  if (__DEV__) { logger.debug("[DemoMode] Intercepting API call:", endpoint); }

  if (endpoint.includes("/recommendation") || endpoint.includes("/ai-stylist")) {
    return {
      success: true,
      data: {
        recommendations: [],
        message: "Demo mode enabled: pre-cached data loaded",
      },
      meta: { fromCache: true, demoMode: true },
    };
  }

  if (endpoint.includes("/look") || endpoint.includes("/outfit")) {
    return {
      success: true,
      data: { outfits: [], message: "Demo mode enabled: look data cached" },
      meta: { fromCache: true, demoMode: true },
    };
  }

  if (endpoint.includes("/tryon") || endpoint.includes("/try-on")) {
    return {
      success: true,
      data: { resultUrl: null, message: "Demo mode enabled: try-on disabled" },
      meta: { fromCache: true, demoMode: true },
    };
  }

  return null;
}

export function shouldBlockMutation(endpoint: string): boolean {
  const state = useDemoStore.getState();
  if (!state.demoMode) {return false;}

  if (__DEV__) { logger.debug("[DemoMode] Blocking mutation:", endpoint); }

  const mutationEndpoints = [
    "/wardrobe",
    "/cart",
    "/payment",
    "/order",
    "/profile/edit",
    "/settings",
    "/password",
    "/community/post",
    "/comment",
    "/favorite",
    "/feedback",
    "/report",
  ];

  return mutationEndpoints.some((e) => endpoint.includes(e));
}

export function demoModeGuard(): void {
  if (isDemoModeEnabled()) {
    if (__DEV__) { logger.debug("[DemoMode] Demo mode enabled - zero live API dependency during demo"); }
  }
}

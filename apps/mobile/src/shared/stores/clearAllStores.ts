/* eslint-disable no-empty */
import { useAuthStore } from "../../features/auth/stores";
import { useAnalysisStore } from "../../features/profile/stores/analysis.store";
import { useRecommendationStore } from "../../features/home/stores/recommendation.store";
import { useCartStore } from "../../features/commerce/stores/cart.store";
import { useHeartRecommendStore } from "../../features/home/stores/heart-recommend.store";

/**
 * Centralized store cleanup function.
 * Called on logout / account deletion to reset all Zustand stores.
 */
export const clearAllStores = async () => {
  try {
    await useAuthStore.getState().logout();
  } catch {}
  try {
    useAnalysisStore.getState().clearAnalysis();
  } catch {}
  try {
    useRecommendationStore.getState().clear();
  } catch {}
  try {
    useCartStore.getState().clear();
  } catch {}
  try {
    useHeartRecommendStore.getState().clearSession();
  } catch {}
};

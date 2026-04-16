export { useUIStore } from "../shared/stores/uiStore";
export type { ModalType, ActiveTab, ThemeMode } from "../shared/stores/uiStore";
export { useTheme, useModal, useLoading, useNotifications, useOnline } from "../shared/stores/uiStore";
export { useAppStore, initNetworkListener, cleanupNetworkListener } from "../shared/stores/app.store";
export type { NetworkType } from "../shared/stores/app.store";

export { useAuthStore } from "../features/auth/stores/authStore";
export { useClothingStore } from "../features/wardrobe/stores/clothingStore";
export { useWardrobeStore } from "../features/wardrobe/stores/wardrobeStore";
export { useHomeStore } from "../features/home/stores/homeStore";
export type { WeatherData } from "../features/home/stores/homeStore";
export { useProfileCompletion, useWeatherData, useBannerState } from "../features/home/stores/homeStore";
export { useRecommendationFeedStore } from "../features/home/stores/recommendationFeedStore";
export { useHeartRecommendStore } from "../features/home/stores/heart-recommend.store";
export type { LikedItemData } from "../features/home/stores/heart-recommend.store";
export { useRecommendationStore } from "../features/home/stores/recommendation.store";
export { useCartStore } from "../features/commerce/stores/cart.store";
export { useCouponStore } from "../features/commerce/stores/couponStore";
export { useOrderStore } from "../features/commerce/stores/orderStore";
export { useSizeRecommendationStore } from "../features/commerce/stores/sizeRecommendationStore";
export { useQuizStore } from "../features/style-quiz/stores/quizStore";
export { useStyleQuizStore, useStyleQuizCurrentQuiz, useStyleQuizProgress, useStyleQuizResult, useStyleQuizLoading, useStyleQuizError } from "../features/style-quiz/stores/index";
export { useProfileStore } from "../features/profile/stores/profileStore";
export { usePhotoStore } from "../features/tryon/stores/photoStore";
export { useAiStylistStore } from "../features/stylist/stores/aiStylistStore";
export { useAiStylistChatStore } from "../features/stylist/stores/aiStylistChatStore";
export { useNotificationStore } from "../features/notifications/stores/notificationStore";
export { useOnboardingStore } from "../features/onboarding/stores/onboardingStore";
export { useAnalysisStore } from "../features/profile/stores/analysis.store";
export { useBloggerStore } from "../features/community/stores/bloggerStore";
export { useConsultantStore } from "../features/consultant/stores/consultantStore";
export { useChatStore } from "../features/consultant/stores/chatStore";
export { useCustomizationEditorStore } from "../features/customization/stores/customizationEditorStore";
export { useUserStore } from "./user.store";

export async function clearAllStores(): Promise<void> {
  const { useUIStore } = await import("../shared/stores/uiStore");
  const { useAppStore } = await import("../shared/stores/app.store");
  const { useAuthStore } = await import("../features/auth/stores/authStore");

  useUIStore.getState().reset();
  useAppStore.getState().resetApp();

  try {
    useAuthStore.getState().logout();
  } catch {
    // ignore errors during store clearing
  }
}

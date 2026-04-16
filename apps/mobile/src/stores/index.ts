export { useAuthStore } from "../features/auth/stores";
export type { AuthState, StyleProfile } from "../features/auth/stores/authStore";
export { useQuizStore } from "../features/style-quiz/stores";
export { useClothingStore } from "../features/wardrobe/stores/clothingStore";
export { useWardrobeStore } from "../features/wardrobe/stores/wardrobeStore";
export { useHomeStore } from "../features/home/stores/homeStore";
export { useCartStore } from "../features/commerce/stores/cart.store";
export { useProfileStore } from "../features/profile/stores/profileStore";
export { useAnalysisStore } from "../features/profile/stores/analysis.store";
export { useNotificationStore } from "../features/notifications/stores/notificationStore";
export { useOnboardingStore } from "../features/onboarding/stores/onboardingStore";
export { usePhotoStore } from "../features/tryon/stores/photoStore";
export { useBloggerStore } from "../features/community/stores/bloggerStore";
export { useConsultantStore } from "../features/consultant/stores/consultantStore";
export { useChatStore } from "../features/consultant/stores/chatStore";
export { useCustomizationEditorStore } from "../features/customization/stores/customizationEditorStore";
export { useAiStylistStore } from "../features/stylist/stores/aiStylistStore";
export { useAiStylistChatStore } from "../features/stylist/stores/aiStylistChatStore";
export { useHeartRecommendStore } from "../features/home/stores/heart-recommend.store";
export type { LikedItemData } from "../features/home/stores/heart-recommend.store";
export { useRecommendationStore } from "../features/home/stores/recommendation.store";
export { useRecommendationFeedStore } from "../features/home/stores/recommendationFeedStore";
export { useSizeRecommendationStore } from "../features/commerce/stores/sizeRecommendationStore";
export { useCouponStore } from "../features/commerce/stores/couponStore";
export { useOrderStore } from "../features/commerce/stores/orderStore";
export { useAppStore } from "../shared/stores/app.store";
export { useUIStore } from "../shared/stores/uiStore";

export function clearAllStores() {
  const { useAuthStore: auth } = require("../features/auth/stores/authStore");
  const { useQuizStore: quiz } = require("../features/style-quiz/stores/quizStore");
  const { useClothingStore: clothing } = require("../features/wardrobe/stores/clothingStore");
  const { useHomeStore: home } = require("../features/home/stores/homeStore");
  const { useCartStore: cart } = require("../features/commerce/stores/cart.store");
  const { useProfileStore: profile } = require("../features/profile/stores/profileStore");
  const { useNotificationStore: notif } = require("../features/notifications/stores/notificationStore");
  const { useOnboardingStore: onboard } = require("../features/onboarding/stores/onboardingStore");
  const { usePhotoStore: photo } = require("../features/tryon/stores/photoStore");
  const { useBloggerStore: blogger } = require("../features/community/stores/bloggerStore");
  const { useConsultantStore: consultant } = require("../features/consultant/stores/consultantStore");
  const { useChatStore: chat } = require("../features/consultant/stores/chatStore");
  const { useCustomizationEditorStore: custom } = require("../features/customization/stores/customizationEditorStore");
  const { useAiStylistStore: stylist } = require("../features/stylist/stores/aiStylistStore");
  const { useAiStylistChatStore: stylistChat } = require("../features/stylist/stores/aiStylistChatStore");
  const { useHeartRecommendStore: heart } = require("../features/home/stores/heart-recommend.store");
  const { useRecommendationStore: rec } = require("../features/home/stores/recommendation.store");
  const { useRecommendationFeedStore: recFeed } = require("../features/home/stores/recommendationFeedStore");
  const { useSizeRecommendationStore: sizeRec } = require("../features/commerce/stores/sizeRecommendationStore");
  const { useCouponStore: coupon } = require("../features/commerce/stores/couponStore");
  const { useOrderStore: order } = require("../features/commerce/stores/orderStore");
  const { useAppStore: app } = require("../shared/stores/app.store");
  const { useUIStore: ui } = require("../shared/stores/uiStore");

  const stores = [
    quiz, clothing, home, cart, profile, notif, onboard, photo,
    blogger, consultant, chat, custom, stylist, stylistChat,
    heart, rec, recFeed, sizeRec, coupon, order, app, ui,
  ];
  stores.forEach((store) => {
    try {
      store.getState()?.reset?.();
    } catch {}
  });
}

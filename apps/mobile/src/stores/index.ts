import { create } from "zustand";

export * from "../shared/stores/uiStore";
export * from "../features/wardrobe/stores/clothingStore";
export * from "../features/wardrobe/stores/wardrobeStore";
export * from "../features/profile/stores/profileStore";
export * from "../features/style-quiz/stores/quizStore";
export * from "../features/onboarding/stores/onboardingStore";
export * from "../features/tryon/stores/photoStore";
export * from "../features/home/stores/homeStore";
export * from "../shared/stores/app.store";
export * from "../features/stylist/stores/aiStylistStore";
export * from "../features/stylist/stores/aiStylistChatStore";
export * from "../features/notifications/stores/notificationStore";
export { useAuthStore } from "../features/auth/stores/authStore";
export type { AuthState, StyleProfile } from "../features/auth/stores/authStore";

export { useAnalysisStore } from "../features/profile/stores/analysis.store";
export { useRecommendationStore } from "../features/home/stores/recommendation.store";
export { useCartStore } from "../features/commerce/stores/cart.store";
export { useHeartRecommendStore } from "../features/home/stores/heart-recommend.store";
export type { LikedItemData } from "../features/home/stores/heart-recommend.store";

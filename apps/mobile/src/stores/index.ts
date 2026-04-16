import { create } from "zustand";

// Re-export from dedicated store files
export * from "./uiStore";
export * from "./clothingStore";
export * from "./wardrobeStore";
export * from "./profileStore";
export * from "./quizStore";
export * from "./styleQuizStore";
export * from "./onboardingStore";
export * from "./photoStore";
export * from "./homeStore";
export * from "./user.store";
export * from "./app.store";
export * from "./aiStylistStore";
export * from "./aiStylistChatStore";
export * from "./notificationStore";
export { useAuthStore } from "./auth.store";

// Re-export from split store files
export { useAnalysisStore } from "./analysis.store";
export { useRecommendationStore } from "./recommendation.store";
export { useCartStore } from "./cart.store";
export { useHeartRecommendStore } from "./heart-recommend.store";
export type { LikedItemData } from "./heart-recommend.store";

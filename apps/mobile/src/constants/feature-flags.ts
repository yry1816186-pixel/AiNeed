export const FeatureFlagKeys = {
  V2_CHECKOUT: "v2_checkout",
  AI_COMPANION: "ai_companion",
  SOCIAL_COMMUNITY: "social_community",
  VIRTUAL_TRY_ON_V2: "virtual_try_on_v2",
  RECOMMENDATION_FEED: "recommendation_feed",
  STYLE_QUIZ: "style_quiz",
  DARK_MODE: "dark_mode",
  ANALYTICS_V2: "analytics_v2",
} as const;

export type FeatureFlagKey = (typeof FeatureFlagKeys)[keyof typeof FeatureFlagKeys];

export const FeatureFlagDefaults: Record<FeatureFlagKey, boolean> = {
  v2_checkout: false,
  ai_companion: true,
  social_community: true,
  virtual_try_on_v2: false,
  recommendation_feed: true,
  style_quiz: true,
  dark_mode: true,
  analytics_v2: false,
};

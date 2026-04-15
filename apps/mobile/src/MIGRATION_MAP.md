# Migration Map: Flat Structure → Feature-Based Architecture

## Screens → features/*/screens/

### Auth
SOURCE: src/screens/LoginScreen.tsx → DEST: src/features/auth/screens/LoginScreen.tsx
SOURCE: src/screens/PhoneLoginScreen.tsx → DEST: src/features/auth/screens/PhoneLoginScreen.tsx
SOURCE: src/screens/RegisterScreen.tsx → DEST: src/features/auth/screens/RegisterScreen.tsx
SOURCE: src/screens/OnboardingScreen.tsx → DEST: src/features/auth/screens/OnboardingScreen.tsx

### Stylist
SOURCE: src/screens/AiStylistScreen.tsx → DEST: src/features/stylist/screens/AiStylistScreen.tsx
SOURCE: src/screens/AiStylistChatScreen.tsx → DEST: src/features/stylist/screens/AiStylistChatScreen.tsx
SOURCE: src/screens/OutfitPlanScreen.tsx → DEST: src/features/stylist/screens/OutfitPlanScreen.tsx
SOURCE: src/screens/ChatHistoryScreen.tsx → DEST: src/features/stylist/screens/ChatHistoryScreen.tsx
SOURCE: src/screens/SessionCalendarScreen.tsx → DEST: src/features/stylist/screens/SessionCalendarScreen.tsx
SOURCE: src/screens/OutfitDetailScreen.tsx → DEST: src/features/stylist/screens/OutfitDetailScreen.tsx

### TryOn
SOURCE: src/screens/VirtualTryOnScreen.tsx → DEST: src/features/tryon/screens/VirtualTryOnScreen.tsx
SOURCE: src/screens/TryOnResultScreen.tsx → DEST: src/features/tryon/screens/TryOnResultScreen.tsx
SOURCE: src/components/screens/TryOnHistoryScreen.tsx → DEST: src/features/tryon/screens/TryOnHistoryScreen.tsx
SOURCE: src/components/screens/TryOnScreen.tsx → DEST: src/features/tryon/screens/TryOnScreen.tsx
SOURCE: src/screens/photo/CameraScreen.tsx → DEST: src/features/tryon/screens/CameraScreen.tsx
SOURCE: src/screens/photo/components/ → DEST: src/features/tryon/screens/components/

### Home
SOURCE: src/screens/home/HomeScreen.tsx → DEST: src/features/home/screens/HomeScreen.tsx
SOURCE: src/screens/home/components/ → DEST: src/features/home/screens/components/
SOURCE: src/screens/HeartScreen.tsx → DEST: src/features/home/screens/HeartScreen.tsx
SOURCE: src/screens/RecommendationsScreen.tsx → DEST: src/features/home/screens/RecommendationsScreen.tsx
SOURCE: src/screens/RecommendationDetailScreen.tsx → DEST: src/features/home/screens/RecommendationDetailScreen.tsx
SOURCE: src/screens/recommendations/RecommendationFeedScreen.tsx → DEST: src/features/home/screens/RecommendationFeedScreen.tsx

### Wardrobe
SOURCE: src/screens/WardrobeScreen.tsx → DEST: src/features/wardrobe/screens/WardrobeScreen.tsx
SOURCE: src/screens/AddClothingScreen.tsx → DEST: src/features/wardrobe/screens/AddClothingScreen.tsx
SOURCE: src/screens/FavoritesScreen.tsx → DEST: src/features/wardrobe/screens/FavoritesScreen.tsx
SOURCE: src/screens/ClothingDetailScreen.tsx → DEST: src/features/wardrobe/screens/ClothingDetailScreen.tsx
SOURCE: src/screens/BrandScreen.tsx → DEST: src/features/wardrobe/screens/BrandScreen.tsx

### Community
SOURCE: src/screens/CommunityScreen.tsx → DEST: src/features/community/screens/CommunityScreen.tsx
SOURCE: src/screens/CreatePostScreen.tsx → DEST: src/features/community/screens/CreatePostScreen.tsx
SOURCE: src/screens/PostDetailScreen.tsx → DEST: src/features/community/screens/PostDetailScreen.tsx
SOURCE: src/screens/InfluencerProfileScreen.tsx → DEST: src/features/community/screens/InfluencerProfileScreen.tsx
SOURCE: src/screens/InspirationWardrobeScreen.tsx → DEST: src/features/community/screens/InspirationWardrobeScreen.tsx
SOURCE: src/screens/BloggerDashboardScreen.tsx → DEST: src/features/community/screens/BloggerDashboardScreen.tsx
SOURCE: src/screens/BloggerProfileScreen.tsx → DEST: src/features/community/screens/BloggerProfileScreen.tsx
SOURCE: src/screens/BloggerProductScreen.tsx → DEST: src/features/community/screens/BloggerProductScreen.tsx
SOURCE: src/screens/community/CommunityFeed.tsx → DEST: src/features/community/screens/CommunityFeed.tsx
SOURCE: src/screens/community/CommunityHeader.tsx → DEST: src/features/community/screens/CommunityHeader.tsx
SOURCE: src/screens/community/CreatePostFab.tsx → DEST: src/features/community/screens/CreatePostFab.tsx

### Commerce
SOURCE: src/screens/CartScreen.tsx → DEST: src/features/commerce/screens/CartScreen.tsx
SOURCE: src/screens/CheckoutScreen.tsx → DEST: src/features/commerce/screens/CheckoutScreen.tsx
SOURCE: src/screens/PaymentScreen.tsx → DEST: src/features/commerce/screens/PaymentScreen.tsx
SOURCE: src/screens/OrdersScreen.tsx → DEST: src/features/commerce/screens/OrdersScreen.tsx
SOURCE: src/screens/OrderDetailScreen.tsx → DEST: src/features/commerce/screens/OrderDetailScreen.tsx
SOURCE: src/screens/SubscriptionScreen.tsx → DEST: src/features/commerce/screens/SubscriptionScreen.tsx
SOURCE: src/screens/MerchantApplyScreen.tsx → DEST: src/features/commerce/screens/MerchantApplyScreen.tsx
SOURCE: src/screens/BrandQRScanScreen.tsx → DEST: src/features/commerce/screens/BrandQRScanScreen.tsx
SOURCE: src/screens/StockNotificationScreen.tsx → DEST: src/features/commerce/screens/StockNotificationScreen.tsx

### Profile
SOURCE: src/screens/ProfileScreen.tsx → DEST: src/features/profile/screens/ProfileScreen.tsx
SOURCE: src/screens/ProfileEditScreen.tsx → DEST: src/features/profile/screens/ProfileEditScreen.tsx
SOURCE: src/screens/BodyAnalysisScreen.tsx → DEST: src/features/profile/screens/BodyAnalysisScreen.tsx
SOURCE: src/screens/ColorAnalysisScreen.tsx → DEST: src/features/profile/screens/ColorAnalysisScreen.tsx
SOURCE: src/screens/SharePosterScreen.tsx → DEST: src/features/profile/screens/SharePosterScreen.tsx
SOURCE: src/screens/ProfileReportScreen.tsx → DEST: src/features/profile/screens/ProfileReportScreen.tsx
SOURCE: src/screens/profile/components/ → DEST: src/features/profile/screens/components/
SOURCE: src/screens/SettingsScreen.tsx → DEST: src/features/profile/screens/SettingsScreen.tsx
SOURCE: src/screens/LegalScreen.tsx → DEST: src/features/profile/screens/LegalScreen.tsx

### Style Quiz
SOURCE: src/screens/style-quiz/StyleQuizScreen.tsx → DEST: src/features/style-quiz/screens/StyleQuizScreen.tsx
SOURCE: src/screens/style-quiz/QuizResultScreen.tsx → DEST: src/features/style-quiz/screens/QuizResultScreen.tsx
SOURCE: src/screens/style-quiz/components/ → DEST: src/features/style-quiz/screens/components/

### Customization
SOURCE: src/screens/CustomizationScreen.tsx → DEST: src/features/customization/screens/CustomizationScreen.tsx
SOURCE: src/screens/CustomizationEditorScreen.tsx → DEST: src/features/customization/screens/CustomizationEditorScreen.tsx
SOURCE: src/screens/CustomizationPreviewScreen.tsx → DEST: src/features/customization/screens/CustomizationPreviewScreen.tsx
SOURCE: src/screens/CustomizationOrderDetailScreen.tsx → DEST: src/features/customization/screens/CustomizationOrderDetailScreen.tsx

### Consultant
SOURCE: src/screens/consultant/AdvisorListScreen.tsx → DEST: src/features/consultant/screens/AdvisorListScreen.tsx
SOURCE: src/screens/consultant/AdvisorProfileScreen.tsx → DEST: src/features/consultant/screens/AdvisorProfileScreen.tsx
SOURCE: src/screens/consultant/BookingScreen.tsx → DEST: src/features/consultant/screens/BookingScreen.tsx
SOURCE: src/screens/consultant/ChatScreen.tsx → DEST: src/features/consultant/screens/ChatScreen.tsx

### Onboarding
SOURCE: src/screens/onboarding/OnboardingWizard.tsx → DEST: src/features/onboarding/screens/OnboardingWizard.tsx
SOURCE: src/screens/onboarding/steps/ → DEST: src/features/onboarding/screens/steps/

### Search
SOURCE: src/screens/SearchScreen.tsx → DEST: src/features/search/screens/SearchScreen.tsx

### Notifications
SOURCE: src/screens/NotificationsScreen.tsx → DEST: src/features/notifications/screens/NotificationsScreen.tsx
SOURCE: src/screens/NotificationSettingsScreen.tsx → DEST: src/features/notifications/screens/NotificationSettingsScreen.tsx

## Components → features/*/components/ or shared/components/ or design-system/

### Design System → design-system/
SOURCE: src/components/primitives/ → DEST: src/design-system/primitives/
SOURCE: src/components/ui/ → DEST: src/design-system/ui/
SOURCE: src/components/skeleton/ → DEST: src/design-system/skeleton/

### Shared → shared/components/
SOURCE: src/components/common/ → DEST: src/shared/components/common/
SOURCE: src/components/layout/ → DEST: src/shared/components/layout/
SOURCE: src/components/loading/ → DEST: src/shared/components/loading/
SOURCE: src/components/emptyList/ → DEST: src/shared/components/emptyList/
SOURCE: src/components/ux/ → DEST: src/shared/components/ux/
SOURCE: src/components/ErrorBoundary/ → DEST: src/shared/components/ErrorBoundary/
SOURCE: src/components/filter/ → DEST: src/shared/components/filter/
SOURCE: src/components/immersive/ → DEST: src/shared/components/immersive/
SOURCE: src/components/interactions/ → DEST: src/shared/components/interactions/
SOURCE: src/components/states/ → DEST: src/shared/components/states/
SOURCE: src/components/transitions/ → DEST: src/shared/components/transitions/
SOURCE: src/components/visualization/ → DEST: src/shared/components/visualization/
SOURCE: src/components/PlaceholderScreen.tsx → DEST: src/shared/components/PlaceholderScreen.tsx

### Auth → features/auth/components/
SOURCE: src/components/privacy/ → DEST: src/features/auth/components/privacy/

### Stylist → features/stylist/components/
SOURCE: src/components/aistylist/ → DEST: src/features/stylist/components/aistylist/
SOURCE: src/components/aicompanion/ → DEST: src/features/stylist/components/aicompanion/
SOURCE: src/components/AISizeBadge.tsx → DEST: src/features/stylist/components/AISizeBadge.tsx

### TryOn → features/tryon/components/
SOURCE: src/components/photo/ → DEST: src/features/tryon/components/photo/

### Home → features/home/components/
SOURCE: src/components/home/ → DEST: src/features/home/components/home/
SOURCE: src/components/heartrecommend/ → DEST: src/features/home/components/heartrecommend/
SOURCE: src/components/recommendations/ → DEST: src/features/home/components/recommendations/

### Wardrobe → features/wardrobe/components/
SOURCE: src/components/clothing/ → DEST: src/features/wardrobe/components/clothing/
SOURCE: src/components/wardrobe/ → DEST: src/features/wardrobe/components/wardrobe/
SOURCE: src/components/brand/ → DEST: src/features/wardrobe/components/brand/

### Community → features/community/components/
SOURCE: src/components/community/ → DEST: src/features/community/components/community/
SOURCE: src/components/social/ → DEST: src/features/community/components/social/

### Commerce → features/commerce/components/
SOURCE: src/components/CouponSelector.tsx → DEST: src/features/commerce/components/CouponSelector.tsx
SOURCE: src/components/EmptyCartView.tsx → DEST: src/features/commerce/components/EmptyCartView.tsx
SOURCE: src/components/FreeShippingProgress.tsx → DEST: src/features/commerce/components/FreeShippingProgress.tsx
SOURCE: src/components/InlineSKUSelector.tsx → DEST: src/features/commerce/components/InlineSKUSelector.tsx
SOURCE: src/components/OrderTimeline.tsx → DEST: src/features/commerce/components/OrderTimeline.tsx
SOURCE: src/components/PaymentWaitingScreen.tsx → DEST: src/features/commerce/components/PaymentWaitingScreen.tsx
SOURCE: src/components/ProductImageCarousel.tsx → DEST: src/features/commerce/components/ProductImageCarousel.tsx
SOURCE: src/components/RefundRequestForm.tsx → DEST: src/features/commerce/components/RefundRequestForm.tsx
SOURCE: src/components/SKUSelector.tsx → DEST: src/features/commerce/components/SKUSelector.tsx
SOURCE: src/components/SortBar.tsx → DEST: src/features/commerce/components/SortBar.tsx
SOURCE: src/components/SubcategoryTabs.tsx → DEST: src/features/commerce/components/SubcategoryTabs.tsx
SOURCE: src/components/FilterTags.tsx → DEST: src/features/commerce/components/FilterTags.tsx
SOURCE: src/components/CategoryNavigation.tsx → DEST: src/features/commerce/components/CategoryNavigation.tsx
SOURCE: src/components/OutfitRecommendationCards.tsx → DEST: src/features/commerce/components/OutfitRecommendationCards.tsx
SOURCE: src/components/address/ → DEST: src/features/commerce/components/address/

### Profile → features/profile/components/
SOURCE: src/components/profile/ → DEST: src/features/profile/components/profile/
SOURCE: src/components/charts/ → DEST: src/features/profile/components/charts/

### Customization → features/customization/components/
SOURCE: src/components/customization/ → DEST: src/features/customization/components/customization/

### Consultant → features/consultant/components/
SOURCE: src/components/consultant/ → DEST: src/features/consultant/components/consultant/

### Onboarding → features/onboarding/components/
SOURCE: src/components/onboarding/ → DEST: src/features/onboarding/components/onboarding/
SOURCE: src/components/flows/ → DEST: src/features/onboarding/components/flows/

### Search → features/search/components/
SOURCE: src/components/search/ → DEST: src/features/search/components/search/

### Theme → design-system/theme/
SOURCE: src/components/theme/ → DEST: src/design-system/theme/ThemeSystem.tsx (merge with existing)

## Stores → features/*/stores/ or shared/stores/

SOURCE: src/stores/auth.store.ts + src/stores/user.store.ts → DEST: src/features/auth/stores/authStore.ts (MERGE)
SOURCE: src/stores/quizStore.ts + src/stores/styleQuizStore.ts → DEST: src/features/style-quiz/stores/quizStore.ts (MERGE)
SOURCE: src/stores/clothingStore.ts → DEST: src/features/wardrobe/stores/clothingStore.ts
SOURCE: src/stores/homeStore.ts → DEST: src/features/home/stores/homeStore.ts
SOURCE: src/stores/aiStylistStore.ts → DEST: src/features/stylist/stores/aiStylistStore.ts
SOURCE: src/stores/aiStylistChatStore.ts → DEST: src/features/stylist/stores/aiStylistChatStore.ts
SOURCE: src/stores/cart.store.ts → DEST: src/features/commerce/stores/cart.store.ts
SOURCE: src/stores/orderStore.ts → DEST: src/features/commerce/stores/orderStore.ts
SOURCE: src/stores/couponStore.ts → DEST: src/features/commerce/stores/couponStore.ts
SOURCE: src/stores/sizeRecommendationStore.ts → DEST: src/features/commerce/stores/sizeRecommendationStore.ts
SOURCE: src/stores/wardrobeStore.ts → DEST: src/features/wardrobe/stores/wardrobeStore.ts
SOURCE: src/stores/profileStore.ts → DEST: src/features/profile/stores/profileStore.ts
SOURCE: src/stores/analysis.store.ts → DEST: src/features/profile/stores/analysis.store.ts
SOURCE: src/stores/notificationStore.ts → DEST: src/features/notifications/stores/notificationStore.ts
SOURCE: src/stores/onboardingStore.ts → DEST: src/features/onboarding/stores/onboardingStore.ts
SOURCE: src/stores/photoStore.ts → DEST: src/features/tryon/stores/photoStore.ts
SOURCE: src/stores/bloggerStore.ts → DEST: src/features/community/stores/bloggerStore.ts
SOURCE: src/stores/consultantStore.ts → DEST: src/features/consultant/stores/consultantStore.ts
SOURCE: src/stores/chatStore.ts → DEST: src/features/consultant/stores/chatStore.ts
SOURCE: src/stores/customizationEditorStore.ts → DEST: src/features/customization/stores/customizationEditorStore.ts
SOURCE: src/stores/heart-recommend.store.ts → DEST: src/features/home/stores/heart-recommend.store.ts
SOURCE: src/stores/recommendation.store.ts → DEST: src/features/home/stores/recommendation.store.ts
SOURCE: src/stores/recommendationFeedStore.ts → DEST: src/features/home/stores/recommendationFeedStore.ts
SOURCE: src/stores/app.store.ts → DEST: src/shared/stores/app.store.ts
SOURCE: src/stores/uiStore.ts → DEST: src/shared/stores/uiStore.ts

## Services → features/*/services/ or shared/services/

SOURCE: src/services/api/auth.api.ts → DEST: src/features/auth/services/auth.api.ts
SOURCE: src/services/auth/ → DEST: src/features/auth/services/auth/
SOURCE: src/services/api/sms.api.ts → DEST: src/features/auth/services/sms.api.ts
SOURCE: src/services/api/ai-stylist.api.ts → DEST: src/features/stylist/services/ai-stylist.api.ts
SOURCE: src/services/ai/ → DEST: src/features/stylist/services/ai/
SOURCE: src/services/api/outfit.api.ts → DEST: src/features/stylist/services/outfit.api.ts
SOURCE: src/services/api/tryon.api.ts → DEST: src/features/tryon/services/tryon.api.ts
SOURCE: src/services/api/photos.api.ts → DEST: src/features/tryon/services/photos.api.ts
SOURCE: src/services/api/clothing.api.ts → DEST: src/features/wardrobe/services/clothing.api.ts
SOURCE: src/services/api/commerce.api.ts → DEST: src/features/commerce/services/commerce.api.ts
SOURCE: src/services/api/subscription.api.ts → DEST: src/features/commerce/services/subscription.api.ts
SOURCE: src/services/api/brand-qr.api.ts → DEST: src/features/commerce/services/brand-qr.api.ts
SOURCE: src/services/api/community.api.ts → DEST: src/features/community/services/community.api.ts
SOURCE: src/services/api/blogger.api.ts → DEST: src/features/community/services/blogger.api.ts
SOURCE: src/services/api/profile.api.ts → DEST: src/features/profile/services/profile.api.ts
SOURCE: src/services/api/style-profiles.api.ts → DEST: src/features/profile/services/style-profiles.api.ts
SOURCE: src/services/profileReportService.ts → DEST: src/features/profile/services/profileReportService.ts
SOURCE: src/services/api/style-quiz.api.ts → DEST: src/features/style-quiz/services/style-quiz.api.ts
SOURCE: src/services/quizService.ts → DEST: src/features/style-quiz/services/quizService.ts
SOURCE: src/services/api/customization.api.ts → DEST: src/features/customization/services/customization.api.ts
SOURCE: src/services/api/consultant.api.ts → DEST: src/features/consultant/services/consultant.api.ts
SOURCE: src/services/api/chat.api.ts → DEST: src/features/consultant/services/chat.api.ts
SOURCE: src/services/api/notification.api.ts → DEST: src/features/notifications/services/notification.api.ts
SOURCE: src/services/weatherService.ts → DEST: src/features/home/services/weatherService.ts
SOURCE: src/services/onboardingService.ts → DEST: src/features/onboarding/services/onboardingService.ts
SOURCE: src/services/api/client.ts → DEST: src/shared/services/api/client.ts
SOURCE: src/services/api/error.ts → DEST: src/shared/services/api/error.ts
SOURCE: src/services/api/index.ts → DEST: src/shared/services/api/index.ts
SOURCE: src/services/api/asset-url.ts → DEST: src/shared/services/api/asset-url.ts
SOURCE: src/services/api/display-asset.ts → DEST: src/shared/services/api/display-asset.ts
SOURCE: src/services/api/feature-flag.api.ts → DEST: src/shared/services/api/feature-flag.api.ts
SOURCE: src/services/api/recommendation-feed.api.ts → DEST: src/shared/services/api/recommendation-feed.api.ts
SOURCE: src/services/apiClient.ts → DEST: src/shared/services/apiClient.ts
SOURCE: src/services/analytics.ts → DEST: src/shared/services/analytics.ts
SOURCE: src/services/sentry.ts → DEST: src/shared/services/sentry.ts
SOURCE: src/services/websocket.ts → DEST: src/shared/services/websocket.ts
SOURCE: src/services/offline-cache.ts → DEST: src/shared/services/offline-cache.ts
SOURCE: src/services/deeplinkService.ts → DEST: src/shared/services/deeplinkService.ts
SOURCE: src/services/push-notification.service.ts → DEST: src/shared/services/push-notification.service.ts
SOURCE: src/services/speech/ → DEST: src/shared/services/speech/

## Hooks → features/*/hooks/ or shared/hooks/

SOURCE: src/hooks/useAuth.ts → DEST: src/features/auth/hooks/useAuth.ts
SOURCE: src/hooks/useVerify.ts → DEST: src/features/auth/hooks/useVerify.ts
SOURCE: src/hooks/useCameraPermissions.ts → DEST: src/features/tryon/hooks/useCameraPermissions.ts
SOURCE: src/hooks/useFeatureFlag.ts → DEST: src/shared/hooks/useFeatureFlag.ts
SOURCE: src/hooks/useAdvancedAnimations.ts → DEST: src/shared/hooks/useAdvancedAnimations.ts
SOURCE: src/hooks/useAnalytics.ts → DEST: src/shared/hooks/useAnalytics.ts
SOURCE: src/hooks/useAnimation.ts → DEST: src/shared/hooks/useAnimation.ts
SOURCE: src/hooks/useApi.ts → DEST: src/shared/hooks/useApi.ts
SOURCE: src/hooks/useAsync.ts → DEST: src/shared/hooks/useAsync.ts
SOURCE: src/hooks/useDebounce.ts → DEST: src/shared/hooks/useDebounce.ts
SOURCE: src/hooks/useDisclosure.ts → DEST: src/shared/hooks/useDisclosure.ts
SOURCE: src/hooks/useForm.ts → DEST: src/shared/hooks/useForm.ts
SOURCE: src/hooks/useInfiniteQuery.ts → DEST: src/shared/hooks/useInfiniteQuery.ts
SOURCE: src/hooks/useInfiniteScroll.ts → DEST: src/shared/hooks/useInfiniteScroll.ts
SOURCE: src/hooks/useLazyLoad.ts → DEST: src/shared/hooks/useLazyLoad.ts
SOURCE: src/hooks/useMutationHooks.ts → DEST: src/shared/hooks/useMutationHooks.ts
SOURCE: src/hooks/useNetwork.ts → DEST: src/shared/hooks/useNetwork.ts
SOURCE: src/hooks/useNetworkStatus.ts → DEST: src/shared/hooks/useNetworkStatus.ts
SOURCE: src/hooks/usePagination.ts → DEST: src/shared/hooks/usePagination.ts
SOURCE: src/hooks/usePullToRefresh.ts → DEST: src/shared/hooks/usePullToRefresh.ts
SOURCE: src/hooks/useQueryHooks.ts → DEST: src/shared/hooks/useQueryHooks.ts
SOURCE: src/hooks/useReducedMotion.ts → DEST: src/shared/hooks/useReducedMotion.ts
SOURCE: src/hooks/useReferenceLines.ts → DEST: src/shared/hooks/useReferenceLines.ts
SOURCE: src/hooks/useRefresh.ts → DEST: src/shared/hooks/useRefresh.ts
SOURCE: src/hooks/useRetry.ts → DEST: src/shared/hooks/useRetry.ts
SOURCE: src/hooks/useSeasonAccent.ts → DEST: src/shared/hooks/useSeasonAccent.ts
SOURCE: src/hooks/useStorage.ts → DEST: src/shared/hooks/useStorage.ts
SOURCE: src/hooks/useUploadProgress.ts → DEST: src/shared/hooks/useUploadProgress.ts
SOURCE: src/hooks/index.ts → DEST: src/shared/hooks/index.ts

## Contexts → shared/contexts/

SOURCE: src/contexts/ThemeContext.tsx → DEST: src/shared/contexts/ThemeContext.tsx
SOURCE: src/contexts/ClothingContext.tsx → DEST: src/shared/contexts/ClothingContext.tsx
SOURCE: src/contexts/FeatureFlagContext.tsx → DEST: src/shared/contexts/FeatureFlagContext.tsx
SOURCE: src/contexts/OutfitContext.tsx → DEST: src/shared/contexts/OutfitContext.tsx
SOURCE: src/contexts/VirtualTryOnContext.tsx → DEST: src/shared/contexts/VirtualTryOnContext.tsx
SOURCE: src/contexts/index.ts → DEST: src/shared/contexts/index.ts

## Types → features/*/types/ or shared/types/

SOURCE: src/types/user.ts → DEST: src/features/auth/types/user.ts
SOURCE: src/types/ai.ts → DEST: src/features/stylist/types/ai.ts
SOURCE: src/types/clothing.ts → DEST: src/features/wardrobe/types/clothing.ts
SOURCE: src/types/chat.ts → DEST: src/features/consultant/types/chat.ts
SOURCE: src/types/consultant.ts → DEST: src/features/consultant/types/consultant.ts
SOURCE: src/types/customization.ts → DEST: src/features/customization/types/customization.ts
SOURCE: src/types/social.ts → DEST: src/features/community/types/social.ts
SOURCE: src/types/outfit.ts → DEST: src/features/stylist/types/outfit.ts
SOURCE: src/types/api.ts → DEST: src/shared/types/api.ts
SOURCE: src/types/animations.ts → DEST: src/shared/types/animations.ts
SOURCE: src/types/components.ts → DEST: src/shared/types/components.ts
SOURCE: src/types/events.ts → DEST: src/shared/types/events.ts
SOURCE: src/types/index.ts → DEST: src/shared/types/index.ts
SOURCE: src/types/navigation.ts → DEST: src/navigation/types.ts (keep co-located)

## Theme → design-system/theme/

SOURCE: src/theme/ → DEST: src/design-system/theme/

## Utils → shared/utils/

SOURCE: src/utils/ → DEST: src/shared/utils/

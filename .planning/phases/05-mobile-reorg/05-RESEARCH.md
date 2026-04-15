# Phase 5: 移动端页面重组 — Research

**Researched:** 2026-04-16
**Status:** Complete

## 1. Current Directory Structure Analysis

### 1.1 Top-level `src/` structure (flat, mixed concerns)

```
src/
├── __mocks__/           # Test mocks
├── components/          # 30+ subdirectories, mixed feature/shared
├── config/              # Runtime config
├── constants/           # Feature flags
├── contexts/            # 5 React contexts
├── hooks/               # 25+ custom hooks
├── i18n/                # Internationalization
├── navigation/          # Route definitions + guards
├── polyfills/           # 13 polyfill files
├── screens/             # 50+ screen files (mostly flat)
├── services/            # API + business services
├── stores/              # 25+ Zustand stores
├── theme/               # Design tokens
├── types/               # Local type definitions
└── utils/               # Utility functions
```

### 1.2 Screens inventory (50+ files)

**Flat screens (root of `screens/`):** 37 files
- AddClothingScreen, AiStylistChatScreen, AiStylistScreen, BodyAnalysisScreen
- BrandQRScanScreen, BrandScreen, CartScreen, ChatHistoryScreen
- CheckoutScreen, ClothingDetailScreen, ColorAnalysisScreen, CommunityScreen
- CreatePostScreen, CustomizationEditorScreen, CustomizationOrderDetailScreen
- CustomizationPreviewScreen, CustomizationScreen, FavoritesScreen, HeartScreen
- InfluencerProfileScreen, InspirationWardrobeScreen, LegalScreen, LoginScreen
- MerchantApplyScreen, NotificationSettingsScreen, NotificationsScreen
- OnboardingScreen, OrderDetailScreen, OrdersScreen, OutfitDetailScreen
- OutfitPlanScreen, PaymentScreen, PhoneLoginScreen, PostDetailScreen
- ProfileEditScreen, ProfileScreen, RecommendationDetailScreen
- RecommendationsScreen, RegisterScreen, SearchScreen, SessionCalendarScreen
- SettingsScreen, SharePosterScreen, StockNotificationScreen
- SubscriptionScreen, TryOnResultScreen, VirtualTryOnScreen, WardrobeScreen

**Already organized (subdirectories):**
- `screens/home/` — HomeScreen + components
- `screens/community/` — CommunityFeed, CommunityHeader, CreatePostFab
- `screens/consultant/` — AdvisorListScreen, AdvisorProfileScreen, BookingScreen, ChatScreen
- `screens/onboarding/` — OnboardingWizard + steps
- `screens/photo/` — CameraScreen + components
- `screens/profile/` — ProfileReportScreen + components
- `screens/recommendations/` — RecommendationFeedScreen
- `screens/style-quiz/` — StyleQuizScreen, QuizResultScreen + components

### 1.3 Components inventory (30+ subdirectories)

**Feature-specific components (should move to features/):**
- `aicompanion/` — AI companion ball, chat, menu
- `aistylist/` — AI stylist animations, feedback, reasoning
- `brand/` — Brand motif
- `charts/` — Body silhouette, color palette, tag cloud
- `clothing/` — Clothing card
- `community/` — Blogger badge, bookmark, post cards
- `consultant/` — Calendar, case card, consultant card
- `customization/` — Color picker, design canvas, toolbar
- `heartrecommend/` — Swipe card, action buttons
- `home/` — Home screen parts
- `onboarding/` — Onboarding steps
- `photo/` — Photo guide, quality indicator
- `privacy/` — Privacy consent modal
- `profile/` — Profile completeness bar
- `recommendations/` — Feed tabs, recommendation cards
- `search/` — Search screen parts
- `social/` — Follow button, social interactions
- `wardrobe/` — Drag sort list, import sheet

**Shared/generic components (should move to shared/ or design-system/):**
- `common/` — ErrorBoundary, ImageWithPlaceholder, OfflineBanner
- `emptyList/` — EmptyState
- `filter/` — FilterPanel
- `layout/` — ScreenLayout
- `loading/` — Skeletons, loading states
- `primitives/` — Button, Card, Dialog, Input, Toast
- `skeleton/` — Skeleton
- `ui/` — Avatar, Badge, BottomSheets, ChatBubble, etc.
- `ux/` — AccessibleTouchable, ErrorState, NetworkAware, etc.

**Loose components (root of components/):** 18 files
- AISizeBadge, CategoryNavigation, CouponSelector, EmptyCartView
- FilterTags, FreeShippingProgress, InlineSKUSelector, OrderTimeline
- OutfitRecommendationCards, PaymentWaitingScreen, PlaceholderScreen
- ProductImageCarousel, RefundRequestForm, SKUSelector, SortBar, SubcategoryTabs

## 2. Store Analysis

### 2.1 Current stores (25+ files)

| Store | File | Purpose | Persistence |
|-------|------|---------|-------------|
| useAuthStore | auth.store.ts | Auth + user + tokens | SecureStorage |
| useUserStore | user.store.ts | Profile + preferences + style profile | AsyncStorage |
| useQuizStore | quizStore.ts | Quiz questions + answers + results | None |
| useStyleQuizStore | styleQuizStore.ts | Style quiz progress + results | AsyncStorage |
| useClothingStore | clothingStore.ts | Clothing catalog + filters + pagination | AsyncStorage |
| useHomeStore | homeStore.ts | Weather + profile completion | AsyncStorage |
| useWardrobeStore | wardrobeStore.ts | Wardrobe items | AsyncStorage |
| useCartStore | cart.store.ts | Cart items + totals | AsyncStorage |
| useOrderStore | orderStore.ts | Orders list + details | None |
| useCouponStore | couponStore.ts | Coupons | None |
| useNotificationStore | notificationStore.ts | Notifications | None |
| useOnboardingStore | onboardingStore.ts | Onboarding state | AsyncStorage |
| usePhotoStore | photoStore.ts | Photo capture state | None |
| useProfileStore | profileStore.ts | Profile data | None |
| useAiStylistStore | aiStylistStore.ts | AI stylist sessions | None |
| useAiStylistChatStore | aiStylistChatStore.ts | Chat messages | None |
| useChatStore | chatStore.ts | Consultant chat | None |
| useBloggerStore | bloggerStore.ts | Blogger data | None |
| useConsultantStore | consultantStore.ts | Consultant data | None |
| useCustomizationEditorStore | customizationEditorStore.ts | Design editor state | None |
| useHeartRecommendStore | heart-recommend.store.ts | Heart recommend state | None |
| useRecommendationStore | recommendation.store.ts | Recommendations | None |
| useRecommendationFeedStore | recommendationFeedStore.ts | Feed state | None |
| useSizeRecommendationStore | sizeRecommendationStore.ts | Size recs | None |
| useAnalysisStore | analysis.store.ts | Body analysis | None |
| useAppStore | app.store.ts | App-level state | None |
| useUiStore | uiStore.ts | UI state | None |

### 2.2 Store Merge Analysis

**MOBL-02: auth.store + user.store → unified authStore**
- `auth.store.ts`: Auth state (user, tokens, isAuthenticated, login/logout/register/refresh)
- `user.store.ts`: Profile state (profile, preferences, styleProfile, stats, fetchProfile/updateProfile)
- **Merge strategy**: authStore already contains `user: User | null`. Merge user.store's profile/preferences/styleProfile into authStore. The user.store is essentially a profile cache layer on top of auth.
- **Risk**: auth.store uses SecureStorage for persistence; user.store uses AsyncStorage. Need to handle both storage adapters.
- **Circular dependency**: auth.store imports from `./index` for `clearAllStores()` during logout (dynamic import to avoid circular).

**MOBL-03: quizStore + styleQuizStore → unified quizStore**
- `quizStore.ts`: Generic quiz (questions, answers, submit, image-based answers)
- `styleQuizStore.ts`: Style-specific quiz (loadQuiz, selectAnswer with server-side progress save, batchSubmit)
- **Merge strategy**: These serve different quiz flows. quizStore is for the initial style quiz; styleQuizStore is for the ongoing style assessment. Merge into a single quizStore with mode distinction or keep as separate slices under one store.
- **Key difference**: styleQuizStore has server-side progress persistence via `styleQuizApi`; quizStore is client-only.

**MOBL-04: clothingStore + homeStore → unified clothingStore** ⚠️ DEVIATION
- `clothingStore.ts`: Clothing catalog, filters, pagination, search
- `homeStore.ts`: Weather data, profile completion banner
- **Merge analysis**: These are NOT closely related. homeStore is about the home page state (weather, profile completion), not clothing. Merging them would violate single responsibility.
- **Decision**: DEVIATE from MOBL-04. Keep both stores separate in their respective feature directories (wardrobe/home). This aligns with MOBL-01's feature-based architecture goal. The original requirement appears to be based on an incorrect assumption that these stores overlap.

### 2.3 stores/index.ts barrel file

Currently re-exports from all stores. This is the central import point. After migration, each feature should import its own stores directly.

## 3. Navigation Analysis

### 3.1 Navigation structure

```
RootStack
├── Auth (AuthNavigator)
│   ├── Login
│   ├── PhoneLogin
│   ├── Register
│   └── Onboarding
└── MainTabs (MainTabNavigator)
    ├── Home (HomeStackNavigator — SharedElement)
    │   ├── HomeFeed, Search, Notifications
    │   ├── RecommendationDetail, Product, OutfitDetail
    ├── Stylist (StylistStackNavigator)
    │   ├── AIStylist, OutfitPlan, ChatHistory
    │   ├── AiStylistChat, SessionCalendar
    ├── TryOn (TryOnStackNavigator)
    │   ├── VirtualTryOn, TryOnResult, TryOnHistory
    ├── Community (CommunityStackNavigator — SharedElement)
    │   ├── CommunityFeed, PostDetail, PostCreate
    │   ├── InfluencerProfile, InspirationWardrobe
    │   ├── BloggerDashboard, BloggerProfile, BloggerProduct
    └── Profile (ProfileStackNavigator)
        ├── ProfileMain, ProfileEdit, StyleQuiz
        ├── BodyAnalysis, ColorAnalysis, SharePoster
        ├── Wardrobe, Favorites, Settings
        ├── NotificationSettings, Subscription
        ├── Cart, Checkout, Payment
        ├── Orders, OrderDetail, AddClothing
        ├── CustomDesign, CustomEditor, Brand
        ├── AdvisorList, AdvisorProfile, Booking, Chat
        └── Legal
```

### 3.2 Key navigation files

| File | Role |
|------|------|
| `navigation/types.ts` | All route type definitions + guard config + deep links |
| `navigation/RootNavigator.tsx` | Root + Tab navigators + guard logic |
| `navigation/MainStackNavigator.tsx` | All 5 stack navigators with lazy loading |
| `navigation/AuthNavigator.tsx` | Auth stack |
| `navigation/navigationService.ts` | Navigation ref + helpers |
| `navigation/RouteGuards/` | AuthGuard, ProfileGuard, VipGuard |

### 3.3 Deep links (30+ routes)

Defined in `navigation/types.ts` as `DEEP_LINK_ROUTES`. All use pattern-based matching with `paramsMapping`.

### 3.4 Route guards (33 guarded routes)

Defined in `navigation/types.ts` as `GUARDED_ROUTES`. Three guard types: auth, profile, vip.

### 3.5 PITFALLS-07: Navigation migration risk

**Critical**: Keep all route names unchanged during migration. Only the file locations of screen components change, not the route identifiers. The lazy imports in `MainStackNavigator.tsx` need to be updated to point to new file locations.

## 4. Shared Packages Analysis

### 4.1 @xuno/types

- **Location**: `packages/types/`
- **Content**: Comprehensive type definitions (User, UserProfile, ClothingItem, VirtualTryOn, StyleRecommendation, CustomizationRequest, Brand, ApiResponse, etc.)
- **Current usage**: Mobile app defines its OWN types in `src/types/` that duplicate/overlap with @xuno/types
- **Build**: tsup (CJS + ESM + DTS)
- **Issue**: Not actually imported by mobile or backend — both define their own types locally

### 4.2 @xuno/shared

- **Location**: `packages/shared/`
- **Content**: Re-exports from `./types` (api, auth, enums, notification, photo, profile, quiz, user) + `./utils/validation`
- **Current usage**: Minimal — research indicates only 1 reference in mobile, 0 in backend
- **Build**: tsc

### 4.3 Mobile local types (`src/types/`)

- `ai.ts`, `animations.ts`, `api.ts`, `chat.ts`, `clothing.ts`, `components.ts`
- `consultant.ts`, `customization.ts`, `events.ts`, `navigation.ts`, `outfit.ts`
- `social.ts`, `user.ts`, `index.ts`

These overlap significantly with @xuno/types. The migration should:
1. Move shared types to @xuno/types
2. Keep mobile-specific types in `src/types/` (or feature-local types)
3. Update imports across the app

## 5. Target Feature-Based Structure

### 5.1 Proposed directory structure

```
src/
├── features/
│   ├── auth/
│   │   ├── screens/        (LoginScreen, PhoneLoginScreen, RegisterScreen)
│   │   ├── components/     (auth-specific components)
│   │   ├── stores/         (authStore — merged auth + user)
│   │   ├── services/       (auth.api, token, wechat)
│   │   ├── hooks/          (useAuth, useVerify)
│   │   └── types/          (auth-specific types)
│   ├── stylist/
│   │   ├── screens/        (AiStylistScreen, AiStylistChatScreen, OutfitPlanScreen, etc.)
│   │   ├── components/     (aistylist/*, aicompanion/*)
│   │   ├── stores/         (aiStylistStore, aiStylistChatStore)
│   │   └── services/       (ai-stylist.api, ai/*)
│   ├── tryon/
│   │   ├── screens/        (VirtualTryOnScreen, TryOnResultScreen, TryOnHistoryScreen)
│   │   ├── components/     (tryon components)
│   │   ├── stores/         (photoStore)
│   │   └── services/       (tryon.api, virtualTryOn)
│   ├── home/
│   │   ├── screens/        (HomeScreen)
│   │   ├── components/     (home/*, heartrecommend/*)
│   │   ├── stores/         (homeStore, heart-recommend.store, recommendationFeedStore)
│   │   └── services/       (recommendation-feed.api)
│   ├── wardrobe/
│   │   ├── screens/        (WardrobeScreen, AddClothingScreen, FavoritesScreen)
│   │   ├── components/     (wardrobe/*)
│   │   ├── stores/         (wardrobeStore, clothingStore)
│   │   └── services/       (clothing.api)
│   ├── community/
│   │   ├── screens/        (CommunityScreen, CreatePostScreen, PostDetailScreen, etc.)
│   │   ├── components/     (community/*, social/*)
│   │   ├── stores/         (bloggerStore)
│   │   └── services/       (community.api, blogger.api)
│   ├── commerce/
│   │   ├── screens/        (CartScreen, CheckoutScreen, PaymentScreen, OrdersScreen, etc.)
│   │   ├── components/     (CouponSelector, EmptyCartView, FreeShippingProgress, etc.)
│   │   ├── stores/         (cart.store, orderStore, couponStore)
│   │   └── services/       (commerce.api, subscription.api)
│   ├── profile/
│   │   ├── screens/        (ProfileScreen, ProfileEditScreen, BodyAnalysisScreen, etc.)
│   │   ├── components/     (profile/*, charts/*)
│   │   ├── stores/         (profileStore, analysis.store)
│   │   └── services/       (profile.api, style-profiles.api)
│   ├── style-quiz/
│   │   ├── screens/        (StyleQuizScreen, QuizResultScreen)
│   │   ├── components/     (style-quiz components)
│   │   ├── stores/         (quizStore — merged quiz + styleQuiz)
│   │   └── services/       (style-quiz.api, quizService)
│   ├── customization/
│   │   ├── screens/        (CustomizationScreen, CustomizationEditorScreen, etc.)
│   │   ├── components/     (customization/*)
│   │   ├── stores/         (customizationEditorStore)
│   │   └── services/       (customization.api)
│   ├── consultant/
│   │   ├── screens/        (AdvisorListScreen, AdvisorProfileScreen, BookingScreen, ChatScreen)
│   │   ├── components/     (consultant/*)
│   │   ├── stores/         (consultantStore, chatStore)
│   │   └── services/       (consultant.api, chat.api)
│   ├── onboarding/
│   │   ├── screens/        (OnboardingScreen, OnboardingWizard)
│   │   ├── components/     (onboarding/*)
│   │   ├── stores/         (onboardingStore)
│   │   └── services/       (onboardingService)
│   ├── search/
│   │   ├── screens/        (SearchScreen)
│   │   ├── components/     (search/*, filter/*)
│   │   └── stores/         (none specific)
│   └── notifications/
│       ├── screens/        (NotificationsScreen, NotificationSettingsScreen, StockNotificationScreen)
│       ├── stores/         (notificationStore)
│       └── services/       (notification.api)
├── shared/
│   ├── components/         (common/*, layout/*, loading/*, emptyList/*, ux/*)
│   ├── hooks/              (all shared hooks)
│   ├── utils/              (all shared utils)
│   ├── contexts/           (shared contexts)
│   ├── services/           (apiClient, websocket, analytics, sentry, etc.)
│   └── types/              (mobile-specific types not in @xuno/types)
├── design-system/
│   ├── primitives/         (Button, Card, Dialog, Input, Toast, EmptyState, LoadingStates)
│   ├── theme/              (tokens, colors, typography, spacing, animations)
│   ├── ui/                 (Avatar, Badge, BottomSheets, ChatBubble, etc.)
│   └── skeleton/           (Skeleton components)
├── navigation/             (unchanged — route definitions, guards, service)
├── polyfills/              (unchanged — handled separately per PITFALLS-04)
├── i18n/                   (unchanged)
├── config/                 (unchanged)
└── constants/              (unchanged)
```

### 5.2 Feature-to-domain mapping

| Feature | Backend Domain | Screens | Stores | Components |
|---------|---------------|---------|--------|------------|
| auth | identity | 4 | 1 (merged) | privacy |
| stylist | ai-core | 5 | 2 | aistylist, aicompanion |
| tryon | ai-core | 3 | 1 | photo |
| home | platform | 1+3 | 3 | home, heartrecommend |
| wardrobe | fashion | 3 | 2 | wardrobe, clothing |
| community | social | 7 | 1 | community, social |
| commerce | commerce | 6 | 3 | cart, order, coupon |
| profile | identity | 5 | 2 | profile, charts |
| style-quiz | fashion | 2 | 1 (merged) | style-quiz |
| customization | customization | 4 | 1 | customization |
| consultant | social | 4 | 2 | consultant |
| onboarding | identity | 1 | 1 | onboarding |
| search | fashion | 1 | 0 | search, filter |
| notifications | platform | 3 | 1 | — |

## 6. Risk Assessment

### 6.1 High-risk areas

1. **Navigation imports**: `MainStackNavigator.tsx` uses lazy imports pointing to current file locations. Every screen move requires updating these imports.
2. **Store barrel file**: `stores/index.ts` is imported by 50+ files. Changing the barrel structure risks breaking many imports.
3. **Circular dependencies**: auth.store has a dynamic import from `./index` for `clearAllStores()`.
4. **SharedElement navigation**: Home and Community stacks use `react-navigation-shared-element` which requires specific screen registration.
5. **Polyfills**: 13 polyfill files are imported throughout the app (PITFALLS-04).

### 6.2 Medium-risk areas

1. **Store merging**: auth.store + user.store merge needs careful handling of persistence layers (SecureStorage vs AsyncStorage).
2. **Type migration**: Moving types to @xuno/types requires updating imports across the entire app.
3. **Context providers**: 5 React contexts need to remain accessible after restructuring.

### 6.3 Low-risk areas

1. **Component migration**: Most components are self-contained and can be moved by updating import paths.
2. **Service migration**: API service files are stateless and can be moved freely.
3. **Hook migration**: Hooks are mostly independent and can be moved to shared/ or feature-specific directories.

## 7. Validation Architecture

### 7.1 Critical verification points

1. **Metro bundler starts**: `npx react-native start --port 8081` succeeds
2. **TypeScript compilation**: `tsc --noEmit` passes
3. **All screens render**: Each tab's initial screen renders without errors
4. **Navigation works**: All stack navigation, tab switching, deep links
5. **Store persistence**: Auth tokens survive app restart
6. **Route guards**: Protected routes redirect correctly

### 7.2 Regression testing approach

1. **Import verification**: `grep -r "from.*stores/index"` should return 0 after migration (features import their own stores)
2. **Route name preservation**: `navigation/types.ts` should have zero changes to route names
3. **Build verification**: Metro bundler + TypeScript compilation must pass after each migration step

---

## RESEARCH COMPLETE

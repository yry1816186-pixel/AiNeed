import type { NavigatorScreenParams, CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

// ============================================================
// Auth Stack (Phase 1 - 用户画像 & 风格测试)
// ============================================================
export type AuthStackParamList = {
  Login: undefined;
  PhoneLogin: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { phone: string; codeToken: string };
  Legal: { type: "terms" | "privacy" };
  Onboarding: undefined;
  ProfileSetup: undefined;
};

// ============================================================
// Today Tab Stack (replaces Home)
// ============================================================
export type TodayStackParamList = {
  TodayMain: undefined;
  Search: undefined;
  Notifications: undefined;
  RecommendationDetail: { recommendationId: string };
  Product: { clothingId: string };
  ClothingDetail: { clothingId: string };
  OutfitDetail: { outfitId: string };
  Recommendations: undefined;
  RecommendationFeed: undefined;
};

// ============================================================
// Discover Tab Stack (replaces Community + TryOn)
// ============================================================
export type DiscoverStackParamList = {
  DiscoverMain: undefined;
  CommunityFeed: undefined;
  PostDetail: { postId: string };
  PostCreate: undefined;
  InfluencerProfile: { influencerId: string };
  InspirationWardrobe: { userId?: string };
  BloggerDashboard: undefined;
  BloggerProfile: { bloggerId?: string };
  BloggerProduct: { productId?: string };
  VirtualTryOn: { clothingId?: string };
  TryOnResult: { resultId: string };
  TryOnHistory: undefined;
  Wardrobe: undefined;
  Favorites: undefined;
};

// ============================================================
// Stylist Tab Stack (Phase 2 - AI 造型师)
// ============================================================
export type StylistStackParamList = {
  AIStylist: undefined;
  OutfitPlan: { planId?: string };
  ChatHistory: undefined;
  AiStylistChat: { sessionId?: string };
  SessionCalendar: undefined;
};

// ============================================================
// TryOn Tab Stack (Phase 3 - 虚拟试衣)
// ============================================================
export type TryOnStackParamList = {
  VirtualTryOn: { clothingId?: string };
  TryOnResult: { resultId: string };
  TryOnHistory: undefined;
};

// ============================================================
// Community Tab Stack (Phase 6 - 社区 & 博主生态)
// ============================================================
export type CommunityStackParamList = {
  CommunityFeed: undefined;
  PostDetail: { postId: string };
  PostCreate: undefined;
  InfluencerProfile: { influencerId: string };
  InspirationWardrobe: { userId?: string };
  BloggerDashboard: undefined;
  BloggerProfile: { bloggerId?: string };
  BloggerProduct: { productId?: string };
};

// ============================================================
// Profile Tab Stack (Phase 1/5/7/8 - 综合)
// ============================================================
export type ProfileStackParamList = {
  ProfileMain: undefined;
  ProfileEdit: undefined;
  StyleQuiz: undefined;
  BodyAnalysis: undefined;
  ColorAnalysis: undefined;
  SharePoster: { type?: string; id?: string };
  // Wardrobe and Favorites REMOVED -- moved to DiscoverStack
  Settings: undefined;
  NotificationSettings: undefined;
  Subscription: undefined;
  Cart: undefined;
  Checkout: undefined;
  Payment: { orderId: string };
  Orders: undefined;
  OrderDetail: { orderId: string };
  AddClothing: { editId?: string };
  CustomDesign: undefined;
  Customization: undefined;
  CustomEditor: { designId?: string };
  CustomizationEditor: { templateId?: string };
  CustomizationPreview: { designId: string };
  CustomizationOrderDetail: { requestId: string };
  Brand: { brandId: string };
  AdvisorList: undefined;
  AdvisorProfile: { advisorId: string };
  Booking: { advisorId: string };
  Chat: { advisorId: string; sessionId?: string };
  Legal: { type: "terms" | "privacy" };
};

// ============================================================
// Main Tab Navigator (4 Tabs)
// ============================================================
export type MainTabParamList = {
  Today: NavigatorScreenParams<TodayStackParamList>;
  Discover: NavigatorScreenParams<DiscoverStackParamList>;
  Stylist: NavigatorScreenParams<StylistStackParamList>;
  Me: NavigatorScreenParams<ProfileStackParamList>;
};

// ============================================================
// Root Stack
// ============================================================
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  Product: { clothingId: string };
  OrderDetail: { orderId: string };
  BloggerProfile: { bloggerId?: string };
  BloggerProduct: { productId?: string };
  ClothingDetail: { clothingId: string };
  AddClothing: { editId?: string };
  VirtualTryOn: { clothingId?: string };
  Legal: { type: "terms" | "privacy" };
  ResetPassword: { phone: string; codeToken: string };
  Onboarding: undefined;
  Login: undefined;
};

// ============================================================
// Per-Stack ScreenProps
// ============================================================
export type AuthStackScreenProps<T extends keyof AuthStackParamList = keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type TodayStackScreenProps<T extends keyof TodayStackParamList = keyof TodayStackParamList> =
  NativeStackScreenProps<TodayStackParamList, T>;

export type DiscoverStackScreenProps<
  T extends keyof DiscoverStackParamList = keyof DiscoverStackParamList
> = NativeStackScreenProps<DiscoverStackParamList, T>;

export type StylistStackScreenProps<
  T extends keyof StylistStackParamList = keyof StylistStackParamList
> = NativeStackScreenProps<StylistStackParamList, T>;

export type TryOnStackScreenProps<T extends keyof TryOnStackParamList = keyof TryOnStackParamList> =
  NativeStackScreenProps<TryOnStackParamList, T>;

export type CommunityStackScreenProps<
  T extends keyof CommunityStackParamList = keyof CommunityStackParamList
> = NativeStackScreenProps<CommunityStackParamList, T>;

export type ProfileStackScreenProps<
  T extends keyof ProfileStackParamList = keyof ProfileStackParamList
> = NativeStackScreenProps<ProfileStackParamList, T>;

export type RootStackScreenProps<T extends keyof RootStackParamList = keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList = keyof MainTabParamList> =
  NativeStackScreenProps<MainTabParamList, T>;

export { CompositeScreenProps };

// ============================================================
// Tab Route Labels
// ============================================================
export const TAB_LABELS: Record<keyof MainTabParamList, string> = {
  Today: "今天",
  Discover: "发现",
  Stylist: "造型师",
  Me: "我的",
};

// ============================================================
// Route Phase Mapping
// ============================================================
export const ROUTE_PHASE_MAP: Record<string, number> = {
  Login: 1,
  PhoneLogin: 1,
  Register: 1,
  Onboarding: 1,
  ProfileMain: 1,
  ProfileEdit: 1,
  StyleQuiz: 1,
  BodyAnalysis: 1,
  ColorAnalysis: 1,
  SharePoster: 1,
  Wardrobe: 1,
  Favorites: 1,
  Settings: 1,
  NotificationSettings: 1,
  Subscription: 1,
  Legal: 1,
  AIStylist: 2,
  OutfitPlan: 2,
  ChatHistory: 2,
  AiStylistChat: 2,
  SessionCalendar: 2,
  VirtualTryOn: 3,
  TryOnResult: 3,
  TryOnHistory: 3,
  HomeFeed: 4,
  Search: 4,
  Notifications: 4,
  RecommendationDetail: 4,
  Product: 5,
  Cart: 5,
  Checkout: 5,
  Payment: 5,
  Orders: 5,
  OrderDetail: 5,
  AddClothing: 5,
  CommunityFeed: 6,
  PostDetail: 6,
  PostCreate: 6,
  InfluencerProfile: 6,
  InspirationWardrobe: 6,
  BloggerDashboard: 6,
  BloggerProfile: 6,
  BloggerProduct: 6,
  CustomDesign: 7,
  CustomEditor: 7,
  Brand: 7,
  AdvisorList: 8,
  AdvisorProfile: 8,
  Booking: 8,
  Chat: 8,
};

// ============================================================
// Guard Configuration
// ============================================================
export type GuardType = "auth" | "profile" | "vip";

export interface RouteGuardConfig {
  route: string;
  guards: GuardType[];
}

export const GUARDED_ROUTES: RouteGuardConfig[] = [
  { route: "AIStylist", guards: ["auth", "profile"] },
  { route: "AiStylistChat", guards: ["auth", "profile"] },
  { route: "OutfitPlan", guards: ["auth", "profile"] },
  { route: "ChatHistory", guards: ["auth"] },
  { route: "SessionCalendar", guards: ["auth"] },
  { route: "VirtualTryOn", guards: ["auth", "profile"] },
  { route: "TryOnResult", guards: ["auth"] },
  { route: "TryOnHistory", guards: ["auth"] },
  { route: "Notifications", guards: ["auth"] },
  { route: "Cart", guards: ["auth"] },
  { route: "Checkout", guards: ["auth"] },
  { route: "Payment", guards: ["auth"] },
  { route: "Orders", guards: ["auth"] },
  { route: "OrderDetail", guards: ["auth"] },
  { route: "PostCreate", guards: ["auth"] },
  { route: "InfluencerProfile", guards: ["auth"] },
  { route: "InspirationWardrobe", guards: ["auth"] },
  { route: "BloggerDashboard", guards: ["auth"] },
  { route: "CustomDesign", guards: ["auth", "vip"] },
  { route: "CustomEditor", guards: ["auth", "vip"] },
  { route: "BodyAnalysis", guards: ["auth", "vip"] },
  { route: "ColorAnalysis", guards: ["auth", "vip"] },
  { route: "Brand", guards: ["auth"] },
  { route: "AdvisorList", guards: ["auth"] },
  { route: "AdvisorProfile", guards: ["auth"] },
  { route: "Booking", guards: ["auth", "vip"] },
  { route: "Chat", guards: ["auth", "vip"] },
  { route: "Wardrobe", guards: ["auth"] },
  { route: "Favorites", guards: ["auth"] },
  { route: "ProfileEdit", guards: ["auth"] },
  { route: "SharePoster", guards: ["auth"] },
  { route: "Subscription", guards: ["auth"] },
  { route: "AddClothing", guards: ["auth"] },
  { route: "StyleQuiz", guards: ["auth"] },
  { route: "Settings", guards: ["auth"] },
  { route: "NotificationSettings", guards: ["auth"] },
];

// ============================================================
// Deep Link Configuration
// ============================================================
export interface DeepLinkRouteConfig {
  pattern: string;
  tab?: keyof MainTabParamList;
  stack?: string;
  paramsMapping: (params: Record<string, string>) => Record<string, unknown> | undefined;
  requiresAuth: boolean;
}

export const DEEP_LINK_ROUTES: DeepLinkRouteConfig[] = [
  {
    pattern: "home",
    tab: "Today",
    stack: "TodayMain",
    paramsMapping: () => undefined,
    requiresAuth: false,
  },
  {
    pattern: "search",
    tab: "Today",
    stack: "Search",
    paramsMapping: () => undefined,
    requiresAuth: false,
  },
  {
    pattern: "clothing/:id",
    tab: "Today",
    stack: "Product",
    paramsMapping: (p) => ({ clothingId: p.id }),
    requiresAuth: false,
  },
  {
    pattern: "outfit/:id",
    tab: "Today",
    stack: "OutfitDetail",
    paramsMapping: (p) => ({ outfitId: p.id }),
    requiresAuth: false,
  },
  {
    pattern: "recommendation/:id",
    tab: "Today",
    stack: "RecommendationDetail",
    paramsMapping: (p) => ({ recommendationId: p.id }),
    requiresAuth: true,
  },
  {
    pattern: "stylist",
    tab: "Stylist",
    stack: "AIStylist",
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: "stylist/plan/:id",
    tab: "Stylist",
    stack: "OutfitPlan",
    paramsMapping: (p) => ({ planId: p.id }),
    requiresAuth: true,
  },
  {
    pattern: "stylist/history",
    tab: "Stylist",
    stack: "ChatHistory",
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: "tryon",
    tab: "Discover",
    stack: "VirtualTryOn",
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: "tryon/result/:id",
    tab: "Discover",
    stack: "TryOnResult",
    paramsMapping: (p) => ({ resultId: p.id }),
    requiresAuth: true,
  },
  {
    pattern: "tryon/history",
    tab: "Discover",
    stack: "TryOnHistory",
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: "community",
    tab: "Discover",
    stack: "CommunityFeed",
    paramsMapping: () => undefined,
    requiresAuth: false,
  },
  {
    pattern: "community/post/:id",
    tab: "Discover",
    stack: "PostDetail",
    paramsMapping: (p) => ({ postId: p.id }),
    requiresAuth: false,
  },
  {
    pattern: "community/create",
    tab: "Discover",
    stack: "PostCreate",
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: "influencer/:id",
    tab: "Discover",
    stack: "InfluencerProfile",
    paramsMapping: (p) => ({ influencerId: p.id }),
    requiresAuth: true,
  },
  {
    pattern: "profile",
    tab: "Me",
    stack: "ProfileMain",
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: "profile/edit",
    tab: "Me",
    stack: "ProfileEdit",
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: "wardrobe",
    tab: "Discover",
    stack: "Wardrobe",
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: "favorites",
    tab: "Discover",
    stack: "Favorites",
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: "cart",
    tab: "Me",
    stack: "Cart",
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: "checkout",
    tab: "Me",
    stack: "Checkout",
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: "orders",
    tab: "Me",
    stack: "Orders",
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: "orders/:id",
    tab: "Me",
    stack: "OrderDetail",
    paramsMapping: (p) => ({ orderId: p.id }),
    requiresAuth: true,
  },
  {
    pattern: "advisors",
    tab: "Me",
    stack: "AdvisorList",
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: "advisor/:id",
    tab: "Me",
    stack: "AdvisorProfile",
    paramsMapping: (p) => ({ advisorId: p.id }),
    requiresAuth: true,
  },
  {
    pattern: "advisor/:id/book",
    tab: "Me",
    stack: "Booking",
    paramsMapping: (p) => ({ advisorId: p.id }),
    requiresAuth: true,
  },
  {
    pattern: "advisor/:id/chat",
    tab: "Me",
    stack: "Chat",
    paramsMapping: (p) => ({ advisorId: p.id }),
    requiresAuth: true,
  },
  {
    pattern: "login",
    stack: "Login",
    paramsMapping: () => undefined,
    requiresAuth: false,
  },
  {
    pattern: "register",
    stack: "Register",
    paramsMapping: () => undefined,
    requiresAuth: false,
  },
  {
    pattern: "onboarding",
    stack: "Onboarding",
    paramsMapping: () => undefined,
    requiresAuth: false,
  },
];

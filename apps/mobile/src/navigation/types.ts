import type { NavigatorScreenParams } from '@react-navigation/native';

// ============================================================
// Auth Stack (Phase 1 - 用户画像 & 风格测试)
// ============================================================
export type AuthStackParamList = {
  Login: undefined;
  PhoneLogin: undefined;
  Register: undefined;
  Onboarding: undefined;
};

// ============================================================
// Home Tab Stack (Phase 4 - 推荐引擎)
// ============================================================
export type HomeStackParamList = {
  HomeFeed: undefined;
  Search: undefined;
  Notifications: undefined;
  RecommendationDetail: { recommendationId: string };
  Product: { clothingId: string };
  OutfitDetail: { outfitId: string };
};

// ============================================================
// Stylist Tab Stack (Phase 2 - AI 造型师)
// ============================================================
export type StylistStackParamList = {
  AIStylist: undefined;
  OutfitPlan: { planId?: string };
  ChatHistory: undefined;
  AiStylistChat: { sessionId?: string };
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
  Wardrobe: undefined;
  Favorites: undefined;
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
  CustomEditor: { designId?: string };
  Brand: { brandId: string };
  AdvisorList: undefined;
  AdvisorProfile: { advisorId: string };
  Booking: { advisorId: string };
  Chat: { advisorId: string; sessionId?: string };
  Legal: { type: 'terms' | 'privacy' };
};

// ============================================================
// Main Tab Navigator (5 Tabs)
// ============================================================
export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Stylist: NavigatorScreenParams<StylistStackParamList>;
  TryOn: NavigatorScreenParams<TryOnStackParamList>;
  Community: NavigatorScreenParams<CommunityStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

// ============================================================
// Root Stack
// ============================================================
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};

// ============================================================
// Tab Route Labels
// ============================================================
export const TAB_LABELS: Record<keyof MainTabParamList, string> = {
  Home: '首页',
  Stylist: '造型师',
  TryOn: '试衣',
  Community: '社区',
  Profile: '我的',
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
export type GuardType = 'auth' | 'profile' | 'vip';

export interface RouteGuardConfig {
  route: string;
  guards: GuardType[];
}

export const GUARDED_ROUTES: RouteGuardConfig[] = [
  { route: 'AIStylist', guards: ['auth', 'profile'] },
  { route: 'OutfitPlan', guards: ['auth', 'profile'] },
  { route: 'ChatHistory', guards: ['auth'] },
  { route: 'VirtualTryOn', guards: ['auth', 'profile'] },
  { route: 'TryOnResult', guards: ['auth'] },
  { route: 'TryOnHistory', guards: ['auth'] },
  { route: 'Cart', guards: ['auth'] },
  { route: 'Checkout', guards: ['auth'] },
  { route: 'Payment', guards: ['auth'] },
  { route: 'Orders', guards: ['auth'] },
  { route: 'OrderDetail', guards: ['auth'] },
  { route: 'PostCreate', guards: ['auth'] },
  { route: 'InfluencerProfile', guards: ['auth'] },
  { route: 'CustomDesign', guards: ['auth', 'vip'] },
  { route: 'CustomEditor', guards: ['auth', 'vip'] },
  { route: 'Brand', guards: ['auth'] },
  { route: 'AdvisorList', guards: ['auth'] },
  { route: 'AdvisorProfile', guards: ['auth'] },
  { route: 'Booking', guards: ['auth', 'vip'] },
  { route: 'Chat', guards: ['auth', 'vip'] },
  { route: 'Wardrobe', guards: ['auth'] },
  { route: 'Favorites', guards: ['auth'] },
  { route: 'ProfileEdit', guards: ['auth'] },
  { route: 'SharePoster', guards: ['auth'] },
  { route: 'Subscription', guards: ['auth'] },
  { route: 'AddClothing', guards: ['auth'] },
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
    pattern: 'home',
    tab: 'Home',
    stack: 'HomeFeed',
    paramsMapping: () => undefined,
    requiresAuth: false,
  },
  {
    pattern: 'search',
    tab: 'Home',
    stack: 'Search',
    paramsMapping: () => undefined,
    requiresAuth: false,
  },
  {
    pattern: 'clothing/:id',
    tab: 'Home',
    stack: 'Product',
    paramsMapping: (p) => ({ clothingId: p.id }),
    requiresAuth: false,
  },
  {
    pattern: 'outfit/:id',
    tab: 'Home',
    stack: 'OutfitDetail',
    paramsMapping: (p) => ({ outfitId: p.id }),
    requiresAuth: false,
  },
  {
    pattern: 'recommendation/:id',
    tab: 'Home',
    stack: 'RecommendationDetail',
    paramsMapping: (p) => ({ recommendationId: p.id }),
    requiresAuth: true,
  },
  {
    pattern: 'stylist',
    tab: 'Stylist',
    stack: 'AIStylist',
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: 'stylist/plan/:id',
    tab: 'Stylist',
    stack: 'OutfitPlan',
    paramsMapping: (p) => ({ planId: p.id }),
    requiresAuth: true,
  },
  {
    pattern: 'stylist/history',
    tab: 'Stylist',
    stack: 'ChatHistory',
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: 'tryon',
    tab: 'TryOn',
    stack: 'VirtualTryOn',
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: 'tryon/result/:id',
    tab: 'TryOn',
    stack: 'TryOnResult',
    paramsMapping: (p) => ({ resultId: p.id }),
    requiresAuth: true,
  },
  {
    pattern: 'tryon/history',
    tab: 'TryOn',
    stack: 'TryOnHistory',
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: 'community',
    tab: 'Community',
    stack: 'CommunityFeed',
    paramsMapping: () => undefined,
    requiresAuth: false,
  },
  {
    pattern: 'community/post/:id',
    tab: 'Community',
    stack: 'PostDetail',
    paramsMapping: (p) => ({ postId: p.id }),
    requiresAuth: false,
  },
  {
    pattern: 'community/create',
    tab: 'Community',
    stack: 'PostCreate',
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: 'influencer/:id',
    tab: 'Community',
    stack: 'InfluencerProfile',
    paramsMapping: (p) => ({ influencerId: p.id }),
    requiresAuth: true,
  },
  {
    pattern: 'profile',
    tab: 'Profile',
    stack: 'ProfileMain',
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: 'profile/edit',
    tab: 'Profile',
    stack: 'ProfileEdit',
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: 'wardrobe',
    tab: 'Profile',
    stack: 'Wardrobe',
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: 'favorites',
    tab: 'Profile',
    stack: 'Favorites',
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: 'cart',
    tab: 'Profile',
    stack: 'Cart',
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: 'checkout',
    tab: 'Profile',
    stack: 'Checkout',
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: 'orders',
    tab: 'Profile',
    stack: 'Orders',
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: 'orders/:id',
    tab: 'Profile',
    stack: 'OrderDetail',
    paramsMapping: (p) => ({ orderId: p.id }),
    requiresAuth: true,
  },
  {
    pattern: 'advisors',
    tab: 'Profile',
    stack: 'AdvisorList',
    paramsMapping: () => undefined,
    requiresAuth: true,
  },
  {
    pattern: 'advisor/:id',
    tab: 'Profile',
    stack: 'AdvisorProfile',
    paramsMapping: (p) => ({ advisorId: p.id }),
    requiresAuth: true,
  },
  {
    pattern: 'advisor/:id/book',
    tab: 'Profile',
    stack: 'Booking',
    paramsMapping: (p) => ({ advisorId: p.id }),
    requiresAuth: true,
  },
  {
    pattern: 'advisor/:id/chat',
    tab: 'Profile',
    stack: 'Chat',
    paramsMapping: (p) => ({ advisorId: p.id }),
    requiresAuth: true,
  },
  {
    pattern: 'login',
    stack: 'Login',
    paramsMapping: () => undefined,
    requiresAuth: false,
  },
  {
    pattern: 'register',
    stack: 'Register',
    paramsMapping: () => undefined,
    requiresAuth: false,
  },
  {
    pattern: 'onboarding',
    stack: 'Onboarding',
    paramsMapping: () => undefined,
    requiresAuth: false,
  },
];

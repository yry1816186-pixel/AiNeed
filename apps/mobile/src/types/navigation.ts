import type { NavigatorScreenParams } from "@react-navigation/native";
import type {
  AuthStackParamList,
  HomeStackParamList,
  StylistStackParamList,
  TryOnStackParamList,
  CommunityStackParamList,
  ProfileStackParamList,
  MainTabParamList as NewMainTabParamList,
  RootStackParamList as NewRootStackParamList,
} from "../navigation/types";

export type {
  AuthStackParamList,
  HomeStackParamList,
  StylistStackParamList,
  TryOnStackParamList,
  CommunityStackParamList,
  ProfileStackParamList,
  NewMainTabParamList,
  NewRootStackParamList,
};

export type MainTabParamList = NewMainTabParamList;

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  MainTabs: NavigatorScreenParams<NewMainTabParamList>;
  Login: undefined;
  PhoneLogin: undefined;
  Register: undefined;
  Onboarding: undefined;
  HomeFeed: undefined;
  Search: undefined;
  Notifications: undefined;
  RecommendationDetail: { recommendationId: string };
  Product: { clothingId: string };
  ClothingDetail: { clothingId: string };
  OutfitDetail: { outfitId: string };
  AIStylist: undefined;
  AiStylist: undefined;
  OutfitPlan: { planId?: string };
  ChatHistory: undefined;
  AiStylistChat: { sessionId?: string };
  SessionCalendar: undefined;
  VirtualTryOn: { clothingId?: string };
  TryOnResult: { resultId: string };
  TryOnHistory: undefined;
  CommunityFeed: undefined;
  Community: undefined;
  PostDetail: { postId: string };
  PostCreate: undefined;
  InfluencerProfile: { influencerId: string };
  InspirationWardrobe: { userId?: string };
  BloggerDashboard: undefined;
  BloggerProfile: { bloggerId?: string };
  BloggerProduct: { productId?: string };
  ProfileMain: undefined;
  Profile: undefined;
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
  Customization: undefined;
  CustomEditor: { designId?: string };
  CustomizationEditor: { templateId?: string };
  CustomizationPreview: { designId: string };
  CustomizationOrderDetail: { requestId: string };
  Brand: { brandId: string };
  BrandQRScan: undefined;
  AdvisorList: undefined;
  AdvisorProfile: { advisorId: string };
  Booking: { advisorId: string };
  Chat: { advisorId: string; sessionId?: string };
  Legal: { type: "terms" | "privacy" };
  Explore: undefined;
  Heart: undefined;
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
};

export type BottomTabParamList = NewMainTabParamList;

export type NavigationRoute<RouteName extends keyof RootStackParamList> = {
  key: string;
  name: RouteName;
  params?: RootStackParamList[RouteName];
};

export type NavigationRoutes = NavigationRoute<keyof RootStackParamList>[];

export interface ResetState {
  index: number;
  routes: NavigationRoutes;
}

export interface NavigationOptions {
  title?: string;
  headerShown?: boolean;
  headerTitle?: string;
  headerBackTitle?: string;
  headerStyle?: object;
  headerTitleStyle?: object;
  cardStyle?: object;
  presentation?: "card" | "modal" | "transparentModal" | "fullScreenModal";
  animation?: "default" | "fade" | "slide" | "none";
}

export interface TabNavigationOptions extends NavigationOptions {
  tabBarLabel?: string;
  tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
  tabBarBadge?: number | string;
  tabBarAccessibilityLabel?: string;
  tabBarTestID?: string;
}

export type NavigationAction =
  | { type: "NAVIGATE"; payload: { name: string; params?: object } }
  | { type: "GO_BACK" }
  | { type: "RESET"; payload: ResetState }
  | { type: "REPLACE"; payload: { name: string; params?: object } }
  | { type: "PUSH"; payload: { name: string; params?: object } }
  | { type: "POP"; payload: { count: number } };

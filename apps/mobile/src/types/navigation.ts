/**
 * 导航相关类型定义
 */

import { NavigationState, PartialState, Route } from '@react-navigation/native';

// 导航参数类型
export type RootStackParamList = {
  Home: undefined;
  Explore: undefined;
  Heart: undefined;
  Cart: undefined;
  Wardrobe: undefined;
  Profile: undefined;
  Login: undefined;
  Register: undefined;
  AiStylist: undefined;
  AiStylistChat: { sessionId?: string };
  Recommendations: undefined;
  RecommendationDetail: { recommendationId: string };
  ClothingDetail: { clothingId: string };
  AddClothing: { editId?: string };
  VirtualTryOn: { clothingId?: string };
  OutfitDetail: { outfitId: string };
  Search: undefined;
  Settings: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  Orders: undefined;
  OrderDetail: { orderId: string };
  Checkout: undefined;
  Favorites: undefined;
  Subscription: undefined;
  Customization: undefined;
  Community: undefined;
  Legal: { type: 'terms' | 'privacy' };
  Onboarding: undefined;
  MainTabs: {
    screen: keyof MainTabParamList;
    params?: MainTabParamList[keyof MainTabParamList];
  };
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
};

// 底部 Tab 导航
export type BottomTabParamList = {
  Home: undefined;
  Explore: undefined;
  Heart: undefined;
  Cart: undefined;
  Wardrobe: undefined;
  Profile: undefined;
};

// MainTab ParamList (alias for BottomTabParamList)
export type MainTabParamList = BottomTabParamList;

// 导航路由
export type NavigationRoute<RouteName extends keyof RootStackParamList> = Route<RouteName, RootStackParamList[RouteName]>;

// 导航状态
export type NavigationRoutes = Array<NavigationRoute<keyof RootStackParamList>>;

// 重置导航状态
export interface ResetState {
  index: number;
  routes: NavigationRoutes;
}

// 导航选项
export interface NavigationOptions {
  title?: string;
  headerShown?: boolean;
  headerTitle?: string;
  headerBackTitle?: string;
  headerStyle?: object;
  headerTitleStyle?: object;
  cardStyle?: object;
  presentation?: 'card' | 'modal' | 'transparentModal' | 'fullScreenModal';
  animation?: 'default' | 'fade' | 'slide' | 'none';
}

// Tab 导航选项
export interface TabNavigationOptions extends NavigationOptions {
  tabBarLabel?: string;
  tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
  tabBarBadge?: number | string;
  tabBarAccessibilityLabel?: string;
  tabBarTestID?: string;
}

// 导航动作
export type NavigationAction =
  | { type: 'NAVIGATE'; payload: { name: string; params?: object } }
  | { type: 'GO_BACK' }
  | { type: 'RESET'; payload: ResetState }
  | { type: 'REPLACE'; payload: { name: string; params?: object } }
  | { type: 'PUSH'; payload: { name: string; params?: object } }
  | { type: 'POP'; payload: { count: number } };

import { NavigationState, PartialState, Route } from '@react-navigation/native';

export type {
  AuthStackParamList,
  HomeStackParamList,
  StylistStackParamList,
  TryOnStackParamList,
  CommunityStackParamList,
  ProfileStackParamList,
  MainTabParamList as NewMainTabParamList,
  RootStackParamList as NewRootStackParamList,
} from '../navigation/types';

export type RootStackParamList = {
  Home: undefined;
  Explore: undefined;
  Heart: undefined;
  Cart: undefined;
  Wardrobe: undefined;
  Profile: undefined;
  Login: undefined;
  PhoneLogin: undefined;
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
  StyleQuiz: undefined;
  QuizResult: undefined;
  MainTabs: {
    screen: keyof MainTabParamList;
    params?: MainTabParamList[keyof MainTabParamList];
  };
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  Explore: undefined;
  Heart: undefined;
  Cart: undefined;
  Wardrobe: undefined;
  Profile: undefined;
};

export type MainTabParamList = BottomTabParamList;

export type NavigationRoute<RouteName extends keyof RootStackParamList> = Route<RouteName, RootStackParamList[RouteName]>;

export type NavigationRoutes = Array<NavigationRoute<keyof RootStackParamList>>;

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
  presentation?: 'card' | 'modal' | 'transparentModal' | 'fullScreenModal';
  animation?: 'default' | 'fade' | 'slide' | 'none';
}

export interface TabNavigationOptions extends NavigationOptions {
  tabBarLabel?: string;
  tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
  tabBarBadge?: number | string;
  tabBarAccessibilityLabel?: string;
  tabBarTestID?: string;
}

export type NavigationAction =
  | { type: 'NAVIGATE'; payload: { name: string; params?: object } }
  | { type: 'GO_BACK' }
  | { type: 'RESET'; payload: ResetState }
  | { type: 'REPLACE'; payload: { name: string; params?: object } }
  | { type: 'PUSH'; payload: { name: string; params?: object } }
  | { type: 'POP'; payload: { count: number } };

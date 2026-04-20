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
  AuthStackScreenProps,
  HomeStackScreenProps,
  StylistStackScreenProps,
  TryOnStackScreenProps,
  CommunityStackScreenProps,
  ProfileStackScreenProps,
  RootStackScreenProps,
  MainTabScreenProps,
  CompositeScreenProps,
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
  AuthStackScreenProps,
  HomeStackScreenProps,
  StylistStackScreenProps,
  TryOnStackScreenProps,
  CommunityStackScreenProps,
  ProfileStackScreenProps,
  RootStackScreenProps,
  MainTabScreenProps,
  CompositeScreenProps,
};

export type MainTabParamList = NewMainTabParamList;

export type RootStackParamList = NewRootStackParamList;

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

export { RootNavigator, MainTabNavigator } from './RootNavigator';
export { AuthNavigator } from './AuthNavigator';
export {
  HomeStackNavigator,
  StylistStackNavigator,
  TryOnStackNavigator,
  CommunityStackNavigator,
  ProfileStackNavigator,
} from './MainStackNavigator';

export {
  navigationRef,
  setNavigationReady,
  isNavigationReady,
  getCurrentRouteName,
  getCurrentRouteParams,
  navigate,
  navigateAuth,
  navigateTab,
  navigateHome,
  navigateStylist,
  navigateTryOn,
  navigateCommunity,
  navigateProfile,
  goBack,
  reset,
  resetToAuth,
  resetToMain,
  parseDeepLink,
  navigateDeepLink,
  navigateFromPush,
} from './navigationService';
export type { ParsedDeepLink, PushNotificationData } from './navigationService';

export { AuthGuard, ProfileGuard, VipGuard } from './RouteGuards';
export { useRouteGuard, GuardedScreen } from './RouteGuards';

export type {
  AuthStackParamList,
  HomeStackParamList,
  StylistStackParamList,
  TryOnStackParamList,
  CommunityStackParamList,
  ProfileStackParamList,
  MainTabParamList,
  RootStackParamList,
  GuardType,
  RouteGuardConfig,
  TAB_LABELS,
  ROUTE_PHASE_MAP,
  GUARDED_ROUTES,
  DEEP_LINK_ROUTES,
} from './types';

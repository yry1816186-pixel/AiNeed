export { navigationRef, setNavigationRef, navigate, goBack, getCurrentRouteName } from './navigation';

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
  navigationRef as navigationServiceRef,
  setNavigationReady,
  isNavigationReady,
  getCurrentRouteName as getCurrentRouteNameFromService,
  getCurrentRouteParams,
  navigateAuth,
  navigateTab,
  navigateHome,
  navigateStylist,
  navigateTryOn,
  navigateCommunity,
  navigateProfile,
  resetToAuth,
  resetToMain,
  parseDeepLink,
  navigateDeepLink,
  navigateFromPush,
  reset,
  goBack as goBackFromService,
} from './navigationService';
export type { ParsedDeepLink, PushNotificationData } from './navigationService';

export { AuthGuard, ProfileGuard, VipGuard } from './RouteGuards';

export type {
  AuthStackParamList,
  HomeStackParamList,
  StylistStackParamList,
  TryOnStackParamList,
  CommunityStackParamList,
  ProfileStackParamList,
  MainTabParamList,
  RootStackParamList,
  TAB_LABELS,
  ROUTE_PHASE_MAP,
  GUARDED_ROUTES,
  DEEP_LINK_ROUTES,
} from './types';

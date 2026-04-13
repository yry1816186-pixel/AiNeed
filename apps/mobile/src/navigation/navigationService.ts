import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import type {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
  HomeStackParamList,
  StylistStackParamList,
  TryOnStackParamList,
  CommunityStackParamList,
  ProfileStackParamList,
  DeepLinkRouteConfig,
} from './types';
import { DEEP_LINK_ROUTES } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const DEEPLINK_PREFIX = 'xuno://';

// ============================================================
// Navigation State
// ============================================================
let isReady = false;

export function setNavigationReady(ready: boolean) {
  isReady = ready;
}

export function isNavigationReady(): boolean {
  return isReady && navigationRef.isReady();
}

// ============================================================
// Current Route
// ============================================================
export function getCurrentRouteName(): string | undefined {
  if (!navigationRef.isReady()) return undefined;
  return navigationRef.getCurrentRoute()?.name;
}

export function getCurrentRouteParams(): Record<string, unknown> | undefined {
  if (!navigationRef.isReady()) return undefined;
  return navigationRef.getCurrentRoute()?.params as Record<string, unknown> | undefined;
}

// ============================================================
// Type-Safe Navigate Functions
// ============================================================
export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName],
): void {
  if (!isNavigationReady()) return;
  (navigationRef as unknown as { navigate: (n: string, p?: unknown) => void }).navigate(
    name as string,
    params,
  );
}

export function navigateAuth<RouteName extends keyof AuthStackParamList>(
  name: RouteName,
  params?: AuthStackParamList[RouteName],
): void {
  if (!isNavigationReady()) return;
  navigationRef.dispatch(
    CommonActions.navigate({
      name: 'Auth',
      params: { screen: name, params },
    }),
  );
}

export function navigateTab<RouteName extends keyof MainTabParamList>(
  tabName: RouteName,
  screen?: string,
  params?: Record<string, unknown>,
): void {
  if (!isNavigationReady()) return;
  const tabParams: Record<string, unknown> = {};
  if (screen) {
    tabParams.screen = screen;
    if (params) tabParams.params = params;
  }
  navigationRef.dispatch(
    CommonActions.navigate({
      name: 'MainTabs',
      params: { screen: tabName, ...tabParams },
    }),
  );
}

export function navigateHome<RouteName extends keyof HomeStackParamList>(
  screen: RouteName,
  params?: HomeStackParamList[RouteName],
): void {
  navigateTab('Home', screen as string, params as Record<string, unknown>);
}

export function navigateStylist<RouteName extends keyof StylistStackParamList>(
  screen: RouteName,
  params?: StylistStackParamList[RouteName],
): void {
  navigateTab('Stylist', screen as string, params as Record<string, unknown>);
}

export function navigateTryOn<RouteName extends keyof TryOnStackParamList>(
  screen: RouteName,
  params?: TryOnStackParamList[RouteName],
): void {
  navigateTab('TryOn', screen as string, params as Record<string, unknown>);
}

export function navigateCommunity<RouteName extends keyof CommunityStackParamList>(
  screen: RouteName,
  params?: CommunityStackParamList[RouteName],
): void {
  navigateTab('Community', screen as string, params as Record<string, unknown>);
}

export function navigateProfile<RouteName extends keyof ProfileStackParamList>(
  screen: RouteName,
  params?: ProfileStackParamList[RouteName],
): void {
  navigateTab('Profile', screen as string, params as Record<string, unknown>);
}

// ============================================================
// Navigation Actions
// ============================================================
export function goBack(): void {
  if (!isNavigationReady()) return;
  if (navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}

export function reset(
  routes: Array<{ name: keyof RootStackParamList; params?: RootStackParamList[keyof RootStackParamList] }>,
  index: number = 0,
): void {
  if (!isNavigationReady()) return;
  navigationRef.reset({ index, routes });
}

export function resetToAuth(): void {
  reset([{ name: 'Auth', params: { screen: 'Login' } }]);
}

export function resetToMain(): void {
  reset([{ name: 'MainTabs' as keyof RootStackParamList }]);
}

// ============================================================
// Deep Link Parsing
// ============================================================
export interface ParsedDeepLink {
  target: 'tab' | 'auth';
  tab?: keyof MainTabParamList;
  screen: string;
  params?: Record<string, unknown>;
  requiresAuth: boolean;
}

export function parseDeepLink(url: string): ParsedDeepLink | null {
  const normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith(DEEPLINK_PREFIX)) return null;

  const rawPath = normalizedUrl.slice(DEEPLINK_PREFIX.length).split('?')[0] ?? '';
  const segments = rawPath.split('/').filter(Boolean).map(decodeURIComponent);

  if (segments.length === 0) {
    return { target: 'tab', tab: 'Home', screen: 'HomeFeed', requiresAuth: false };
  }

  const matched = matchDeepLinkConfig(segments, DEEP_LINK_ROUTES);
  if (matched) return matched;

  return null;
}

function matchDeepLinkConfig(
  segments: string[],
  configs: DeepLinkRouteConfig[],
): ParsedDeepLink | null {
  for (const config of configs) {
    const patternParts = config.pattern.split('/');
    if (patternParts.length !== segments.length) continue;

    let match = true;
    const params: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = segments[i];

      if (patternPart.startsWith(':')) {
        params[patternPart.slice(1)] = pathPart;
      } else if (patternPart !== pathPart) {
        match = false;
        break;
      }
    }

    if (match) {
      const isAuthRoute = !config.tab;
      return {
        target: isAuthRoute ? 'auth' : 'tab',
        tab: config.tab,
        screen: config.stack ?? '',
        params: config.paramsMapping(params),
        requiresAuth: config.requiresAuth,
      };
    }
  }

  return null;
}

export function navigateDeepLink(url: string, isAuthenticated: boolean): boolean {
  const parsed = parseDeepLink(url);
  if (!parsed) return false;

  if (parsed.requiresAuth && !isAuthenticated) {
    navigateAuth('Login');
    return true;
  }

  if (parsed.target === 'auth') {
    navigationRef.dispatch(
      CommonActions.navigate({
        name: 'Auth',
        params: { screen: parsed.screen, params: parsed.params },
      }),
    );
  } else if (parsed.tab && parsed.screen) {
    navigationRef.dispatch(
      CommonActions.navigate({
        name: 'MainTabs',
        params: {
          screen: parsed.tab,
          params: { screen: parsed.screen, params: parsed.params },
        },
      }),
    );
  }

  return true;
}

// ============================================================
// Push Notification Navigation
// ============================================================
export interface PushNotificationData {
  type?: string;
  targetScreen?: string;
  targetId?: string;
  [key: string]: unknown;
}

export function navigateFromPush(data: PushNotificationData, isAuthenticated: boolean): boolean {
  if (!data.targetScreen) return false;

  const screenMap: Record<string, () => void> = {
    'stylist': () => navigateStylist('AIStylist'),
    'tryon': () => navigateTryOn('VirtualTryOn'),
    'tryon_result': () => data.targetId && navigateTryOn('TryOnResult', { resultId: data.targetId }),
    'community_post': () => data.targetId && navigateCommunity('PostDetail', { postId: data.targetId }),
    'outfit_plan': () => data.targetId && navigateStylist('OutfitPlan', { planId: data.targetId }),
    'order': () => data.targetId && navigateProfile('OrderDetail', { orderId: data.targetId }),
    'advisor': () => data.targetId && navigateProfile('AdvisorProfile', { advisorId: data.targetId }),
    'advisor_chat': () => data.targetId && navigateProfile('Chat', { advisorId: data.targetId }),
    'booking': () => data.targetId && navigateProfile('Booking', { advisorId: data.targetId }),
    'subscription': () => navigateProfile('Subscription'),
    'cart': () => navigateProfile('Cart'),
  };

  const handler = screenMap[data.targetScreen];
  if (!handler) return false;

  if (!isAuthenticated) {
    navigateAuth('Login');
    return true;
  }

  handler();
  return true;
}

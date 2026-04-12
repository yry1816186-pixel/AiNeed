import { router } from 'expo-router';
import { Routes } from './routes';
import type { RouteParams, ParamRoutes, NoParamRoutes } from './types';
import { useAuthStore } from '../stores/auth.store';

function buildPath<Route extends keyof RouteParams>(
  route: Route,
  params?: RouteParams[Route],
): string {
  if (!params) return route;

  let path: string = route;
  const paramObj = params as Record<string, string>;
  for (const [key, value] of Object.entries(paramObj)) {
    path = path.replace(`[${key}]`, encodeURIComponent(value));
  }
  return path;
}

export function navigate(route: NoParamRoutes): void;
export function navigate<Route extends ParamRoutes>(
  route: Route,
  params: RouteParams[Route],
): void;
export function navigate<Route extends keyof RouteParams>(
  route: Route,
  ...args: RouteParams[Route] extends undefined ? [] : [params: RouteParams[Route]]
): void {
  const params = args[0] as Record<string, string> | undefined;
  router.push(buildPath(route, params as RouteParams[Route]));
}

export function replace(route: NoParamRoutes): void;
export function replace<Route extends ParamRoutes>(
  route: Route,
  params: RouteParams[Route],
): void;
export function replace<Route extends keyof RouteParams>(
  route: Route,
  ...args: RouteParams[Route] extends undefined ? [] : [params: RouteParams[Route]]
): void {
  const params = args[0] as Record<string, string> | undefined;
  router.replace(buildPath(route, params as RouteParams[Route]));
}

export function goBack(): void {
  router.back();
}

let _pendingRoute: string | null = null;

export function getPendingRoute(): string | null {
  return _pendingRoute;
}

export function clearPendingRoute(): void {
  _pendingRoute = null;
}

export function requireAuth(targetRoute: keyof RouteParams): boolean {
  const { isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated) {
    _pendingRoute = targetRoute;
    router.replace(Routes.LOGIN);
    return false;
  }
  return true;
}

export function requireOnboarding(targetRoute: keyof RouteParams): boolean {
  const { user } = useAuthStore.getState();
  if (!user?.gender) {
    _pendingRoute = targetRoute;
    router.replace(Routes.ONBOARDING);
    return false;
  }
  return true;
}

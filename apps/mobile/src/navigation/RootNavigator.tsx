/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect, useRef } from "react";

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import type { MainTabParamList, RootStackParamList, GuardType } from "./types";
import { TAB_LABELS, GUARDED_ROUTES } from "./types";
import { AuthNavigator } from "./AuthNavigator";
import {
  TodayStackNavigator,
  DiscoverStackNavigator,
  StylistStackNavigator,
  ProfileStackNavigator,
} from "./MainStackNavigator";
import { useAuthStore } from "../features/auth/stores";
import { useCartStore } from "../features/commerce/stores/cart.store";
import { useTheme } from "../shared/contexts/ThemeContext";
import { navigateAuth, navigateProfile, navigationRef } from "./navigationService";

import { AnimatedTabBar } from "../shared/components/AnimatedTabBar";
import { CommonActions } from "@react-navigation/native";
import { OfflineBanner } from "../shared/components/states";
import { useNetwork } from "../shared/hooks/useNetwork";

// ============================================================
// Main Tab Navigator (4 Tabs: Today / Discover / Stylist / Me)
// ============================================================
const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  const { colors } = useTheme();
  const cartCount = useCartStore((state) => state.totalItems);

  return (
    <Tab.Navigator
      // AnimatedTabBar uses a subset of BottomTabBarProps; spread is safe at runtime
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tabBar={(props: BottomTabBarProps) => <AnimatedTabBar {...(props as any)} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Today"
        component={TodayStackNavigator}
        options={{ tabBarLabel: TAB_LABELS.Today }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverStackNavigator}
        options={{ tabBarLabel: TAB_LABELS.Discover }}
      />
      <Tab.Screen
        name="Stylist"
        component={StylistStackNavigator}
        options={{ tabBarLabel: TAB_LABELS.Stylist }}
      />
      <Tab.Screen
        name="Me"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: TAB_LABELS.Me,
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
        }}
      />
    </Tab.Navigator>
  );
}

// ============================================================
// Route Guard Helpers (navigation-level enforcement)
// ============================================================

// Protected routes that require authentication
const AUTH_PROTECTED_ROUTES = new Set([
  "AiStylistChat",
  "VirtualTryOn",
  "Wardrobe",
  "Payment",
  "OrderDetail",
  "Cart",
  "Booking",
  "AdvisorProfile",
  "Chat",
  "Checkout",
  "Orders",
  "AddClothing",
  "Favorites",
  "ProfileEdit",
  "SharePoster",
  "Subscription",
  "OutfitPlan",
  "ChatHistory",
  "TryOnResult",
  "TryOnHistory",
  "PostCreate",
  "CustomDesign",
  "CustomEditor",
  "Brand",
  "AdvisorList",
  "Notifications",
  "SessionCalendar",
  "InspirationWardrobe",
  "BloggerDashboard",
  "StyleQuiz",
  "Settings",
  "NotificationSettings",
]);

// Routes that require profile completion (onboarding)
const PROFILE_REQUIRED_ROUTES = new Set(["AiStylistChat", "VirtualTryOn", "AIStylist"]);

// Public routes that never require auth
const PUBLIC_ROUTES = new Set([
  "HomeFeed",
  "Search",
  "Product",
  "Login",
  "Register",
  "CommunityFeed",
  "PostDetail",
  "Onboarding",
  "PhoneLogin",
]);

/**
 * Check if a route name requires auth guard and return the failed guard type.
 * Returns null if access is allowed.
 */
function checkNavigationGuard(
  routeName: string,
  isAuthenticated: boolean,
  onboardingCompleted: boolean
): GuardType | null {
  // Public routes are always accessible
  if (PUBLIC_ROUTES.has(routeName)) {
    return null;
  }

  // Check auth guard
  if (AUTH_PROTECTED_ROUTES.has(routeName) && !isAuthenticated) {
    return "auth";
  }

  // Check profile guard
  if (PROFILE_REQUIRED_ROUTES.has(routeName) && isAuthenticated && !onboardingCompleted) {
    return "profile";
  }

  // Also check GUARDED_ROUTES config for consistency
  const guardConfig = GUARDED_ROUTES.find((g) => g.route === routeName);
  if (guardConfig) {
    for (const guard of guardConfig.guards) {
      if (guard === "auth" && !isAuthenticated) {
        return "auth";
      }
      if (guard === "profile" && (!isAuthenticated || !onboardingCompleted)) {
        return "profile";
      }
      // VipGuard is handled at component level
    }
  }

  return null;
}

/**
 * Redirect based on the failed guard type.
 */
function handleNavigationGuardRedirect(failedGuard: GuardType): void {
  switch (failedGuard) {
    case "auth":
      navigateAuth("Login");
      break;
    case "profile":
      navigateAuth("Onboarding");
      break;
    case "vip":
      navigateProfile("Subscription");
      break;
  }
}

// ============================================================
// Root Stack Navigator
// ============================================================
const RootStack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  isAuthenticated: boolean;
}

export function RootNavigator({ isAuthenticated }: RootNavigatorProps) {
  const onboardingCompleted = useAuthStore((state) => state.onboardingCompleted);
  const lastGuardedRouteRef = useRef<string | null>(null);
  const prevAuthRef = useRef(isAuthenticated);
  const { isOffline, syncOfflineRequests } = useNetwork();

  // When auth state changes, reset the root stack to the correct screen
  useEffect(() => {
    if (prevAuthRef.current !== isAuthenticated && navigationRef.isReady()) {
      prevAuthRef.current = isAuthenticated;
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: isAuthenticated ? "MainTabs" : "Auth" }],
        })
      );
    }
  }, [isAuthenticated]);

  // Navigation state listener for route guard enforcement at the navigation level
  const handleStateChange = useCallback(() => {
    // Get the current route from the navigation tree
    const rootState = navigationRef?.getRootState?.();
    if (!rootState) {
      return;
    }

    // Extract the deepest route name from nested navigators
    let currentRouteName: string | undefined;
    let state = rootState as { routes?: { name: string; state?: unknown }[]; index?: number };

    while (state?.routes) {
      const idx = state.index ?? 0;
      const route = state.routes[idx];
      if (!route) {
        break;
      }
      currentRouteName = route.name;
      state = (route.state ?? undefined) as typeof state;
    }

    if (!currentRouteName) {
      return;
    }

    // Avoid re-checking the same route
    if (currentRouteName === lastGuardedRouteRef.current) {
      return;
    }

    const failedGuard = checkNavigationGuard(
      currentRouteName,
      isAuthenticated,
      onboardingCompleted
    );

    if (failedGuard) {
      lastGuardedRouteRef.current = currentRouteName;
      // Use setTimeout to avoid dispatching during render
      setTimeout(() => handleNavigationGuardRedirect(failedGuard), 0);
    } else {
      lastGuardedRouteRef.current = null;
    }
  }, [isAuthenticated, onboardingCompleted]);

  return (
    <>
      <OfflineBanner visible={isOffline} onRetry={() => void syncOfflineRequests()} />
      <RootStack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={isAuthenticated ? "MainTabs" : "Auth"}
        screenListeners={{
          state: handleStateChange,
        }}
      >
        <RootStack.Screen name="Auth" component={AuthNavigator} />
        <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
      </RootStack.Navigator>
    </>
  );
}

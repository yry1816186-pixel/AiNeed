import React, { useCallback, useRef } from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "../polyfills/expo-vector-icons";
import type { MainTabParamList, RootStackParamList, GuardType } from "./types";
import { TAB_LABELS, GUARDED_ROUTES } from "./types";
import { AuthNavigator } from "./AuthNavigator";
import {
  HomeStackNavigator,
  StylistStackNavigator,
  TryOnStackNavigator,
  CommunityStackNavigator,
  ProfileStackNavigator,
} from "./MainStackNavigator";
import { useAuthStore, useCartStore } from "../stores/index";
import { useTheme, createStyles } from 'undefined';
import { navigateAuth, navigateProfile, navigationRef } from "./navigationService";
import { DesignTokens } from "../design-system/theme/tokens/design-tokens";

// ============================================================
// Main Tab Navigator (5 Tabs)
// ============================================================
const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
    const { colors } = useTheme();
  const cartCount = useCartStore((state) => state.totalItems);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home";

          switch (route.name) {
            case "Home":
              iconName = focused ? "home" : "home-outline";
              break;
            case "Stylist":
              iconName = focused ? "color-wand" : "color-wand-outline";
              break;
            case "TryOn":
              iconName = focused ? "shirt" : "shirt-outline";
              break;
            case "Community":
              iconName = focused ? "people" : "people-outline";
              break;
            case "Profile":
              iconName = focused ? "person" : "person-outline";
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          paddingTop: 6,
          paddingBottom: 6,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: DesignTokens.typography.sizes.xs,
          fontWeight: "600",
          letterSpacing: 0.3,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{ tabBarLabel: TAB_LABELS.Home }}
      />
      <Tab.Screen
        name="Stylist"
        component={StylistStackNavigator}
        options={{ tabBarLabel: TAB_LABELS.Stylist }}
      />
      <Tab.Screen
        name="TryOn"
        component={TryOnStackNavigator}
        options={{ tabBarLabel: TAB_LABELS.TryOn }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityStackNavigator}
        options={{ tabBarLabel: TAB_LABELS.Community }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: TAB_LABELS.Profile,
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
  );
}

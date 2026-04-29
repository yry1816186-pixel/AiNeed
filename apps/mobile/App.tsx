/* eslint-disable @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unused-vars, no-useless-escape */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, LogBox, StatusBar, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NavigationContainer } from "@react-navigation/native";
import { useShallow } from "zustand/react/shallow";
import { ErrorBoundary } from "./src/shared/components/ErrorBoundary";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { DemoModeBanner } from "./src/shared/components/common/DemoModeBanner";
import { useDemoStore } from "./src/shared/stores/demoStore";
import {
  navigationRef,
  setNavigationReady,
  navigateDeepLink,
  isNavigationReady as checkNavigationReady,
} from "./src/navigation/navigationService";
import {
  ThemeProvider as UnifiedThemeProvider,
  useTheme,
} from "./src/shared/contexts/ThemeContext";
import { ThemeProvider as PaperThemeProvider } from "./src/design-system/ui/PaperThemeProvider";
import { useAuthStore } from "./src/features/auth/stores";
import { OfflineBanner } from "./src/shared/components/common/OfflineBanner";
import { I18nProvider } from "./src/i18n";
import { FeatureFlagProvider } from "./src/shared/contexts/FeatureFlagContext";
import { SplashScreen as AnimatedSplashScreen } from "./src/shared/components/flows/FlowAnimations";
import { initSentry } from "./src/shared/services/sentry";
import apiClient from "./src/shared/services/apiClient";
import { authApi } from "./src/features/auth/services/auth.api";
import { analytics } from "./src/shared/services/analytics";

LogBox.ignoreLogs([
  "FileSystem.w+Async is a stub",
  "expo-media-library.saveToLibraryAsync is a stub",
  "expo-router.router: Navigation not ready",
  "setNavigationRef is deprecated",
  "EXPO_OS is not defined",
]);

initSentry();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

const DEV_TEST_ACCOUNT_CONFIG = {
  enabled: __DEV__,
  email: "test@example.com",
  password: "Test123456!",
};

function ThemedStatusBar() {
  const { colors } = useTheme();
  return <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />;
}

function SplashScreen() {
  const setLoading = useAuthStore((state) => state.setLoading);
  return <AnimatedSplashScreen onFinish={() => setLoading(false)} />;
}

function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={rootStyles.root}>
      <UnifiedThemeProvider>
        <PaperThemeProvider>
          <I18nProvider>
            <FeatureFlagProvider>
              <SafeAreaProvider>
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
              </SafeAreaProvider>
            </FeatureFlagProvider>
          </I18nProvider>
        </PaperThemeProvider>
      </UnifiedThemeProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  const {
    isAuthenticated,
    isLoading,
    token: authToken,
    setLoading,
  } = useAuthStore(
    useShallow((state) => ({
      isAuthenticated: state.isAuthenticated,
      isLoading: state.isLoading,
      token: state.accessToken,
      setLoading: state.setLoading,
    }))
  );

  const demoMode = useDemoStore((s) => s.demoMode);

  const [currentRouteName, setCurrentRouteName] = useState<string | undefined>();

  const pendingDeepLinkUrlRef = useRef<string | null>(null);
  const lastHandledDeepLinkUrlRef = useRef<string | null>(null);
  const hasAutoLoggedInRef = useRef(false);

  const queueDeepLink = useCallback((url?: string | null) => {
    if (!url) {
      return;
    }
    pendingDeepLinkUrlRef.current = url;
  }, []);

  const flushPendingDeepLink = useCallback(() => {
    if (!checkNavigationReady() || isLoading) {
      return;
    }

    const pendingUrl = pendingDeepLinkUrlRef.current;
    if (!pendingUrl || pendingUrl === lastHandledDeepLinkUrlRef.current) {
      return;
    }

    const handled = navigateDeepLink(pendingUrl, isAuthenticated);
    if (handled) {
      lastHandledDeepLinkUrlRef.current = pendingUrl;
      pendingDeepLinkUrlRef.current = null;
    }
  }, [isAuthenticated, isLoading]);

  // Demo mode side effects: suppress analytics & crash reporting
  useEffect(() => {
    if (demoMode) {
      analytics.destroy();
      console.log("[DemoMode] Analytics & crash reporting suppressed");
    }
  }, [demoMode]);

  useEffect(() => {
    if (
      DEV_TEST_ACCOUNT_CONFIG.enabled &&
      !isLoading &&
      !isAuthenticated &&
      !authToken &&
      !hasAutoLoggedInRef.current
    ) {
      hasAutoLoggedInRef.current = true;
      const autoLogin = async () => {
        try {
          console.log("[DEV] Attempting auto-login with test account...");
          const response = await authApi.login({
            email: DEV_TEST_ACCOUNT_CONFIG.email,
            password: DEV_TEST_ACCOUNT_CONFIG.password,
          });

          if (response.success && response.data) {
            useAuthStore.getState().setToken(response.data.token);
            useAuthStore.getState().setUser(response.data.user);
            console.log("[DEV] Auto-login successful");
          }
        } catch (error) {
          console.warn("[DEV] Auto-login failed:", error);
          hasAutoLoggedInRef.current = false;
        }
      };

      const timer = setTimeout(autoLogin, 500);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [authToken, isAuthenticated, isLoading]);

  useEffect(() => {
    apiClient.onAuthExpired(() => {
      useAuthStore.getState().logout();
    });
    analytics.init();

    return () => {
      analytics.destroy();
    };
  }, []);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setLoading(false);
    });

    if (useAuthStore.persist.hasHydrated()) {
      setLoading(false);
    }

    const timeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, [setLoading]);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    void apiClient.setToken(authToken ?? null);
  }, [authToken, isLoading]);

  useEffect(() => {
    let isMounted = true;

    void Linking.getInitialURL().then((url) => {
      if (isMounted) {
        queueDeepLink(url);
      }
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      queueDeepLink(url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [queueDeepLink]);

  useEffect(() => {
    flushPendingDeepLink();
  }, [currentRouteName, flushPendingDeepLink, isAuthenticated]);

  const navigationReadyHandler = useMemo(
    () => ({
      onReady: () => {
        setNavigationReady(true);
        const routeName = navigationRef.getCurrentRoute()?.name;
        setCurrentRouteName(routeName);
        if (routeName) {
          analytics.trackScreen(routeName);
        }
      },
      onStateChange: () => {
        const routeName = navigationRef.getCurrentRoute()?.name;
        setCurrentRouteName(routeName);
        if (routeName) {
          analytics.trackScreen(routeName);
        }
      },
    }),
    []
  );

  if (isLoading) {
    return (
      <ErrorBoundary
        screenName="SplashScreen"
        context={{ phase: "loading" }}
        onError={(error, errorInfo, structuredError) => {
          console.error("[App:Loading] Error:", structuredError);
        }}
      >
        <AppProviders>
          <ThemedStatusBar />
          <SplashScreen />
        </AppProviders>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary
      screenName="AppRoot"
      context={{ isAuthenticated }}
      maxRetries={3}
      onError={(error, errorInfo, structuredError) => {
        console.error("[App:Root] Error:", structuredError);
      }}
      onReset={() => {
        console.log("[App:Root] Error boundary reset");
      }}
    >
      <AppProviders>
        <NavigationContainer
          ref={navigationRef}
          onReady={navigationReadyHandler.onReady}
          onStateChange={navigationReadyHandler.onStateChange}
        >
          <ThemedStatusBar />
          <DemoModeBanner />
          <OfflineBanner />
          <RootNavigator isAuthenticated={isAuthenticated} />
        </NavigationContainer>
      </AppProviders>
    </ErrorBoundary>
  );
}

const rootStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from './src/polyfills/expo-vector-icons';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { RootNavigator } from './src/navigation/RootNavigator';
import {
  navigationRef,
  setNavigationReady,
  navigateDeepLink,
  isNavigationReady as checkNavigationReady,
} from './src/navigation/navigationService';
import { theme } from './src/theme';
import { useAuthStore } from './src/stores/index';
import { OfflineBanner } from './src/components/common/OfflineBanner';
import { initSentry } from './src/services/sentry';
import apiClient from './src/services/api/client';
import { authApi } from './src/services/api/auth.api';
import { analytics } from './src/services/analytics';

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
  email: 'test@example.com',
  password: 'Test123456!',
};

function SplashScreen() {
  return (
    <View style={styles.splashContainer}>
      <View style={styles.logoContainer}>
        <Ionicons name="shirt-outline" size={48} color={theme.colors.surface} />
      </View>
      <Text style={styles.brandName}>寻裳</Text>
      <ActivityIndicator
        size="large"
        color={theme.colors.primary}
        style={styles.loader}
      />
    </View>
  );
}

export default function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authToken = useAuthStore((state) => state.token);
  const setLoading = useAuthStore((state) => state.setLoading);

  const [currentRouteName, setCurrentRouteName] = useState<string | undefined>();

  const pendingDeepLinkUrlRef = useRef<string | null>(null);
  const lastHandledDeepLinkUrlRef = useRef<string | null>(null);

  const queueDeepLink = useCallback((url?: string | null) => {
    if (!url) return;
    pendingDeepLinkUrlRef.current = url;
  }, []);

  const flushPendingDeepLink = useCallback(() => {
    if (!checkNavigationReady() || isLoading) return;

    const pendingUrl = pendingDeepLinkUrlRef.current;
    if (!pendingUrl || pendingUrl === lastHandledDeepLinkUrlRef.current) return;

    const handled = navigateDeepLink(pendingUrl, isAuthenticated);
    if (handled) {
      lastHandledDeepLinkUrlRef.current = pendingUrl;
      pendingDeepLinkUrlRef.current = null;
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (DEV_TEST_ACCOUNT_CONFIG.enabled && !isLoading && !isAuthenticated && !authToken) {
      const autoLogin = async () => {
        try {
          console.log('[DEV] Attempting auto-login with test account...');
          const response = await authApi.login({
            email: DEV_TEST_ACCOUNT_CONFIG.email,
            password: DEV_TEST_ACCOUNT_CONFIG.password,
          });

          if (response.success && response.data) {
            useAuthStore.getState().setToken(response.data.token);
            useAuthStore.getState().setUser(response.data.user);
            console.log('[DEV] Auto-login successful');
          }
        } catch (error) {
          console.warn('[DEV] Auto-login failed:', error);
        }
      };

      const timer = setTimeout(autoLogin, 500);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [authToken, isAuthenticated, isLoading]);

  useEffect(() => {
    initSentry();
    apiClient.onAuthExpired(() => {
      useAuthStore.getState().logout();
    });
    analytics.init();

    return () => {
      analytics.destroy();
    };
  }, []);

  useEffect(() => {
    const checkHydration = () => {
      if (useAuthStore.persist.hasHydrated()) {
        setLoading(false);
        return true;
      }
      return false;
    };

    if (checkHydration()) return;

    const interval = setInterval(() => {
      if (checkHydration()) {
        clearInterval(interval);
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setLoading(false);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [setLoading]);

  useEffect(() => {
    if (isLoading) return;
    void apiClient.setToken(authToken ?? null);
  }, [authToken, isLoading]);

  useEffect(() => {
    let isMounted = true;

    void Linking.getInitialURL().then((url) => {
      if (isMounted) queueDeepLink(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
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

  if (isLoading) {
    return (
      <ErrorBoundary
        screenName="SplashScreen"
        context={{ phase: 'loading' }}
        onError={(error, errorInfo, structuredError) => {
          console.error('[App:Loading] Error:', structuredError);
        }}
      >
        <GestureHandlerRootView style={styles.root}>
          <SafeAreaProvider>
            <StatusBar
              barStyle="dark-content"
              backgroundColor={theme.colors.surface}
            />
            <SplashScreen />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary
      screenName="AppRoot"
      context={{ isAuthenticated }}
      maxRetries={3}
      onError={(error, errorInfo, structuredError) => {
        console.error('[App:Root] Error:', structuredError);
      }}
      onReset={() => {
        console.log('[App:Root] Error boundary reset');
      }}
    >
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <NavigationContainer
              ref={navigationRef}
              onReady={() => {
                setNavigationReady(true);
                const routeName = navigationRef.getCurrentRoute()?.name;
                setCurrentRouteName(routeName);
                if (routeName) {
                  analytics.trackScreen(routeName);
                }
              }}
              onStateChange={() => {
                const routeName = navigationRef.getCurrentRoute()?.name;
                setCurrentRouteName(routeName);
                if (routeName) {
                  analytics.trackScreen(routeName);
                }
              }}
            >
              <StatusBar
                barStyle="dark-content"
                backgroundColor={theme.colors.surface}
              />
              <OfflineBanner />
              <RootNavigator isAuthenticated={isAuthenticated} />
            </NavigationContainer>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 1.5,
    marginBottom: 32,
  },
  loader: {
    marginTop: 8,
  },
});

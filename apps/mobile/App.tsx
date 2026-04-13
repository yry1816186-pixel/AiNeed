import React, { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { CommonActions, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  ActivityIndicator,
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Ionicons } from './src/polyfills/expo-vector-icons';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { navigationRef, getCurrentRouteName } from './src/navigation';
import type { RootStackParamList, MainTabParamList } from './src/types/navigation';
import { theme } from './src/theme';
import { useAuthStore, useCartStore } from './src/stores/index';
import { OfflineBanner } from './src/components/common/OfflineBanner';
import { initSentry } from './src/services/sentry';
import apiClient from './src/services/api/client';
import { authApi } from './src/services/api/auth.api';
import { analytics } from './src/services/analytics';

// ✅ 首屏必需组件 - 同步导入（6个 Tab + Login/Register）
import HomeScreen from './src/screens/home/HomeScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { CartScreen } from './src/screens/CartScreen';
import { WardrobeScreen } from './src/screens/WardrobeScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { HeartScreen } from './src/screens/HeartScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { PhoneLoginScreen } from './src/screens/PhoneLoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';

// 🚀 非首屏组件 - 懒加载（按需加载，减少初始 bundle ~40-60%）
const SettingsScreen = lazy(() => import('./src/screens/SettingsScreen'));
const CheckoutScreen = lazy(() => import('./src/screens/CheckoutScreen'));
const OrdersScreen = lazy(() => import('./src/screens/OrdersScreen'));
const OrderDetailScreen = lazy(() => import('./src/screens/OrderDetailScreen'));
const NotificationsScreen = lazy(() => import('./src/screens/NotificationsScreen'));
const NotificationSettingsScreen = lazy(() => import('./src/screens/NotificationSettingsScreen'));
const FavoritesScreen = lazy(() => import('./src/screens/FavoritesScreen').then(m => ({ default: m.FavoritesScreen })));
const AiStylistScreen = lazy(() => import('./src/screens/AiStylistScreenV2'));
const ClothingDetailScreen = lazy(() => import('./src/screens/ClothingDetailScreen'));
const OutfitDetailScreen = lazy(() => import('./src/screens/OutfitDetailScreen'));
const AddClothingScreen = lazy(() => import('./src/screens/AddClothingScreen'));
const RecommendationDetailScreen = lazy(() => import('./src/screens/RecommendationDetailScreen'));
const CommunityScreen = lazy(() => import('./src/screens/CommunityScreen'));
const VirtualTryOnScreen = lazy(() => import('./src/screens/VirtualTryOnScreen'));
const AICompanionProvider = lazy(() => import('./src/components/aicompanion/AICompanionProvider').then(m => ({ default: m.AICompanionProvider })));
const OnboardingScreen = lazy(() => import('./src/screens/onboarding/OnboardingWizard'));
const CustomizationScreen = lazy(() => import('./src/screens/CustomizationScreen'));
const SubscriptionScreen = lazy(() => import('./src/screens/SubscriptionScreen'));
const LegalScreen = lazy(() => import('./src/screens/LegalScreen'));

// 懒加载占位组件
function ScreenLoader() {
  return (
    <View style={styles.screenLoader}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const APP_LINK_PREFIX = 'xuno://';

const DEV_TEST_ACCOUNT_CONFIG = {
  enabled: __DEV__,
  email: 'test@example.com',
  password: 'Test123456!',
};

type RootDeepLinkName = Exclude<keyof RootStackParamList, 'MainTabs'>;

type ResolvedDeepLink =
  | {
      currentRouteName: keyof MainTabParamList;
      navigationName: 'MainTabs';
      params: { screen: keyof MainTabParamList };
      requiresAuth: boolean;
    }
  | {
      currentRouteName: RootDeepLinkName;
      navigationName: RootDeepLinkName;
      params?: RootStackParamList[RootDeepLinkName];
      requiresAuth: boolean;
    };

const ROOT_DEEP_LINKS: Record<string, RootDeepLinkName> = {
  login: 'Login',
  register: 'Register',
  checkout: 'Checkout',
  orders: 'Orders',
  notifications: 'Notifications',
  settings: 'Settings',
  'notification-settings': 'NotificationSettings',
  community: 'Community',
  tryon: 'VirtualTryOn',
  favorites: 'Favorites',
  'ai-stylist': 'AiStylist',
  customization: 'Customization',
  subscription: 'Subscription',
  'add-clothing': 'AddClothing',
};

const TAB_DEEP_LINKS: Record<string, keyof MainTabParamList> = {
  '': 'Home',
  home: 'Home',
  explore: 'Explore',
  heart: 'Heart',
  cart: 'Cart',
  wardrobe: 'Wardrobe',
  profile: 'Profile',
};

const TAB_LABELS: Record<keyof MainTabParamList, string> = {
  Home: '首页',
  Explore: '发现',
  Heart: '推荐',
  Cart: '购物车',
  Wardrobe: '衣橱',
  Profile: '我的',
};

function resolveDeepLink(url: string): ResolvedDeepLink | null {
  const normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith(APP_LINK_PREFIX)) {
    return null;
  }

  const rawPath = normalizedUrl.slice(APP_LINK_PREFIX.length).split('?')[0] ?? '';
  const segments = rawPath.split('/').filter(Boolean).map(decodeURIComponent);
  const firstSegment = segments[0] ?? '';

  const tabScreen = TAB_DEEP_LINKS[firstSegment];
  if (tabScreen) {
    return {
      currentRouteName: tabScreen,
      navigationName: 'MainTabs',
      params: { screen: tabScreen },
      requiresAuth: true,
    };
  }

  if (firstSegment === 'orders' && segments[1]) {
    return {
      currentRouteName: 'OrderDetail',
      navigationName: 'OrderDetail',
      params: { orderId: segments[1] },
      requiresAuth: true,
    };
  }

  if (firstSegment === 'clothing' && segments[1]) {
    return {
      currentRouteName: 'ClothingDetail',
      navigationName: 'ClothingDetail',
      params: { clothingId: segments[1] },
      requiresAuth: true,
    };
  }

  if (firstSegment === 'outfit' && segments[1]) {
    return {
      currentRouteName: 'OutfitDetail',
      navigationName: 'OutfitDetail',
      params: { outfitId: segments[1] },
      requiresAuth: true,
    };
  }

  if (firstSegment === 'recommendation' && segments[1]) {
    return {
      currentRouteName: 'RecommendationDetail',
      navigationName: 'RecommendationDetail',
      params: { recommendationId: segments[1] },
      requiresAuth: true,
    };
  }

  const rootRoute = ROOT_DEEP_LINKS[firstSegment];
  if (!rootRoute) {
    return null;
  }

  return {
    currentRouteName: rootRoute,
    navigationName: rootRoute,
    requiresAuth: !['Login', 'Register'].includes(rootRoute),
  };
}

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

function MainTabs() {
  const cartCount = useCartStore((state) => state.totalItems);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Explore':
              iconName = focused ? 'compass' : 'compass-outline';
              break;
            case 'Heart':
              iconName = focused ? 'heart' : 'heart-outline';
              break;
            case 'Cart':
              iconName = focused ? 'cart' : 'cart-outline';
              break;
            case 'Wardrobe':
              iconName = focused ? 'shirt' : 'shirt-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border,
          paddingTop: 6,
          paddingBottom: 6,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: '首页' }}
      />
      <Tab.Screen
        name="Explore"
        component={SearchScreen}
        options={{ tabBarLabel: '发现' }}
      />
      <Tab.Screen
        name="Heart"
        component={HeartScreen}
        options={{ tabBarLabel: '推荐' }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarLabel: '购物车',
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
        }}
      />
      <Tab.Screen
        name="Wardrobe"
        component={WardrobeScreen}
        options={{ tabBarLabel: '衣橱' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: '我的' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authToken = useAuthStore((state) => state.token);
  const setLoading = useAuthStore((state) => state.setLoading);

  const [currentRouteName, setCurrentRouteName] = useState<string | undefined>();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  const pendingDeepLinkUrlRef = useRef<string | null>(null);
  const lastHandledDeepLinkUrlRef = useRef<string | null>(null);

  const queueDeepLink = useCallback((url?: string | null) => {
    if (!url) {
      return;
    }

    pendingDeepLinkUrlRef.current = url;
  }, []);

  const flushPendingDeepLink = useCallback(() => {
    if (!isNavigationReady || isLoading || !navigationRef.isReady()) {
      return;
    }

    const pendingUrl = pendingDeepLinkUrlRef.current;
    if (!pendingUrl || pendingUrl === lastHandledDeepLinkUrlRef.current) {
      return;
    }

    const target = resolveDeepLink(pendingUrl);
    if (!target) {
      lastHandledDeepLinkUrlRef.current = pendingUrl;
      pendingDeepLinkUrlRef.current = null;
      return;
    }

    if (target.requiresAuth && !isAuthenticated) {
      return;
    }

    if (getCurrentRouteName() === target.currentRouteName) {
      lastHandledDeepLinkUrlRef.current = pendingUrl;
      pendingDeepLinkUrlRef.current = null;
      return;
    }

    navigationRef.dispatch(
      CommonActions.navigate(target.navigationName as never, target.params as never),
    );

    lastHandledDeepLinkUrlRef.current = pendingUrl;
    pendingDeepLinkUrlRef.current = null;
  }, [isAuthenticated, isLoading, isNavigationReady]);

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

    if (checkHydration()) {
      return;
    }

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
                setIsNavigationReady(true);
                const routeName = getCurrentRouteName();
                setCurrentRouteName(routeName);
                if (routeName) {
                  analytics.trackScreen(routeName);
                }
              }}
              onStateChange={() => {
                const routeName = getCurrentRouteName();
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
              <AICompanionProvider currentRouteName={currentRouteName}>
                <Stack.Navigator
                  screenOptions={{ headerShown: false }}
                  initialRouteName={isAuthenticated ? 'MainTabs' : 'Login'}
                >
                  <Stack.Screen name="MainTabs" component={MainTabs} />
                  <Stack.Screen name="Login" component={LoginScreen} />
                  <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
                  <Stack.Screen name="Register" component={RegisterScreen} />

                  {/* 🚀 懒加载页面 - 使用 Suspense 包裹 */}
                  <Stack.Screen name="Onboarding">
                    {() => (
                      <Suspense fallback={<ScreenLoader />}>
                        <OnboardingScreen />
                      </Suspense>
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="Checkout">
                    {() => (
                      <Suspense fallback={<ScreenLoader />}>
                        <CheckoutScreen />
                      </Suspense>
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="Orders">
                    {() => (
                      <Suspense fallback={<ScreenLoader />}>
                        <OrdersScreen />
                      </Suspense>
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="OrderDetail">
                    {() => (
                      <Suspense fallback={<ScreenLoader />}>
                        <OrderDetailScreen />
                      </Suspense>
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="Notifications">
                    {() => (
                      <Suspense fallback={<ScreenLoader />}>
                        <NotificationsScreen />
                      </Suspense>
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="Settings">
                    {() => (
                      <Suspense fallback={<ScreenLoader />}>
                        <SettingsScreen />
                      </Suspense>
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="NotificationSettings">
                    {() => (
                      <Suspense fallback={<ScreenLoader />}>
                        <NotificationSettingsScreen />
                      </Suspense>
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="ClothingDetail">
                    {() => (
                      <Suspense fallback={<ScreenLoader />}>
                        <ClothingDetailScreen />
                      </Suspense>
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="OutfitDetail">
                    {() => (
                      <Suspense fallback={<ScreenLoader />}>
                        <OutfitDetailScreen />
                      </Suspense>
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="AddClothing">
                    {() => (
                      <Suspense fallback={<ScreenLoader />}>
                        <AddClothingScreen />
                      </Suspense>
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="RecommendationDetail">
                    {() => (
                      <Suspense fallback={<ScreenLoader />}>
                        <RecommendationDetailScreen />
                      </Suspense>
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="Community">
                    {() => (
                      <Suspense fallback={<ScreenLoader />}>
                        <CommunityScreen />
                      </Suspense>
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="VirtualTryOn">
                    {() => (
                      <Suspense fallback={<ScreenLoader />}>
                        <VirtualTryOnScreen />
                      </Suspense>
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="Favorites">
                    {() => (
                      <Suspense fallback={<ScreenLoader />}>
                        <FavoritesScreen />
                      </Suspense>
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="AiStylist">
                    {() => (
                      <Suspense fallback={<ScreenLoader />}>
                        <AiStylistScreen />
                      </Suspense>
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="Customization">
                    {() => (
                      <Suspense fallback={<ScreenLoader />}>
                        <CustomizationScreen />
                      </Suspense>
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="Subscription">
                    {() => (
                      <Suspense fallback={<ScreenLoader />}>
                        <SubscriptionScreen />
                      </Suspense>
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="TermsOfService">
                    {() => (
                      <Suspense fallback={<ScreenLoader />}>
                        <LegalScreen type="terms" />
                      </Suspense>
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="PrivacyPolicy">
                    {() => (
                      <Suspense fallback={<ScreenLoader />}>
                        <LegalScreen type="privacy" />
                      </Suspense>
                    )}
                  </Stack.Screen>
                </Stack.Navigator>
              </AICompanionProvider>
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
  screenLoader: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

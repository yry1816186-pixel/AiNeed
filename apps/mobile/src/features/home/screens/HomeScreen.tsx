import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  type TextStyle,
} from "react-native";
import Geolocation, { type GeolocationResponse } from "@react-native-community/geolocation";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { FlashList } from "@/src/polyfills/flash-list";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { useHomeStore } from '../stores/homeStore';
import { useAuthStore } from '../stores/index';
import { useRecommendationFeedStore } from '../stores/recommendationFeedStore';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { withErrorBoundary } from '../../../shared/components/ErrorBoundary';
import { useScreenTracking } from '../../../hooks/useAnalytics';
import { useTranslation } from '../../../i18n';
import { useFeatureFlags } from '../../../contexts/FeatureFlagContext';
import { FeatureFlagKeys } from '../../../constants/feature-flags';
import { WeatherGreeting } from './components/WeatherGreeting';
import { ProfileCompletionBanner } from './components/ProfileCompletionBanner';
import QuickActions from './components/QuickActions';
import { RecommendationCard } from '../../../components/recommendations/RecommendationFeedCard';
import { BrandRefreshIndicator } from '../../../components/loading/BrandRefreshIndicator';
import type { RootStackParamList } from '../../../types/navigation';
import type { FeedItem } from '../../../services/api/recommendation-feed.api';
import { Spacing, LayoutSpacing } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

type HomeSection =
  | { type: "greeting" }
  | { type: "banner" }
  | { type: "quickActions" }
  | { type: "search" }
  | { type: "recommendationHeader" }
  | { type: "recommendationItem"; item: FeedItem };

const BASE_SECTIONS: HomeSection[] = [
  { type: "greeting" },
  { type: "banner" },
  { type: "quickActions" },
  { type: "search" },
];

const FALLBACK_LATITUDE = 35.8617;
const FALLBACK_LONGITUDE = 104.1954;

const HomeScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s: any) => s.user);
  useScreenTracking("Home");
  const t = useTranslation();
  const { isEnabled } = useFeatureFlags();
  const isRecommendationFeed = isEnabled(FeatureFlagKeys.RECOMMENDATION_FEED);

  // --- Staggered entrance animations ---
  const greetingOpacity = useSharedValue(0);
  const greetingTranslateY = useSharedValue(12);
  const quickActionsOpacity = useSharedValue(0);
  const quickActionsTranslateY = useSharedValue(12);
  const searchOpacity = useSharedValue(0);
  const searchTranslateY = useSharedValue(12);
  const recHeaderOpacity = useSharedValue(0);
  const recHeaderTranslateY = useSharedValue(12);
  const recCardsOpacity = useSharedValue(0);
  const recCardsTranslateY = useSharedValue(12);

  useEffect(() => {
    const springConfig = { damping: 20, stiffness: 120, mass: 0.8 };
    greetingOpacity.value = withTiming(1, { duration: 400 });
    greetingTranslateY.value = withSpring(0, springConfig);
    quickActionsOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    quickActionsTranslateY.value = withDelay(100, withSpring(0, springConfig));
    searchOpacity.value = withDelay(180, withTiming(1, { duration: 400 }));
    searchTranslateY.value = withDelay(180, withSpring(0, springConfig));
    recHeaderOpacity.value = withDelay(260, withTiming(1, { duration: 400 }));
    recHeaderTranslateY.value = withDelay(260, withSpring(0, springConfig));
    recCardsOpacity.value = withDelay(340, withTiming(1, { duration: 500 }));
    recCardsTranslateY.value = withDelay(340, withSpring(0, springConfig));
  }, []);

  const greetingStyle = useAnimatedStyle(() => ({
    opacity: greetingOpacity.value,
    transform: [{ translateY: greetingTranslateY.value }],
  }));
  const quickActionsStyle = useAnimatedStyle(() => ({
    opacity: quickActionsOpacity.value,
    transform: [{ translateY: quickActionsTranslateY.value }],
  }));
  const searchStyle = useAnimatedStyle(() => ({
    opacity: searchOpacity.value,
    transform: [{ translateY: searchTranslateY.value }],
  }));
  const recHeaderStyle = useAnimatedStyle(() => ({
    opacity: recHeaderOpacity.value,
    transform: [{ translateY: recHeaderTranslateY.value }],
  }));
  const recCardsStyle = useAnimatedStyle(() => ({
    opacity: recCardsOpacity.value,
    transform: [{ translateY: recCardsTranslateY.value }],
  }));
  // --- End entrance animations ---

  // 季节强调色，回退到品牌色
  const accentColor = colors.primary;
  const {
    profileCompletionPercent,
    isProfileComplete,
    isBannerDismissed,
    weatherData,
    isLoadingWeather,
    dismissBanner,
    fetchWeather,
    fetchProfileCompletion,
  } = useHomeStore();

  const {
    items: feedItems,
    isLoading: isFeedLoading,
    fetchFeed,
    loadMore,
    hasMore,
  } = useRecommendationFeedStore();

  const [refreshing, setRefreshing] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const locationFetched = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const displayName = user?.nickname || user?.email?.split("@")[0] || "用户";

  useEffect(() => {
    if (locationFetched.current) {
      return;
    }
    locationFetched.current = true;
    Geolocation.getCurrentPosition(
      (position: GeolocationResponse) => {
        if (isMountedRef.current) {
          setCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        }
      },
      () => {
        if (isMountedRef.current) {
          setCoords({ latitude: FALLBACK_LATITUDE, longitude: FALLBACK_LONGITUDE });
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    void fetchProfileCompletion();
    if (coords) {
      void fetchWeather(coords.latitude, coords.longitude);
    }
    void fetchFeed(true);
  }, [fetchProfileCompletion, fetchWeather, fetchFeed, coords]);

  const sections: HomeSection[] = [
    ...BASE_SECTIONS,
    { type: "recommendationHeader" as const },
    ...feedItems.map((item): HomeSection => ({ type: "recommendationItem", item })),
  ];

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchProfileCompletion(),
      coords ? fetchWeather(coords.latitude, coords.longitude) : Promise.resolve(),
      fetchFeed(true),
    ]);
    setRefreshing(false);
  }, [fetchProfileCompletion, fetchWeather, fetchFeed, coords]);

  const handleSearchPress = useCallback(() => {
    navigation.navigate("Search");
  }, [navigation]);

  const handleProfilePress = useCallback(() => {
    navigation.navigate("MainTabs", { screen: "Profile", params: { screen: "ProfileMain" } });
  }, [navigation]);

  const handleAiStylistPress = useCallback(() => {
    navigation.navigate("MainTabs", { screen: "Stylist", params: { screen: "AIStylist" } });
  }, [navigation]);

  const handleVirtualTryOnPress = useCallback(() => {
    navigation.navigate("MainTabs", { screen: "TryOn", params: { screen: "VirtualTryOn" } } as never);
  }, [navigation]);

  const handleWardrobePress = useCallback(() => {
    navigation.navigate("MainTabs", { screen: "Profile", params: { screen: "Wardrobe" } });
  }, [navigation]);

  const handleStyleReportPress = useCallback(() => {
    navigation.navigate("MainTabs", { screen: "Profile", params: { screen: "ProfileMain" } });
  }, [navigation]);

  const handleCartPress = useCallback(() => {
    navigation.navigate("MainTabs", { screen: "Profile", params: { screen: "Cart" } });
  }, [navigation]);

  const handleBannerDismiss = useCallback(() => {
    dismissBanner();
  }, [dismissBanner]);

  const renderItem = useCallback(
    ({ item, index }: { item: HomeSection; index: number }) => {
      switch (item.type) {
        case "greeting":
          return (
            <Animated.View style={greetingStyle}>
              <WeatherGreeting
                userName={displayName}
                weatherData={weatherData}
                isLoading={isLoadingWeather}
              />
            </Animated.View>
          );

        case "banner":
          if (isProfileComplete || isBannerDismissed) {
            return null;
          }
          return (
            <Animated.View style={greetingStyle}>
              <ProfileCompletionBanner
                completionPercent={profileCompletionPercent}
                isComplete={isProfileComplete}
                onDismiss={handleBannerDismiss}
                onContinue={handleProfilePress}
              />
            </Animated.View>
          );

        case "quickActions":
          return (
            <Animated.View style={quickActionsStyle}>
              <QuickActions
                onAiStylist={handleAiStylistPress}
                onVirtualTryOn={handleVirtualTryOnPress}
                onWardrobe={handleWardrobePress}
                onStyleReport={handleStyleReportPress}
                onCart={handleCartPress}
                isStyleReportUnlocked={isProfileComplete}
              />
            </Animated.View>
          );

        case "search":
          return (
            <Animated.View style={searchStyle}>
              <TouchableOpacity
                style={styles.searchBar}
                onPress={handleSearchPress}
                activeOpacity={0.7}
                accessibilityLabel="搜索"
                accessibilityRole="button"
              >
                <Ionicons name="search-outline" size={20} color={colors.textTertiary} />
                <Text style={styles.searchText}>{t.search.placeholder}</Text>
                <Ionicons name="mic-outline" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </Animated.View>
          );

        case "recommendationHeader":
          if (!isRecommendationFeed) {
            return (
              <Animated.View style={recHeaderStyle}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>热门推荐</Text>
                  <TouchableOpacity
                    onPress={() => {}}
                    accessibilityLabel="查看全部推荐"
                    accessibilityRole="button"
                  >
                    <Text style={[styles.sectionMore, { color: accentColor }]}>查看全部</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            );
          }
          return (
            <Animated.View style={recHeaderStyle}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t.home.forYou}</Text>
                <TouchableOpacity
                  onPress={() => {}}
                  accessibilityLabel="查看全部推荐"
                  accessibilityRole="button"
                >
                  <Text style={[styles.sectionMore, { color: accentColor }]}>{t.home.seeAll}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          );

        case "recommendationItem":
          return (
            <Animated.View style={recCardsStyle}>
              <RecommendationCard
                item={(item as { type: "recommendationItem"; item: FeedItem }).item}
                onPress={(feedItem: any) => navigation.navigate("Product", { clothingId: feedItem.id })}
              />
            </Animated.View>
          );

        default:
          return null;
      }
    },
    [
      displayName,
      weatherData,
      isLoadingWeather,
      isProfileComplete,
      isBannerDismissed,
      profileCompletionPercent,
      handleBannerDismiss,
      handleProfilePress,
      handleSearchPress,
      handleAiStylistPress,
      handleVirtualTryOnPress,
      handleWardrobePress,
      handleStyleReportPress,
      handleCartPress,
      isRecommendationFeed,
      accentColor,
      greetingStyle,
      quickActionsStyle,
      searchStyle,
      recHeaderStyle,
      recCardsStyle,
    ]
  );

  return (
    <View style={styles.container}>
      {/* Custom brand refresh indicator overlay */}
      {refreshing && <BrandRefreshIndicator refreshing={refreshing} />}
      <FlashList<HomeSection>
        data={sections}
        renderItem={renderItem}
        estimatedItemSize={120}
        contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (hasMore && !isFeedLoading) {
            void loadMore();
          }
        }}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  listContent: {
    paddingBottom: 120,
    paddingHorizontal: LayoutSpacing.screenPadding,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: DesignTokens.spacing[4],
    paddingVertical: DesignTokens.spacing['3.5'],
    marginVertical: Spacing.md,
    ...DesignTokens.shadows.sm,
  },
  searchText: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.md,
    color: colors.textTertiary,
    marginHorizontal: DesignTokens.spacing['2.5'],
    fontWeight: DesignTokens.typography.fontWeights.regular as TextStyle["fontWeight"],
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: DesignTokens.spacing[5],
    marginBottom: DesignTokens.spacing[3],
  },
  sectionTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: DesignTokens.typography.fontWeights.semibold as TextStyle["fontWeight"],
    color: colors.textPrimary,
  },
  sectionMore: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.primary,
    fontWeight: DesignTokens.typography.fontWeights.medium as TextStyle["fontWeight"],
  },
}))

export default withErrorBoundary(HomeScreen, {
  screenName: "HomeScreen",
  maxRetries: 3,
});

/* eslint-disable @typescript-eslint/no-var-requires */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  type TextStyle,
} from "react-native";
import { useNavigation, CompositeNavigationProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { FlashList } from "@/src/polyfills/flash-list";
import { useHomeStore } from "../stores/homeStore";
import { useAuthStore } from "../../auth/stores/index";
import { useRecommendationFeedStore } from "../stores/recommendationFeedStore";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { withErrorBoundary } from "../../../shared/components/ErrorBoundary";
import { useScreenTracking } from "../../../shared/hooks/useAnalytics";
import { useTranslation } from "../../../i18n";
import { useFeatureFlags } from "../../../contexts/FeatureFlagContext";
import { FeatureFlagKeys } from "../../../constants/feature-flags";
import { WeatherGreeting } from "./components/WeatherGreeting";
import { ProfileCompletionBanner } from "./components/ProfileCompletionBanner";
import QuickActions from "./components/QuickActions";
import { RecommendationCard } from "../components/RecommendationFeedCard";
import type { RootStackParamList, TodayStackParamList } from "../../../types/navigation";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { FeedItem } from "../../../services/api/recommendation-feed.api";
import { flatColors as colors } from "../../../design-system/theme";
import { createStyles } from "../../../shared/contexts/ThemeContext";

type HomeScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<TodayStackParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

const HORIZONTAL_PADDING = 20;

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
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const styles = useStyles(colors);
  useScreenTracking("Home");
  const t = useTranslation();
  const { isEnabled } = useFeatureFlags();
  const isRecommendationFeed = isEnabled(FeatureFlagKeys.RECOMMENDATION_FEED);

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
    try {
      const { PermissionsAndroid } = require("react-native") as {
        PermissionsAndroid: {
          check: (perm: string) => Promise<boolean>;
          PERMISSIONS: { ACCESS_FINE_LOCATION: string };
        };
      };
      const granted = PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      void granted
        .then((_hasPermission: boolean) => {
          if (isMountedRef.current) {
            setCoords({ latitude: FALLBACK_LATITUDE, longitude: FALLBACK_LONGITUDE });
          }
        })
        .catch(() => {
          if (isMountedRef.current) {
            setCoords({ latitude: FALLBACK_LATITUDE, longitude: FALLBACK_LONGITUDE });
          }
        });
    } catch {
      if (isMountedRef.current) {
        setCoords({ latitude: FALLBACK_LATITUDE, longitude: FALLBACK_LONGITUDE });
      }
    }
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
    navigation.navigate("MainTabs", { screen: "Me", params: { screen: "ProfileMain" } });
  }, [navigation]);

  const handleAiStylistPress = useCallback(() => {
    navigation.navigate("MainTabs", { screen: "Stylist", params: { screen: "AIStylist" } });
  }, [navigation]);

  const handleVirtualTryOnPress = useCallback(() => {
    (navigation.navigate as unknown as (route: string, params?: object) => void)("MainTabs", {
      screen: "TryOn",
      params: { screen: "VirtualTryOn" },
    });
  }, [navigation]);

  const handleWardrobePress = useCallback(() => {
    navigation.navigate("MainTabs", { screen: "Discover", params: { screen: "Wardrobe" } });
  }, [navigation]);

  const handleStyleReportPress = useCallback(() => {
    navigation.navigate("MainTabs", { screen: "Me", params: { screen: "ProfileMain" } });
  }, [navigation]);

  const handleCartPress = useCallback(() => {
    navigation.navigate("MainTabs", { screen: "Me", params: { screen: "Cart" } });
  }, [navigation]);

  const handleBannerDismiss = useCallback(() => {
    dismissBanner();
  }, [dismissBanner]);

  const renderItem = useCallback(
    ({ item }: { item: HomeSection }) => {
      switch (item.type) {
        case "greeting":
          return (
            <WeatherGreeting
              userName={displayName}
              weatherData={weatherData}
              isLoading={isLoadingWeather}
            />
          );

        case "banner":
          if (isProfileComplete || isBannerDismissed) {
            return null;
          }
          return (
            <ProfileCompletionBanner
              completionPercent={profileCompletionPercent}
              isComplete={isProfileComplete}
              onDismiss={handleBannerDismiss}
              onContinue={handleProfilePress}
            />
          );

        case "quickActions":
          return (
            <QuickActions
              onAiStylist={handleAiStylistPress}
              onVirtualTryOn={handleVirtualTryOnPress}
              onWardrobe={handleWardrobePress}
              onStyleReport={handleStyleReportPress}
              onCart={handleCartPress}
              isStyleReportUnlocked={isProfileComplete}
            />
          );

        case "search":
          return (
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
          );

        case "recommendationHeader":
          if (!isRecommendationFeed) {
            return (
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
            );
          }
          return (
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
          );

        case "recommendationItem":
          return (
            <RecommendationCard
              item={(item as { type: "recommendationItem"; item: FeedItem }).item}
              onPress={(feedItem) => navigation.navigate("Product", { clothingId: feedItem.id })}
            />
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
      navigation,
      styles.searchBar,
      styles.searchText,
      styles.sectionHeader,
      styles.sectionMore,
      styles.sectionTitle,
      t.home.forYou,
      t.home.seeAll,
      t.search.placeholder,
    ]
  );

  return (
    <View style={styles.container}>
      {/* Custom brand refresh indicator overlay */}
      {refreshing && (
        <View style={styles.refreshOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
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
            onRefresh={() => {
              void handleRefresh();
            }}
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
  refreshOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: "center",
    paddingVertical: 8,
  },
  listContent: {
    paddingBottom: 120,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginVertical: 16,
    ...DesignTokens.shadows.sm,
  },
  searchText: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.md,
    color: colors.textTertiary,
    marginHorizontal: 10,
    fontWeight: DesignTokens.typography.fontWeights.regular as TextStyle["fontWeight"],
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 12,
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
}));

export default withErrorBoundary(HomeScreen, {
  screenName: "HomeScreen",
  maxRetries: 3,
});

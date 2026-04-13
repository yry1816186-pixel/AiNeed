import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  type TextStyle,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { FlashList } from '@/src/polyfills/flash-list';
import { useHomeStore } from '../../stores/homeStore';
import { useAuthStore } from '../../stores/index';
import { useRecommendationFeedStore } from '../../stores/recommendationFeedStore';
import { DesignTokens } from '../../theme/tokens/design-tokens';
import { withErrorBoundary } from '../../components/ErrorBoundary';
import { WeatherGreeting } from './components/WeatherGreeting';
import { ProfileCompletionBanner } from './components/ProfileCompletionBanner';
import QuickActions from './components/QuickActions';
import { RecommendationCard } from '../../components/recommendations/RecommendationFeedCard';
import type { RootStackParamList } from '../../types/navigation';
import type { FeedItem } from '../../services/api/recommendation-feed.api';

const HORIZONTAL_PADDING = 20;

type HomeSection =
  | { type: 'greeting' }
  | { type: 'banner' }
  | { type: 'quickActions' }
  | { type: 'search' }
  | { type: 'recommendationHeader' }
  | { type: 'recommendationItem'; item: FeedItem };

const BASE_SECTIONS: HomeSection[] = [
  { type: 'greeting' },
  { type: 'banner' },
  { type: 'quickActions' },
  { type: 'search' },
];

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
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

  const displayName = user?.nickname || user?.email?.split('@')[0] || '用户';

  useEffect(() => {
    void fetchProfileCompletion();
    void fetchWeather(39.9042, 116.4074);
    void fetchFeed(true);
  }, [fetchProfileCompletion, fetchWeather, fetchFeed]);

  const sections: HomeSection[] = [
    ...BASE_SECTIONS,
    { type: 'recommendationHeader' as const },
    ...feedItems.map((item): HomeSection => ({ type: 'recommendationItem', item })),
  ];

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchProfileCompletion(),
      fetchWeather(39.9042, 116.4074),
      fetchFeed(true),
    ]);
    setRefreshing(false);
  }, [fetchProfileCompletion, fetchWeather, fetchFeed]);

  const handleSearchPress = useCallback(() => {
    navigation.navigate('Explore');
  }, [navigation]);

  const handleProfilePress = useCallback(() => {
    navigation.navigate('Profile');
  }, [navigation]);

  const handleAiStylistPress = useCallback(() => {
    navigation.navigate('AiStylist');
  }, [navigation]);

  const handleVirtualTryOnPress = useCallback(() => {
    navigation.navigate('VirtualTryOn', {});
  }, [navigation]);

  const handleWardrobePress = useCallback(() => {
    navigation.navigate('Wardrobe');
  }, [navigation]);

  const handleStyleReportPress = useCallback(() => {
    navigation.navigate('Profile');
  }, [navigation]);

  const handleBannerDismiss = useCallback(() => {
    dismissBanner();
  }, [dismissBanner]);

  const renderItem = useCallback(
    ({ item }: { item: HomeSection }) => {
      switch (item.type) {
        case 'greeting':
          return (
            <WeatherGreeting
              userName={displayName}
              weatherData={weatherData}
              isLoading={isLoadingWeather}
            />
          );

        case 'banner':
          if (isProfileComplete || isBannerDismissed) return null;
          return (
            <ProfileCompletionBanner
              completionPercent={profileCompletionPercent}
              isComplete={isProfileComplete}
              onDismiss={handleBannerDismiss}
              onContinue={handleProfilePress}
            />
          );

        case 'quickActions':
          return (
            <QuickActions
              onAiStylist={handleAiStylistPress}
              onVirtualTryOn={handleVirtualTryOnPress}
              onWardrobe={handleWardrobePress}
              onStyleReport={handleStyleReportPress}
              isStyleReportUnlocked={isProfileComplete}
            />
          );

        case 'search':
          return (
            <TouchableOpacity
              style={styles.searchBar}
              onPress={handleSearchPress}
              activeOpacity={0.7}
            >
              <Ionicons
                name="search-outline"
                size={20}
                color={DesignTokens.colors.text.tertiary}
              />
              <Text style={styles.searchText}>
                搜索穿搭、单品、风格...
              </Text>
              <Ionicons
                name="mic-outline"
                size={20}
                color={DesignTokens.colors.text.tertiary}
              />
            </TouchableOpacity>
          );

        case 'recommendationHeader':
          return (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>为你推荐</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('RecommendationFeed' as never)}
              >
                <Text style={styles.sectionMore}>查看全部</Text>
              </TouchableOpacity>
            </View>
          );

        case 'recommendationItem':
          return (
            <RecommendationCard
              item={(item as { type: 'recommendationItem'; item: FeedItem }).item}
              onPress={(feedItem) =>
                navigation.navigate('ClothingDetail' as never, { id: feedItem.id } as never)
              }
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
    ],
  );

  return (
    <View style={styles.container}>
      <FlashList<HomeSection>
        data={sections}
        renderItem={renderItem}
        estimatedItemSize={120}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (hasMore && !isFeedLoading) loadMore();
        }}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={DesignTokens.colors.brand.terracotta}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.colors.backgrounds.secondary,
  },
  listContent: {
    paddingBottom: 120,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginVertical: 16,
    ...DesignTokens.shadows.sm,
  },
  searchText: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.md,
    color: DesignTokens.colors.text.tertiary,
    marginHorizontal: 10,
    fontWeight: DesignTokens.typography.fontWeights.regular as TextStyle['fontWeight'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: DesignTokens.typography.fontWeights.semibold as TextStyle['fontWeight'],
    color: DesignTokens.colors.text.primary,
  },
  sectionMore: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.brand.terracotta,
    fontWeight: DesignTokens.typography.fontWeights.medium as TextStyle['fontWeight'],
  },
});

export default withErrorBoundary(HomeScreen, {
  screenName: 'HomeScreen',
  maxRetries: 3,
});

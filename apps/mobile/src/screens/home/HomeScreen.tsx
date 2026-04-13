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
import { DesignTokens } from '../../theme/tokens/design-tokens';
import { withErrorBoundary } from '../../components/ErrorBoundary';
import { WeatherGreeting } from './components/WeatherGreeting';
import { ProfileCompletionBanner } from './components/ProfileCompletionBanner';
import QuickActions from './components/QuickActions';
import type { RootStackParamList } from '../../types/navigation';

const HORIZONTAL_PADDING = 20;

type HomeSection =
  | { type: 'greeting' }
  | { type: 'banner' }
  | { type: 'quickActions' }
  | { type: 'search' }
  | { type: 'recommendationPlaceholder' };

const SECTIONS: HomeSection[] = [
  { type: 'greeting' },
  { type: 'banner' },
  { type: 'quickActions' },
  { type: 'search' },
  { type: 'recommendationPlaceholder' },
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

  const [refreshing, setRefreshing] = useState(false);

  const displayName = user?.nickname || user?.email?.split('@')[0] || '用户';

  useEffect(() => {
    void fetchProfileCompletion();
    void fetchWeather(39.9042, 116.4074);
  }, [fetchProfileCompletion, fetchWeather]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchProfileCompletion(),
      fetchWeather(39.9042, 116.4074),
    ]);
    setRefreshing(false);
  }, [fetchProfileCompletion, fetchWeather]);

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

        case 'recommendationPlaceholder':
          return (
            <View style={styles.placeholderCard}>
              <View style={styles.placeholderIconWrap}>
                <Ionicons
                  name="sparkles-outline"
                  size={32}
                  color={DesignTokens.colors.brand.terracotta}
                />
              </View>
              <Text style={styles.placeholderTitle}>
                个性化推荐即将上线
              </Text>
              <Text style={styles.placeholderSubtitle}>
                完善你的画像，解锁 AI 专属穿搭推荐
              </Text>
            </View>
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
        data={SECTIONS}
        renderItem={renderItem}
        estimatedItemSize={120}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + 16 },
        ]}
        showsVerticalScrollIndicator={false}
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
  placeholderCard: {
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginTop: 8,
    ...DesignTokens.shadows.sm,
  },
  placeholderIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: DesignTokens.colors.backgrounds.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: DesignTokens.typography.fontWeights.semibold as TextStyle['fontWeight'],
    color: DesignTokens.colors.text.primary,
    marginBottom: 8,
  },
  placeholderSubtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.text.tertiary,
    textAlign: 'center',
    lineHeight: DesignTokens.typography.sizes.base * DesignTokens.typography.lineHeights.normal,
  },
});

export default withErrorBoundary(HomeScreen, {
  screenName: 'HomeScreen',
  maxRetries: 3,
});

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { Svg, Path, Circle, Ellipse } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, radius, shadows } from '../../src/theme';
import { Text } from '../../src/components/ui/Text';
import { WeatherGreeting } from '../../src/components/home/WeatherGreeting';
import { TodayRecommendSection } from '../../src/components/home/TodayRecommendCard';
import { QuickActions } from '../../src/components/home/QuickActions';
import {
  useRecommendations,
  useUserAvatar,
  useUserProfile,
  useRefetchRecommendations,
} from '../../src/hooks/useHomeData';
import { useAuthStore } from '../../src/stores/auth.store';
import type { ClothingRecommendation } from '../../src/services/home.service';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const AVATAR_AREA_HEIGHT = Math.round(SCREEN_HEIGHT * 0.4);

function QAvatarPlaceholder({ clothingMap }: { clothingMap?: Record<string, { color: string; type: string; pattern?: string }> | null }) {
  const breatheAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.03,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [breatheAnim]);

  const topColor = clothingMap?.top?.color ?? colors.accent;
  const bottomColor = clothingMap?.bottom?.color ?? colors.primary;

  return (
    <Animated.View
      style={[
        styles.avatarContainer,
        { transform: [{ scale: breatheAnim }] },
      ]}
    >
      <View style={styles.avatarBody}>
        <Svg width="160" height="200" viewBox="0 0 160 200" fill="none">
          <Ellipse cx="80" cy="52" rx="38" ry="42" fill="#FFE4D6" />
          <Circle cx="66" cy="46" r="5" fill="#2D2D44" />
          <Circle cx="94" cy="46" r="5" fill="#2D2D44" />
          <Circle cx="68" cy="44" r="1.8" fill="white" />
          <Circle cx="96" cy="44" r="1.8" fill="white" />
          <Ellipse cx="80" cy="58" rx="3" ry="2" fill="#E8A090" />
          <Path
            d="M74 64C74 64 77 67 80 67C83 67 86 64 86 64"
            stroke="#E8A090"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <Path
            d="M42 30C42 30 50 8 80 8C110 8 118 30 118 30C118 30 120 50 110 55C100 60 92 48 80 48C68 48 60 60 50 55C40 50 42 30 42 30Z"
            fill="#3A2218"
          />
          <Path
            d="M42 95C42 95 38 90 35 95V175C35 180 38 182 42 182H118C122 182 125 180 125 175V95C122 90 118 95 118 95H42Z"
            fill={topColor}
          />
          <Path
            d="M55 182H105V195C105 198 103 200 100 200H60C57 200 55 198 55 195V182Z"
            fill={bottomColor}
          />
          <Path
            d="M35 105H28C25 105 23 107 23 110V140C23 143 25 145 28 145H35V105Z"
            fill={topColor}
          />
          <Path
            d="M125 105H132C135 105 137 107 137 110V140C137 143 135 145 132 145H125V105Z"
            fill={topColor}
          />
        </Svg>
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const {
    data: recommendations = [],
    isLoading: isLoadingRecs,
    refetch: refetchRecs,
  } = useRecommendations();
  const { data: avatarData } = useUserAvatar();
  const { refetch: refetchProfile } = useUserProfile();
  const refetchRecommendations = useRefetchRecommendations();

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([refetchRecs(), refetchProfile(), refetchRecommendations()]);
    setIsRefreshing(false);
  }, [refetchRecs, refetchProfile, refetchRecommendations]);

  const handleRefreshRecommendations = useCallback(() => {
    refetchRecommendations();
  }, [refetchRecommendations]);

  const handleCardPress = useCallback(
    (id: string) => {
      router.push(`/clothing/${id}`);
    },
    [router],
  );

  const handleAvatarPress = useCallback(() => {
    router.push('/(tabs)/wardrobe');
  }, [router]);

  const handleTryOn = useCallback(() => {
    router.push('/tryon');
  }, [router]);

  const handleCustomize = useCallback(() => {
    router.push('/customize/select-product');
  }, [router]);

  const handleCommunity = useCallback(() => {
    router.push('/community');
  }, [router]);

  const handleMore = useCallback(() => {
    router.push('/actions');
  }, [router]);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      <WeatherGreeting
        nickname={user?.nickname}
        avatarUrl={user?.avatarUrl}
      />

      <TouchableOpacity
        style={styles.avatarSection}
        onPress={handleAvatarPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="查看衣橱"
      >
        <QAvatarPlaceholder clothingMap={avatarData?.clothingMap ?? null} />
        <View style={styles.avatarFooter}>
          <View style={styles.outfitTag}>
            <Text variant="caption" color={colors.accent} weight="600">
              今日穿着
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleAvatarPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="编辑穿搭"
          >
            <Svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <Path
                d="M8.5 2.5L11.5 5.5L4 13H1V10L8.5 2.5Z"
                stroke={colors.accent}
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </Svg>
            <Text variant="caption" color={colors.accent} weight="600">
              编辑
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <TodayRecommendSection
        recommendations={recommendations}
        onRefresh={handleRefreshRecommendations}
        onCardPress={handleCardPress}
        isRefreshing={isLoadingRecs}
      />

      <QuickActions
        onTryOn={handleTryOn}
        onCustomize={handleCustomize}
        onCommunity={handleCommunity}
        onMore={handleMore}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  avatarSection: {
    alignItems: 'center',
    minHeight: AVATAR_AREA_HEIGHT,
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBody: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  outfitTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: `${colors.accent}12`,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundSecondary,
  },
});

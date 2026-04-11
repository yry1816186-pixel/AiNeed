import React, { useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Svg, Path, Circle, Ellipse } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, shadows, typography } from '../../src/theme';
import { Text } from '../../src/components/ui/Text';
import { WardrobeFilter } from '../../src/components/wardrobe/WardrobeFilter';
import { WardrobeGrid } from '../../src/components/wardrobe/WardrobeGrid';
import { WardrobeStats } from '../../src/components/wardrobe/WardrobeStats';
import {
  useWardrobeList,
  useWardrobeStats,
  useRemoveFromWardrobe,
  BODY_ZONE_TO_CATEGORY,
  type ClothingCategory,
} from '../../src/hooks/useWardrobe';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const AVATAR_HEIGHT = Math.round(SCREEN_HEIGHT * 0.3);

type BodyZone = 'upper' | 'lower' | 'feet';

function QAvatarWithZones({
  onZonePress,
}: {
  onZonePress: (zone: BodyZone) => void;
}) {
  return (
    <View style={avatarStyles.container}>
      <Svg
        width={AVATAR_HEIGHT * 0.65}
        height={AVATAR_HEIGHT}
        viewBox="0 0 120 180"
        fill="none"
      >
        <TouchableOpacity onPressIn={() => onZonePress('upper')} style={avatarStyles.zoneUpper}>
          <View />
        </TouchableOpacity>
        <TouchableOpacity onPressIn={() => onZonePress('lower')} style={avatarStyles.zoneLower}>
          <View />
        </TouchableOpacity>
        <TouchableOpacity onPressIn={() => onZonePress('feet')} style={avatarStyles.zoneFeet}>
          <View />
        </TouchableOpacity>

        <Circle cx="60" cy="28" r="22" fill={colors.accentLight} />
        <Circle cx="52" cy="24" r="2.5" fill="white" />
        <Circle cx="68" cy="24" r="2.5" fill="white" />
        <Path
          d="M55 33C55 33 57 35 60 35C63 35 65 33 65 33"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <Path
          d="M38 12C38 12 42 4 60 4C78 4 82 12 82 12"
          fill={colors.accent}
        />
        <Path
          d="M36 55L30 110H90L84 55C84 55 78 50 60 50C42 50 36 55 36 55Z"
          fill={colors.accent}
        />
        <Path
          d="M32 110L28 140H92L88 110H32Z"
          fill={colors.primaryLight}
        />
        <Path
          d="M30 140L26 170H94L90 140H30Z"
          fill={colors.gray600}
        />
        <Ellipse cx="42" cy="172" rx="14" ry="5" fill={colors.gray700} />
        <Ellipse cx="78" cy="172" rx="14" ry="5" fill={colors.gray700} />
      </Svg>
      <Text variant="caption" color={colors.textTertiary} style={avatarStyles.hint}>
        点击形象切换分类
      </Text>
    </View>
  );
}

export default function WardrobeScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<ClothingCategory | null>(null);
  const [page, setPage] = useState(1);
  const [statsVisible, setStatsVisible] = useState(false);

  const { data, isLoading, isRefetching, refetch } = useWardrobeList({
    page,
    limit: 20,
    category: selectedCategory ?? undefined,
  });

  const { data: stats } = useWardrobeStats();
  const removeMutation = useRemoveFromWardrobe();

  const handleZonePress = useCallback((zone: BodyZone) => {
    const category = BODY_ZONE_TO_CATEGORY[zone];
    setSelectedCategory((prev) => (prev === category ? null : category));
  }, []);

  const handleFilterSelect = useCallback((category: ClothingCategory | null) => {
    setSelectedCategory(category);
    setPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    setPage(1);
    refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (data && page * 20 < data.total) {
      setPage((p) => p + 1);
    }
  }, [data, page]);

  const handleItemPress = useCallback(
    (item: { clothingId: string }) => {
      router.push(`/clothing/${item.clothingId}` as `${string}`);
    },
    [router],
  );

  const handleItemRemove = useCallback(
    (id: string) => {
      removeMutation.mutate(id);
    },
    [removeMutation],
  );

  const handleAdd = useCallback(() => {
    router.push('/clothing' as `${string}`);
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text variant="h2" style={styles.title}>
          我的衣橱
        </Text>
        <View style={styles.topActions}>
          <TouchableOpacity
            onPress={() => setStatsVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="查看统计"
          >
            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <Path
                d="M4 14H8V20H4V14Z"
                fill={colors.textSecondary}
              />
              <Path
                d="M10 8H14V20H10V8Z"
                fill={colors.textSecondary}
              />
              <Path
                d="M16 4H20V20H16V4Z"
                fill={colors.textSecondary}
              />
            </Svg>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleAdd}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="添加服装"
          >
            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 5V19M5 12H19"
                stroke={colors.accent}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>

      <QAvatarWithZones onZonePress={handleZonePress} />

      <WardrobeFilter
        selected={selectedCategory}
        onSelect={handleFilterSelect}
      />

      <View style={styles.gridContainer}>
        <WardrobeGrid
          items={data?.items ?? []}
          isLoading={isLoading}
          isRefetching={isRefetching}
          onRefresh={handleRefresh}
          onLoadMore={handleLoadMore}
          hasNextPage={data ? page * 20 < data.total : false}
          onItemPress={handleItemPress}
          onItemRemove={handleItemRemove}
        />
      </View>

      <TouchableOpacity
        style={styles.fab}
        onPress={handleAdd}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="添加服装"
      >
        <Svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <Path
            d="M14 5V23M5 14H23"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </Svg>
      </TouchableOpacity>

      <WardrobeStats
        visible={statsVisible}
        stats={stats}
        onClose={() => setStatsVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    lineHeight: typography.h2.lineHeight,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  gridContainer: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xxl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fab,
  },
});

const avatarStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    position: 'relative',
  },
  hint: {
    marginTop: spacing.xs,
  },
  zoneUpper: {
    position: 'absolute',
    top: AVATAR_HEIGHT * 0.22,
    left: '15%',
    right: '15%',
    height: AVATAR_HEIGHT * 0.35,
    zIndex: 2,
  },
  zoneLower: {
    position: 'absolute',
    top: AVATAR_HEIGHT * 0.57,
    left: '15%',
    right: '15%',
    height: AVATAR_HEIGHT * 0.2,
    zIndex: 2,
  },
  zoneFeet: {
    position: 'absolute',
    top: AVATAR_HEIGHT * 0.77,
    left: '15%',
    right: '15%',
    height: AVATAR_HEIGHT * 0.2,
    zIndex: 2,
  },
});

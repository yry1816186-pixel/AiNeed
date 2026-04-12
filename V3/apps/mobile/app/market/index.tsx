import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Image,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, shadows, typography } from '../../src/theme';
import { Text } from '../../src/components/ui/Text';
import { Loading } from '../../src/components/ui/Loading';
import { Empty } from '../../src/components/ui/Empty';
import {
  useDesignList,
  useToggleLike,
} from '../../src/hooks/useDesignMarket';
import {
  PRODUCT_TYPE_LABELS,
  type DesignListItem,
  type MarketSortOption,
} from '../../src/services/design-market.service';

const SCREEN_WIDTH = Dimensions.get('window').width;
const COLUMN_GAP = spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - COLUMN_GAP) / 2;

const SORT_TABS: { key: MarketSortOption; label: string }[] = [
  { key: 'newest', label: '最新' },
  { key: 'popular', label: '最热' },
];

const PRODUCT_FILTERS: { key: string; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'tshirt', label: 'T恤' },
  { key: 'hoodie', label: '卫衣' },
  { key: 'cap', label: '帽子' },
  { key: 'bag', label: '包包' },
  { key: 'phone_case', label: '手机壳' },
];

function DesignCard({
  design,
  onPress,
  onLike,
}: {
  design: DesignListItem;
  onPress: () => void;
  onLike: () => void;
}) {
  const imageHeight = CARD_WIDTH * 1.2;

  return (
    <TouchableOpacity
      style={[styles.card, shadows.card]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={design.name}
    >
      <View style={[styles.cardImageContainer, { height: imageHeight }]}>
        {design.previewImageUrl ? (
          <Image
            source={{ uri: design.previewImageUrl }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text variant="caption" color={colors.textTertiary}>
              {PRODUCT_TYPE_LABELS[design.productType] ?? design.productType}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.likeButton}
          onPress={onLike}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={design.isLiked ? '取消点赞' : '点赞'}
        >
          <Text variant="caption" color={design.isLiked ? colors.accent : colors.white}>
            {design.isLiked ? '♥' : '♡'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.cardContent}>
        <Text
          variant="body2"
          weight="500"
          numberOfLines={2}
          style={styles.cardTitle}
        >
          {design.name}
        </Text>
        <View style={styles.cardFooter}>
          <View style={styles.designerRow}>
            {design.designer.avatarUrl ? (
              <Image
                source={{ uri: design.designer.avatarUrl }}
                style={styles.designerAvatar}
              />
            ) : (
              <View style={styles.designerAvatarPlaceholder} />
            )}
            <Text variant="caption" color={colors.textTertiary} numberOfLines={1}>
              {design.designer.nickname ?? '匿名设计师'}
            </Text>
          </View>
          <Text variant="caption" color={colors.textTertiary}>
            ♥ {design.likesCount}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function DesignMarketScreen() {
  const router = useRouter();
  const [activeSort, setActiveSort] = useState<MarketSortOption>('newest');
  const [activeProduct, setActiveProduct] = useState('');
  const toggleLike = useToggleLike();

  const { data, isLoading, isError, refetch, isFetching } = useDesignList({
    sort: activeSort,
    product_type: activeProduct || undefined,
    limit: 20,
  });

  const designs = data?.items ?? [];

  const leftColumn = useRef<DesignListItem[]>([]);
  const rightColumn = useRef<DesignListItem[]>([]);

  const splitColumns = useCallback((items: DesignListItem[]) => {
    const left: DesignListItem[] = [];
    const right: DesignListItem[] = [];
    items.forEach((item, i) => {
      if (i % 2 === 0) left.push(item);
      else right.push(item);
    });
    leftColumn.current = left;
    rightColumn.current = right;
    return { left, right };
  }, []);

  const columns = splitColumns(designs);

  const handleDesignPress = (designId: string) => {
    router.push(`/market/${designId}`);
  };

  const handleLike = (designId: string) => {
    toggleLike.mutate(designId);
  };

  const renderColumn = (items: DesignListItem[]) => (
    <View style={styles.column}>
      {items.map((design) => (
        <DesignCard
          key={design.id}
          design={design}
          onPress={() => handleDesignPress(design.id)}
          onLike={() => handleLike(design.id)}
        />
      ))}
    </View>
  );

  if (isLoading) {
    return <Loading variant="fullscreen" message="加载市集内容..." />;
  }

  if (isError) {
    return (
      <Empty
        title="加载失败"
        description="请检查网络后重试"
        actionLabel="重试"
        onAction={() => refetch()}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text variant="h2" weight="700" style={styles.headerTitle}>
          设计市集
        </Text>
        <Text variant="body2" color={colors.textTertiary}>
          发现免费设计，用灵感定制你的专属
        </Text>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.sortRow}>
          {SORT_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveSort(tab.key)}
              style={[
                styles.sortTab,
                activeSort === tab.key && styles.sortTabActive,
              ]}
              activeOpacity={0.7}
            >
              <Text
                variant="body2"
                weight={activeSort === tab.key ? '600' : '400'}
                color={activeSort === tab.key ? colors.accent : colors.textSecondary}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.productRow}>
          {PRODUCT_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              onPress={() => setActiveProduct(filter.key)}
              style={[
                styles.productTab,
                activeProduct === filter.key && styles.productTabActive,
              ]}
              activeOpacity={0.7}
            >
              <Text
                variant="caption"
                weight={activeProduct === filter.key ? '600' : '400'}
                color={activeProduct === filter.key ? colors.accent : colors.textTertiary}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={[columns]}
        keyExtractor={() => 'columns'}
        renderItem={() => (
          <View style={styles.masonryContainer}>
            {renderColumn(columns.left)}
            {renderColumn(columns.right)}
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <Empty
            title="暂无设计"
            description="成为第一个分享设计的人吧"
          />
        }
        contentContainerStyle={designs.length === 0 ? styles.emptyContainer : styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  headerTitle: {
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  filterContainer: {
    backgroundColor: colors.background,
    paddingBottom: spacing.md,
  },
  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sortTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.gray50,
  },
  sortTabActive: {
    backgroundColor: colors.accent + '15',
  },
  productRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  productTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.gray50,
  },
  productTabActive: {
    backgroundColor: colors.accent + '15',
  },
  masonryContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: COLUMN_GAP,
    paddingTop: spacing.md,
  },
  column: {
    flex: 1,
    gap: spacing.md,
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundCard,
    overflow: 'hidden',
  },
  cardImageContainer: {
    width: '100%',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  cardTitle: {
    color: colors.textPrimary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  designerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  designerAvatar: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
  },
  designerAvatarPlaceholder: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    backgroundColor: colors.gray200,
  },
  listContainer: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flexGrow: 1,
  },
});

import React, { useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  StyleSheet,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, radius, shadows } from '../../src/theme';
import { Text } from '../../src/components/ui/Text';
import { Badge } from '../../src/components/ui/Badge';
import { Loading } from '../../src/components/ui/Loading';
import { Empty } from '../../src/components/ui/Empty';
import {
  bespokeService,
  STUDIO_SPECIALTIES,
  STUDIO_PRICE_RANGES,
  PRICE_RANGE_LABELS,
  type BespokeStudio,
  type StudioSortOption,
} from '../../src/services/bespoke.service';

const SORT_OPTIONS: { key: StudioSortOption; label: string }[] = [
  { key: 'rating_desc', label: '评分最高' },
  { key: 'review_count_desc', label: '评价最多' },
  { key: 'order_count_desc', label: '订单最多' },
  { key: 'newest', label: '最新入驻' },
];

export default function BespokeIndexScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<StudioSortOption>('rating_desc');
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['bespoke-studios', selectedSpecialty, selectedPriceRange, sortBy, page],
    queryFn: () =>
      bespokeService.getStudios({
        page,
        limit: 20,
        city: searchText || undefined,
        specialties: selectedSpecialty ?? undefined,
        priceRange: selectedPriceRange ?? undefined,
        sort: sortBy,
      }),
  });

  const handleStudioPress = useCallback(
    (id: string) => {
      router.push(`/bespoke/${id}`);
    },
    [router],
  );

  const handleSpecialtyPress = useCallback((specialty: string) => {
    setSelectedSpecialty((prev) => (prev === specialty ? null : specialty));
    setPage(1);
  }, []);

  const handlePriceRangePress = useCallback((range: string) => {
    setSelectedPriceRange((prev) => (prev === range ? null : range));
    setPage(1);
  }, []);

  const handleSortChange = useCallback((sort: StudioSortOption) => {
    setSortBy(sort);
    setPage(1);
  }, []);

  const handleSearch = useCallback(() => {
    setPage(1);
    refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (data?.meta && page < data.meta.totalPages) {
      setPage((prev) => prev + 1);
    }
  }, [data?.meta, page]);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200) {
        handleLoadMore();
      }
    },
    [handleLoadMore],
  );

  const renderStudio = useCallback(
    ({ item }: ListRenderItemInfo<BespokeStudio>) => (
      <TouchableOpacity
        style={studioStyles.card}
        onPress={() => handleStudioPress(item.id)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`查看 ${item.name} 工作室详情`}
      >
        {item.coverImageUrl ? (
          <Image source={{ uri: item.coverImageUrl }} style={studioStyles.coverImage} />
        ) : (
          <View style={studioStyles.coverPlaceholder}>
            <Text variant="h2" color={colors.white}>
              {item.name.charAt(0)}
            </Text>
          </View>
        )}
        <View style={studioStyles.info}>
          <View style={studioStyles.headerRow}>
            {item.logoUrl ? (
              <Image source={{ uri: item.logoUrl }} style={studioStyles.logo} />
            ) : (
              <View style={studioStyles.logoPlaceholder}>
                <Text variant="caption" color={colors.accent} weight="600">
                  {item.name.charAt(0)}
                </Text>
              </View>
            )}
            <View style={studioStyles.nameCol}>
              <View style={studioStyles.nameRow}>
                <Text variant="body" weight="600" numberOfLines={1} style={studioStyles.name}>
                  {item.name}
                </Text>
                {item.isVerified && (
                  <Badge label="认证" variant="info" size="small" />
                )}
              </View>
              {item.city && (
                <Text variant="caption" color={colors.textTertiary}>
                  {item.city}
                </Text>
              )}
            </View>
          </View>
          <View style={studioStyles.tagRow}>
            {item.specialties.slice(0, 3).map((s) => (
              <Badge key={s} label={s} variant="default" size="small" />
            ))}
          </View>
          <View style={studioStyles.statsRow}>
            <Text variant="caption" color={colors.accent} weight="600">
              ★ {item.rating.toFixed(1)}
            </Text>
            <Text variant="caption" color={colors.textTertiary}>
              {item.reviewCount}条评价
            </Text>
            {item.priceRange && (
              <Text variant="caption" color={colors.textTertiary}>
                {PRICE_RANGE_LABELS[item.priceRange] ?? item.priceRange}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    ),
    [handleStudioPress],
  );

  if (isLoading) {
    return <Loading variant="fullscreen" message="加载工作室列表..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索城市..."
          placeholderTextColor={colors.textTertiary}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          accessibilityLabel="搜索城市"
        />
      </View>

      <View style={styles.filterSection}>
        <Text variant="caption" color={colors.textTertiary} style={styles.filterLabel}>
          专长
        </Text>
        <View style={styles.filterRow}>
          {STUDIO_SPECIALTIES.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => handleSpecialtyPress(s)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedSpecialty === s }}
            >
              <Badge
                label={s}
                variant={selectedSpecialty === s ? 'accent' : 'default'}
                size="small"
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.filterSection}>
        <Text variant="caption" color={colors.textTertiary} style={styles.filterLabel}>
          价格
        </Text>
        <View style={styles.filterRow}>
          {STUDIO_PRICE_RANGES.map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => handlePriceRangePress(r)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedPriceRange === r }}
            >
              <Badge
                label={PRICE_RANGE_LABELS[r]}
                variant={selectedPriceRange === r ? 'accent' : 'default'}
                size="small"
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            onPress={() => handleSortChange(opt.key)}
            style={[styles.sortBtn, sortBy === opt.key && styles.sortBtnActive]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: sortBy === opt.key }}
          >
            <Text
              variant="caption"
              weight={sortBy === opt.key ? '600' : '400'}
              color={sortBy === opt.key ? colors.accent : colors.textSecondary}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={data?.items ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderStudio}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Empty title="暂无工作室" description="试试调整筛选条件" />
        }
        ListFooterComponent={
          isFetching ? <Loading variant="inline" message="加载更多..." /> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchInput: {
    height: 40,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    fontSize: 14,
    color: colors.textPrimary,
  },
  filterSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  filterLabel: {
    marginBottom: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  sortBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  sortBtnActive: {
    backgroundColor: colors.accentLight + '20',
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  separator: {
    height: spacing.md,
  },
});

const studioStyles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.lg,
    ...shadows.card,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    resizeMode: 'cover',
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameCol: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});

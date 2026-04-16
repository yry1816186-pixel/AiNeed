import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  FlatList,
} from "react-native";
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import type { ClothingItem, ClothingCategory, Season, Occasion } from '../../../types/clothing';
import { CATEGORY_LABELS, SEASON_LABELS, OCCASION_LABELS } from '../../../types/clothing';
import { Spacing } from '../../../design-system/theme';


const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
export const CATEGORIES: ClothingCategory[] = [
  "tops",
  "bottoms",
  "dresses",
  "outerwear",
  "shoes",
  "accessories",
  "activewear",
  "formal",
];
export const SEASONS: Season[] = ["spring", "summer", "fall", "winter"];
export const OCCASIONS: Occasion[] = ["everyday", "work", "date", "party", "travel", "gym"];

export const PRICE_RANGES = [
  { label: "¥0-99", min: 0, max: 99 },
  { label: "¥100-299", min: 100, max: 299 },
  { label: "¥300-599", min: 300, max: 599 },
  { label: "¥600-999", min: 600, max: 999 },
  { label: "¥1000+", min: 1000, max: undefined },
] as const;

export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export function getCategoryIcon(category: ClothingCategory): string {
  const icons: Record<ClothingCategory, string> = {
    tops: "shirt-outline",
    bottoms: "remove-outline",
    dresses: "female-outline",
    outerwear: "resize-outline",
    shoes: "footsteps-outline",
    accessories: "watch-outline",
    activewear: "fitness-outline",
    formal: "briefcase-outline",
    underwear: "layers-outline",
    swimwear: "water-outline",
    sleepwear: "moon-outline",
    other: "help-circle-outline",
  };

  return icons[category] ?? "shirt-outline";
}

interface FilterChipGroupProps<T extends string> {
  title: string;
  items: T[];
  labels: Record<T, string>;
  selected: T | null;
  onSelect: (value: T | null) => void;
}

function FilterChipGroup<T extends string>({
  title,
  items,
  labels,
  selected,
  onSelect,
}: FilterChipGroupProps<T>) {
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterGroupTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.filterChip, !selected && styles.filterChipActive]}
          onPress={() => onSelect(null)}
        >
          <Text style={[styles.filterChipText, !selected && styles.filterChipTextActive]}>
            全部
          </Text>
        </TouchableOpacity>
        {items.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.filterChip, selected === item && styles.filterChipActive]}
            onPress={() => onSelect(selected === item ? null : item)}
          >
            <Text style={[styles.filterChipText, selected === item && styles.filterChipTextActive]}>
              {labels[item]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

interface FilterPanelProps {
  showFilters: boolean;
  selectedCategory: ClothingCategory | null;
  selectedSeason: Season | null;
  selectedOccasion: Occasion | null;
  selectedPriceRange: number | null;
  selectedSizes: string[];
  hasActiveFilters: boolean;
  setSelectedCategory: (v: ClothingCategory | null) => void;
  setSelectedSeason: (v: Season | null) => void;
  setSelectedOccasion: (v: Occasion | null) => void;
  setSelectedPriceRange: (v: number | null) => void;
  setSelectedSizes: (v: string[]) => void;
  onClearFilters: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = React.memo(function FilterPanel({
  showFilters,
  selectedCategory,
  selectedSeason,
  selectedOccasion,
  selectedPriceRange,
  selectedSizes,
  hasActiveFilters,
  setSelectedCategory,
  setSelectedSeason,
  setSelectedOccasion,
  setSelectedPriceRange,
  setSelectedSizes,
  onClearFilters,
}) {
    const { colors } = useTheme();
  if (!showFilters) {
    return null;
  }

  return (
    <View style={styles.filterPanel}>
      <FilterChipGroup
        title="分类"
        items={CATEGORIES}
        labels={CATEGORY_LABELS as Record<ClothingCategory, string>}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />
      <FilterChipGroup
        title="季节"
        items={SEASONS}
        labels={SEASON_LABELS as Record<Season, string>}
        selected={selectedSeason}
        onSelect={setSelectedSeason}
      />
      <FilterChipGroup
        title="场合"
        items={OCCASIONS}
        labels={OCCASION_LABELS as Record<Occasion, string>}
        selected={selectedOccasion}
        onSelect={setSelectedOccasion}
      />

      <View style={styles.filterGroup}>
        <Text style={styles.filterGroupTitle}>价格</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, selectedPriceRange === null && styles.filterChipActive]}
            onPress={() => setSelectedPriceRange(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedPriceRange === null && styles.filterChipTextActive,
              ]}
            >
              全部
            </Text>
          </TouchableOpacity>
          {PRICE_RANGES.map((range, index) => (
            <TouchableOpacity
              key={range.label}
              style={[styles.filterChip, selectedPriceRange === index && styles.filterChipActive]}
              onPress={() => setSelectedPriceRange(selectedPriceRange === index ? null : index)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedPriceRange === index && styles.filterChipTextActive,
                ]}
              >
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterGroup}>
        <Text style={styles.filterGroupTitle}>尺码</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, selectedSizes.length === 0 && styles.filterChipActive]}
            onPress={() => setSelectedSizes([])}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedSizes.length === 0 && styles.filterChipTextActive,
              ]}
            >
              全部
            </Text>
          </TouchableOpacity>
          {SIZE_OPTIONS.map((size) => (
            <TouchableOpacity
              key={size}
              style={[styles.filterChip, selectedSizes.includes(size) && styles.filterChipActive]}
              onPress={() => {
                setSelectedSizes(
                  selectedSizes.includes(size)
                    ? selectedSizes.filter((s) => s !== size)
                    : [...selectedSizes, size]
                );
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedSizes.includes(size) && styles.filterChipTextActive,
                ]}
              >
                {size}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {hasActiveFilters ? (
        <TouchableOpacity style={styles.clearAllFilters} onPress={onClearFilters}>
          <Ionicons name="close-circle-outline" size={16} color={colors.textTertiary} />
          <Text style={styles.clearAllFiltersText}>清除全部筛选</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

interface ActiveFilterPillsProps {
  selectedCategory: ClothingCategory | null;
  selectedSeason: Season | null;
  selectedOccasion: Occasion | null;
  setSelectedCategory: (v: ClothingCategory | null) => void;
  setSelectedSeason: (v: Season | null) => void;
  setSelectedOccasion: (v: Occasion | null) => void;
}

export const ActiveFilterPills: React.FC<ActiveFilterPillsProps> = React.memo(
  function ActiveFilterPills({
    selectedCategory,
    selectedSeason,
    selectedOccasion,
    setSelectedCategory,
    setSelectedSeason,
    setSelectedOccasion,
  }) {
    if (!selectedCategory && !selectedSeason && !selectedOccasion) {
      return null;
    }

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFilters}>
        {selectedCategory ? (
          <TouchableOpacity
            style={styles.activeFilterPill}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={styles.activeFilterPillText}>{CATEGORY_LABELS[selectedCategory]}</Text>
            <Ionicons name="close" size={14} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
        {selectedSeason ? (
          <TouchableOpacity style={styles.activeFilterPill} onPress={() => setSelectedSeason(null)}>
            <Text style={styles.activeFilterPillText}>{SEASON_LABELS[selectedSeason]}</Text>
            <Ionicons name="close" size={14} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
        {selectedOccasion ? (
          <TouchableOpacity
            style={styles.activeFilterPill}
            onPress={() => setSelectedOccasion(null)}
          >
            <Text style={styles.activeFilterPillText}>{OCCASION_LABELS[selectedOccasion]}</Text>
            <Ionicons name="close" size={14} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    );
  }
);

interface ResultCardProps {
  item: ClothingItem;
  onPress: (item: ClothingItem) => void;
}

export const ResultCard: React.FC<ResultCardProps> = React.memo(function ResultCard({
  item,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      activeOpacity={0.72}
      accessibilityLabel={`${item.name || "未命名单品"}, ${
        CATEGORY_LABELS[item.category as ClothingCategory] || item.category
      }`}
      accessibilityRole="button"
    >
      {item.thumbnailUri || item.imageUri ? (
        <Image
          source={{ uri: item.thumbnailUri || item.imageUri }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.cardPlaceholder}>
          <Ionicons name="shirt-outline" size={32} color={colors.textTertiary} />
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name || "未命名单品"}
        </Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardCategory}>
            {CATEGORY_LABELS[item.category as ClothingCategory] || item.category}
          </Text>
          {item.brand ? (
            <Text style={styles.cardBrand} numberOfLines={1}>
              {item.brand}
            </Text>
          ) : null}
        </View>
        {item.color ? (
          <View style={styles.colorRow}>
            <View
              style={[
                styles.colorDot,
                item.colorHex ? { backgroundColor: item.colorHex } : undefined,
              ]}
            />
            <Text style={styles.cardColor}>{item.color}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

interface EmptySearchStateProps {
  query: string;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export const EmptySearchState: React.FC<EmptySearchStateProps> = React.memo(
  function EmptySearchState({ query, hasActiveFilters, onClearFilters }) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={64} color={colors.border} />
        <Text style={styles.emptyTitle}>未找到结果</Text>
        <Text style={styles.emptySubtitle}>
          {query.trim() ? `没有找到与“${query.trim()}”相关的单品` : "试试调整筛选条件"}
        </Text>
        {hasActiveFilters ? (
          <TouchableOpacity style={styles.clearFiltersButton} onPress={onClearFilters}>
            <Text style={styles.clearFiltersText}>清除筛选条件</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }
);

interface QuickBrowseGridProps {
  onCategorySelect: (cat: ClothingCategory) => void;
}

function QuickBrowseGrid({ onCategorySelect }: QuickBrowseGridProps) {
  return (
    <View style={styles.quickGrid}>
      {CATEGORIES.slice(0, 8).map((cat) => (
        <TouchableOpacity key={cat} style={styles.quickItem} onPress={() => onCategorySelect(cat)}>
          <View style={styles.quickIcon}>
            <Ionicons name={getCategoryIcon(cat)} size={24} color={colors.primary} />
          </View>
          <Text style={styles.quickLabel}>{CATEGORY_LABELS[cat]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

interface SearchSuggestionsProps {
  history: string[];
  trending: string[];
  isRefreshing: boolean;
  onTagPress: (tag: string) => void;
  onClearHistory: () => void;
  onRefresh: () => void;
  onCategorySelect: (cat: ClothingCategory) => void;
}

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = React.memo(
  function SearchSuggestions({
    history,
    trending,
    isRefreshing,
    onTagPress,
    onClearHistory,
    onRefresh,
    onCategorySelect,
  }) {
    return (
      <ScrollView
        style={styles.suggestionContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {history.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>搜索历史</Text>
              <TouchableOpacity onPress={onClearHistory}>
                <Text style={styles.clearText}>清除</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tags}>
              {history.map((term, index) => (
                <TouchableOpacity
                  key={`history-${index}`}
                  style={styles.tag}
                  onPress={() => onTagPress(term)}
                >
                  <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.tagText}>{term}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        {trending.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>热门搜索</Text>
            <View style={styles.tags}>
              {trending.map((term, index) => (
                <TouchableOpacity
                  key={`trending-${index}`}
                  style={styles.tag}
                  onPress={() => onTagPress(term)}
                >
                  <Ionicons name="trending-up-outline" size={14} color={colors.primary} />
                  <Text style={styles.tagText}>{term}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>快速浏览</Text>
          <QuickBrowseGrid onCategorySelect={onCategorySelect} />
        </View>
      </ScrollView>
    );
  }
);

interface SearchResultListProps {
  results: ClothingItem[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onItemPress: (item: ClothingItem) => void;
  emptyContent: React.ReactElement | React.ComponentType<any> | null | undefined;
}

export const SearchResultList: React.FC<SearchResultListProps> = React.memo(
  function SearchResultList({ results, isRefreshing, onRefresh, onItemPress, emptyContent }) {
    return (
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ResultCard item={item} onPress={onItemPress} />}
        numColumns={2}
        columnWrapperStyle={results.length > 1 ? styles.row : undefined}
        contentContainerStyle={results.length === 0 ? styles.emptyList : styles.resultList}
        ListEmptyComponent={emptyContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    );
  }
);

export const LoadingOverlay: React.FC = React.memo(function LoadingOverlay() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>搜索中...</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  filterPanel: {
    backgroundColor: colors.surface,
    paddingHorizontal: DesignTokens.spacing[5],
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterGroup: {
    marginTop: DesignTokens.spacing[3],
  },
  filterGroupTitle: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: DesignTokens.spacing['3.5'],
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.divider,
    marginRight: Spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.surface,
    fontWeight: "500",
  },
  clearAllFilters: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    marginTop: DesignTokens.spacing[3],
    paddingVertical: Spacing.sm,
  },
  clearAllFiltersText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
  },
  activeFilters: {
    flex: 1,
  },
  activeFilterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: colors.cartLight,
    borderRadius: 12,
    paddingHorizontal: DesignTokens.spacing['2.5'],
    paddingVertical: Spacing.xs,
    marginRight: DesignTokens.spacing['1.5'],
  },
  activeFilterPillText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.primary,
    fontWeight: "500",
  },
  suggestionContent: {
    flex: 1,
    padding: DesignTokens.spacing[5],
  },
  section: {
    marginBottom: DesignTokens.spacing[7],
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: DesignTokens.spacing[3],
  },
  sectionTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: DesignTokens.spacing[3],
  },
  clearText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textTertiary,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: colors.cartLight,
    borderRadius: 16,
    paddingHorizontal: DesignTokens.spacing['3.5'],
    paddingVertical: Spacing.sm,
  },
  tagText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.primary,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: DesignTokens.spacing['3.5'],
  },
  quickItem: {
    width: (SCREEN_WIDTH - 68) / 4,
    alignItems: "center",
    gap: Spacing.sm,
  },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.backgroundTertiary, // custom color
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
  row: {
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
  },
  resultList: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  emptyList: {
    flexGrow: 1,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: Spacing.md,
    shadowColor: colors.neutral[900],
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: DesignTokens.spacing['1.5'] },
    elevation: 3,
  },
  cardImage: {
    width: "100%",
    height: CARD_WIDTH * 1.18,
  },
  cardPlaceholder: {
    width: "100%",
    height: CARD_WIDTH * 1.18,
    backgroundColor: DesignTokens.colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    padding: DesignTokens.spacing[3],
    gap: Spacing.xs,
  },
  cardName: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cardCategory: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.primary,
  },
  cardBrand: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
    flex: 1,
    textAlign: "right",
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing['1.5'],
    marginTop: DesignTokens.spacing['0.5'],
  },
  colorDot: {
    width: DesignTokens.spacing['2.5'],
    height: DesignTokens.spacing['2.5'],
    borderRadius: 5,
    backgroundColor: DesignTokens.colors.neutral[300],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DesignTokens.colors.neutral[400],
  },
  cardColor: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['4xl'],
  },
  emptyTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  clearFiltersButton: {
    marginTop: DesignTokens.spacing[4],
    paddingHorizontal: DesignTokens.spacing[4],
    paddingVertical: DesignTokens.spacing['2.5'],
    borderRadius: 20,
    backgroundColor: colors.cartLight,
  },
  clearFiltersText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: DesignTokens.spacing[3],
  },
  loadingText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
  },
});

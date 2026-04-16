import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useScreenTracking } from "../hooks/useAnalytics";
import { useTranslation } from "../i18n";
import { theme } from '../design-system/theme';
import { clothingApi } from "../services/api/clothing.api";
import { outfitApi } from "../services/api/outfit.api";
import { ClothingItem, ClothingCategory, CATEGORY_LABELS } from "../types/clothing";
import type { RootStackParamList } from "../types/navigation";
import { ImportSheet } from "../components/wardrobe/ImportSheet";
import { DesignTokens } from "../design-system/theme";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const PAGE_SIZE = 20;

const ALL_CATEGORIES = Object.entries(CATEGORY_LABELS) as [ClothingCategory, string][];

interface WardrobeStats {
  clothingTotal: number;
  outfitTotal: number;
  byCategory: Record<string, number>;
}

/**
 * 服装卡片组件 - 使用 React.memo 优化
 * 避免父组件状态变化时不必要的重渲染
 */
interface ClothingGridItemProps {
  item: ClothingItem;
  onPress: (item: ClothingItem) => void;
}

const ClothingGridItem = memo(function ClothingGridItem({ item, onPress }: ClothingGridItemProps) {
  const imageSource = item.thumbnailUri || item.imageUri;
  const categoryLabel = CATEGORY_LABELS[item.category] || item.category;

  return (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
      accessibilityLabel={`${item.name || categoryLabel}, ${categoryLabel}`}
      accessibilityRole="button"
    >
      <View style={styles.gridItemImageContainer}>
        {imageSource ? (
          <Image source={{ uri: imageSource }} style={styles.gridItemImage} resizeMode="cover" />
        ) : (
          <View style={styles.gridItemPlaceholder}>
            <Ionicons name="shirt-outline" size={32} color={theme.colors.textTertiary} />
          </View>
        )}
        {item.isFavorite && (
          <View style={styles.favoriteBadge}>
            <Ionicons name="heart" size={12} color={theme.colors.surface} />
          </View>
        )}
      </View>
      <Text style={styles.gridItemName} numberOfLines={1}>
        {item.name || categoryLabel}
      </Text>
      <Text style={styles.gridItemCategory} numberOfLines={1}>
        {categoryLabel}
      </Text>
    </TouchableOpacity>
  );
});

export const WardrobeScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  useScreenTracking("Wardrobe");
  const t = useTranslation();

  const [stats, setStats] = useState<WardrobeStats>({
    clothingTotal: 0,
    outfitTotal: 0,
    byCategory: {},
  });
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ClothingCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showImportSheet, setShowImportSheet] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const [clothingRes, outfitRes] = await Promise.all([
        clothingApi.getStats(),
        outfitApi.getStats(),
      ]);

      const clothingTotal = clothingRes.data?.total ?? 0;
      const byCategory = clothingRes.data?.byCategory ?? {};
      const outfitTotal = outfitRes.data?.total ?? 0;

      setStats({ clothingTotal, outfitTotal, byCategory });
    } catch (err) {
      // Stats fetch failure should not block the UI
    }
  }, []);

  const fetchItems = useCallback(
    async (pageNum: number, isRefresh: boolean = false) => {
      try {
        if (isRefresh) {
          setError(null);
        }

        const response = await clothingApi.getAll({
          filter: {
            category: selectedCategory,
            searchQuery: searchQuery.trim() || undefined,
          },
          sort: { field: "createdAt", direction: "desc" },
          page: pageNum,
          limit: PAGE_SIZE,
        });

        if (!response.success || !response.data) {
          throw new Error(response.error?.message || "Failed to load items");
        }

        const newItems = response.data.items;
        const totalPages = response.data.totalPages;

        setItems((prev) => (isRefresh ? newItems : [...prev, ...newItems]));
        setHasMore(pageNum < totalPages);
        setPage(pageNum);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load items";
        setError(message);
      }
    },
    [selectedCategory, searchQuery]
  );

  const initialLoad = useCallback(async () => {
    setLoading(true);
    setItems([]);
    setPage(1);
    setHasMore(true);
    try {
      await Promise.all([fetchStats(), fetchItems(1, true)]);
    } finally {
      setLoading(false);
    }
  }, [fetchStats, fetchItems]);

  useEffect(() => {
    void initialLoad();
  }, [initialLoad]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setItems([]);
    setPage(1);
    setHasMore(true);
    await Promise.all([fetchStats(), fetchItems(1, true)]);
    setRefreshing(false);
  }, [fetchStats, fetchItems]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) {
      return;
    }
    setLoadingMore(true);
    await fetchItems(page + 1);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, fetchItems]);

  const handleCategorySelect = useCallback((category: ClothingCategory | null) => {
    setSelectedCategory(category);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleItemPress = useCallback(
    (item: ClothingItem) => {
      navigation.navigate("Product", { clothingId: item.id });
    },
    [navigation]
  );

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return items;
    }
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.name?.toLowerCase().includes(q) ||
        item.brand?.toLowerCase().includes(q) ||
        item.color?.toLowerCase().includes(q) ||
        item.tags?.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  const renderItem = useCallback(
    ({ item }: { item: ClothingItem }) => (
      <ClothingGridItem item={item} onPress={handleItemPress} />
    ),
    [handleItemPress]
  );

  // 固定高度的网格项，使用 getItemLayout 优化 FlatList 性能
  // 避免每次渲染时计算高度，提升滚动性能
  const getItemLayout = useCallback(
    (_data: unknown, index: number) => ({
      length: GRID_ITEM_HEIGHT,
      offset: GRID_ITEM_HEIGHT * Math.floor(index / 2) + GRID_ROW_GAP * Math.floor(index / 2),
      index,
    }),
    []
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) {
      return null;
    }
    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }, [loadingMore]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return null;
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="shirt-outline" size={64} color={theme.colors.textTertiary} />
        <Text style={styles.emptyText}>
          {searchQuery.trim() || selectedCategory ? t.search.noResults : t.wardrobe.title}
        </Text>
        <Text style={styles.emptySubtext}>
          {searchQuery.trim() || selectedCategory
            ? "试试其他筛选条件"
            : "点击右上角添加你的第一件服装"}
        </Text>
        {!searchQuery.trim() && !selectedCategory && (
          <TouchableOpacity
            style={styles.emptyAddButton}
            onPress={() => navigation.navigate("AddClothing", {})}
            accessibilityLabel="添加服装"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={20} color={theme.colors.surface} />
            <Text style={styles.emptyAddButtonText}>{t.wardrobe.addClothing}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [loading, searchQuery, selectedCategory, navigation]);

  // 使用 useMemo 缓存渲染内容，避免不必要的重渲染
  const content = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      );
    }

    if (error && items.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={initialLoad}
            accessibilityLabel="重试加载"
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={filteredItems.length === 0 ? styles.flatListEmpty : styles.flatList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
      />
    );
  }, [
    loading,
    error,
    items.length,
    filteredItems,
    refreshing,
    renderItem,
    renderFooter,
    renderEmpty,
    handleRefresh,
    handleLoadMore,
    initialLoad,
    getItemLayout,
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.wardrobe.title}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.importButton}
            onPress={() => setShowImportSheet(true)}
            accessibilityLabel="导入衣橱"
            accessibilityRole="button"
          >
            <Ionicons name="download-outline" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate("AddClothing", {})}
            accessibilityLabel="添加服装"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={24} color={theme.colors.surface} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.clothingTotal}</Text>
          <Text style={styles.statLabel}>服装</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.outfitTotal}</Text>
          <Text style={styles.statLabel}>搭配</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={18}
          color={theme.colors.textTertiary}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="搜索服装名称、品牌..."
          placeholderTextColor={theme.colors.textTertiary}
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel="搜索服装"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
      >
        <TouchableOpacity
          style={[styles.categoryTab, selectedCategory === null && styles.categoryTabActive]}
          onPress={() => handleCategorySelect(null)}
          accessibilityLabel="全部"
          accessibilityRole="button"
          accessibilityState={{ selected: selectedCategory === null }}
        >
          <Text
            style={[
              styles.categoryTabText,
              selectedCategory === null && styles.categoryTabTextActive,
            ]}
          >
            全部
          </Text>
        </TouchableOpacity>
        {ALL_CATEGORIES.map(([category, label]) => (
          <TouchableOpacity
            key={category}
            style={[styles.categoryTab, selectedCategory === category && styles.categoryTabActive]}
            onPress={() => handleCategorySelect(category)}
            accessibilityLabel={label}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedCategory === category }}
          >
            <Text
              style={[
                styles.categoryTabText,
                selectedCategory === category && styles.categoryTabTextActive,
              ]}
            >
              {label}
              {stats.byCategory[category] !== null &&
                stats.byCategory[category] > 0 &&
                ` (${stats.byCategory[category]})`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {content}

      <ImportSheet
        visible={showImportSheet}
        onClose={() => setShowImportSheet(false)}
        onImported={() => initialLoad()}
      />
    </SafeAreaView>
  );
};

const GRID_ITEM_HEIGHT = 220; // 图片高度 + 文字高度 + padding
const GRID_ROW_GAP = 12;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: DesignTokens.typography.sizes['2xl'],
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  importButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    paddingBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: DesignTokens.colors.neutral.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statNumber: {
    fontSize: DesignTokens.typography.sizes['3xl'],
    fontWeight: "700",
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: DesignTokens.typography.sizes.base,
    color: theme.colors.textPrimary,
  },
  categoryScroll: {
    maxHeight: 44,
    marginVertical: 4,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryTabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryTabText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  categoryTabTextActive: {
    color: theme.colors.surface,
    fontWeight: "600",
  },
  flatList: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 20,
  },
  flatListEmpty: {
    flexGrow: 1,
  },
  gridRow: {
    gap: 12,
    marginBottom: 12,
  },
  gridItem: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: DesignTokens.colors.neutral.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  gridItemImageContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
    backgroundColor: theme.colors.placeholderBg,
  },
  gridItemImage: {
    width: "100%",
    height: "100%",
  },
  gridItemPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.placeholderBg,
  },
  favoriteBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  gridItemName: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 2,
  },
  gridItemCategory: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: theme.colors.textSecondary,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  loadingText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  loadingMoreContainer: {
    paddingVertical: 16,
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: DesignTokens.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  emptyAddButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 20,
    gap: 6,
  },
  emptyAddButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: theme.colors.surface,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginTop: 12,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
  },
  retryButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: theme.colors.surface,
  },
});

export default WardrobeScreen;

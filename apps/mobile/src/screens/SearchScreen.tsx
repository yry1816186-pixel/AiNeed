import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { RootStackParamList } from "../types/navigation";
import { theme } from '../design-system/theme';
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { clothingApi } from "../services/api/clothing.api";
import { useScreenTracking } from "../hooks/useAnalytics";
import { useTranslation } from "../i18n";
import {
  searchApi,
  searchEnhancementApi,
  clothingEnhancementApi,
  type FilterOptions as FilterOptionsType,
  type Subcategory,
} from "../services/api/commerce.api";
import type {
  ClothingItem,
  ClothingFilter,
  ClothingCategory,
  Season,
  Occasion,
} from "../types/clothing";
import { CategoryNavigation } from "../components/CategoryNavigation";
import { SubcategoryTabs } from "../components/SubcategoryTabs";
import { FilterTags } from "../components/FilterTags";
import { SortBar } from "../components/SortBar";
import {
  launchImageLibraryAsync,
  launchCameraAsync,
  MediaTypeOptions,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
} from "@/src/polyfills/expo-image-picker";
import {
  FilterPanel,
  ActiveFilterPills,
  EmptySearchState,
  SearchSuggestions,
  SearchResultList,
  LoadingOverlay,
  PRICERANGES,
} from "../components/search/SearchScreenParts";

const DEBOUNCE_MS = 300;

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  useScreenTracking("Search");
  const t = useTranslation();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClothingItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(false);

  const [history, setHistory] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<ClothingCategory | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [selectedOccasion, setSelectedOccasion] = useState<Occasion | null>(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<number | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Phase 5: Enhanced search state
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptionsType | null>(null);
  const [activeSort, setActiveSort] = useState("comprehensive");
  const [activeFilterDimensions, setActiveFilterDimensions] = useState<{
    brands?: string[];
    colors?: string[];
    sizes?: string[];
    priceRange?: { min: number; max: number };
  }>({});

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  const currentFilter = useMemo<ClothingFilter>(
    () => ({
      category: selectedCategory,
      seasons: selectedSeason ? [selectedSeason] : undefined,
      occasions: selectedOccasion ? [selectedOccasion] : undefined,
    }),
    [selectedCategory, selectedSeason, selectedOccasion]
  );

  const currentExtraParams = useMemo(
    () => ({
      minPrice: selectedPriceRange !== null ? PRICE_RANGES[selectedPriceRange].min : undefined,
      maxPrice: selectedPriceRange !== null ? PRICE_RANGES[selectedPriceRange].max : undefined,
      sizes: selectedSizes.length > 0 ? selectedSizes : undefined,
    }),
    [selectedPriceRange, selectedSizes]
  );

  const loadInitialData = useCallback(async () => {
    const settled = await Promise.allSettled([searchApi.getHistory(), searchApi.getTrending()]);

    const historyResult = settled[0];
    if (
      historyResult.status === "fulfilled" &&
      historyResult.value.success &&
      historyResult.value.data
    ) {
      setHistory(historyResult.value.data);
    }

    const trendingResult = settled[1];
    if (
      trendingResult.status === "fulfilled" &&
      trendingResult.value.success &&
      trendingResult.value.data
    ) {
      setTrending(trendingResult.value.data);
    }
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  const performSearch = useCallback(
    async (
      searchQuery: string,
      filter: ClothingFilter,
      extraParams?: { minPrice?: number; maxPrice?: number; sizes?: string[] },
      page: number = 1
    ) => {
      const trimmed = searchQuery.trim();
      const hasFilters =
        !!filter.category ||
        !!filter.seasons?.length ||
        !!filter.occasions?.length ||
        extraParams?.minPrice !== undefined ||
        extraParams?.maxPrice !== undefined ||
        !!extraParams?.sizes?.length ||
        !!activeSort ||
        !!selectedSubcategory ||
        !!activeFilterDimensions.brands?.length ||
        !!activeFilterDimensions.colors?.length ||
        !!activeFilterDimensions.sizes?.length ||
        !!activeFilterDimensions.priceRange;

      if (!trimmed && !hasFilters) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      setHasSearched(true);

      try {
        const response = await clothingApi.search(trimmed, filter, {
          ...extraParams,
          sort: activeSort || undefined,
          brands: activeFilterDimensions.brands?.length
            ? activeFilterDimensions.brands
            : undefined,
          colors: activeFilterDimensions.colors?.length
            ? activeFilterDimensions.colors
            : undefined,
          subcategory: selectedSubcategory || undefined,
          page,
          limit: 20,
        });
        if (response.success && response.data) {
          const newItems = response.data.items;
          setResults(page === 1 ? newItems : (prev) => [...prev, ...newItems]);
          setCurrentPage(page);
          setHasMorePages(response.data.hasMore ?? false);
          if (trimmed && page === 1) {
            const historyResponse = await searchApi.saveHistory(trimmed);
            if (historyResponse.success && historyResponse.data) {
              setHistory(historyResponse.data);
            }
          }
        } else {
          if (page === 1) {
            setResults([]);
          }
        }
      } catch {
        if (page === 1) {
          setResults([]);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeSort, activeFilterDimensions, selectedSubcategory]
  );

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    const hasActiveFilter = !!selectedCategory || !!selectedSeason || !!selectedOccasion;
    const hasQuery = query.trim().length > 0;

    if (!hasQuery && !hasActiveFilter) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const delay = hasQuery ? DEBOUNCE_MS : 0;
    debounceTimer.current = setTimeout(() => {
      void performSearch(query, currentFilter, currentExtraParams, 1);
    }, delay);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [
    currentFilter,
    currentExtraParams,
    performSearch,
    query,
    selectedCategory,
    selectedOccasion,
    selectedSeason,
    activeSort,
    activeFilterDimensions,
    selectedSubcategory,
  ]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await performSearch(query, currentFilter, currentExtraParams, 1);
  }, [currentFilter, currentExtraParams, performSearch, query]);

  const handleTagPress = useCallback((tag: string) => {
    setQuery(tag);
    searchInputRef.current?.focus();
  }, []);

  const handleClearHistory = useCallback(async () => {
    try {
      await searchApi.clearHistory();
      setHistory([]);
    } catch (error) {
      // keep UI stable even if clear history fails
      console.error('Failed to clear search history:', error);
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedCategory(null);
    setSelectedSeason(null);
    setSelectedOccasion(null);
    setSelectedPriceRange(null);
    setSelectedSizes([]);
  }, []);

  const handleImageSelected = useCallback(async (uri: string) => {
    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await searchApi.searchByImage(uri);
      if (response.success && response.data) {
        setResults(response.data);
      } else {
        setResults([]);
        Alert.alert(t.search.noResults, t.search.noResults);
      }
    } catch {
      setResults([]);
      Alert.alert("搜索失败", "以图搜衣暂时不可用，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleImageSearch = useCallback(() => {
    Alert.alert("以图搜衣", "选择图片来源", [
      {
        text: "拍照",
        onPress: async () => {
          const permission = await requestCameraPermissionsAsync();
          if (!permission.granted) {
            Alert.alert("权限不足", "需要相机权限才能拍照搜衣");
            return;
          }

          const result = await launchCameraAsync({
            mediaTypes: MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          });

          if (!result.canceled && result.assets?.[0]?.uri) {
            await handleImageSelected(result.assets[0].uri);
          }
        },
      },
      {
        text: "从相册选择",
        onPress: async () => {
          const permission = await requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert("权限不足", "需要相册权限才能选择图片");
            return;
          }

          const result = await launchImageLibraryAsync({
            mediaTypes: MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          });

          if (!result.canceled && result.assets?.[0]?.uri) {
            await handleImageSelected(result.assets[0].uri);
          }
        },
      },
      { text: "取消", style: "cancel" },
    ]);
  }, [handleImageSelected]);

  const handleItemPress = useCallback(
    (item: ClothingItem) => {
      navigation.navigate("Product", { clothingId: item.id });
    },
    [navigation]
  );

  const handleClearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    searchInputRef.current?.focus();
  }, []);

  const handleCategoryQuickSelect = useCallback(
    (category: ClothingCategory) => {
      setSelectedCategory(category);
      setShowFilters(true);
      setHasSearched(true);
      void performSearch("", { ...currentFilter, category }, currentExtraParams, 1);
    },
    [currentFilter, currentExtraParams, performSearch]
  );

  const hasActiveFilters =
    !!selectedCategory ||
    !!selectedSeason ||
    !!selectedOccasion ||
    selectedPriceRange !== null ||
    selectedSizes.length > 0;
  const activeFilterCount = [
    selectedCategory,
    selectedSeason,
    selectedOccasion,
    selectedPriceRange !== null ? "price" : null,
    selectedSizes.length > 0 ? "sizes" : null,
  ].filter(Boolean).length;

  const renderContent = () => {
    if (!hasSearched) {
      return (
        <SearchSuggestions
          history={history}
          trending={trending}
          isRefreshing={isRefreshing && !hasSearched}
          onTagPress={handleTagPress}
          onClearHistory={handleClearHistory}
          onRefresh={loadInitialData}
          onCategorySelect={handleCategoryQuickSelect}
        />
      );
    }

    if (isLoading && !isRefreshing) {
      return <LoadingOverlay />;
    }

    return (
      <SearchResultList
        results={results}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        onItemPress={handleItemPress}
        emptyContent={
          <EmptySearchState
            query={query}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
          />
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={theme.colors.textTertiary} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder={t.search.placeholder}
              accessibilityLabel={t.search.placeholder}
              placeholderTextColor={theme.colors.textTertiary}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 ? (
              <TouchableOpacity
                onPress={handleClearSearch}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.cameraButton}
            onPress={handleImageSearch}
            accessibilityLabel="以图搜衣"
            accessibilityRole="button"
          >
            <Ionicons name="camera-outline" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
            onPress={() => setShowFilters((value) => !value)}
            accessibilityLabel={t.search.filters}
            accessibilityRole="button"
          >
            <Ionicons
              name="options-outline"
              size={16}
              color={showFilters ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text style={[styles.filterToggleText, showFilters && styles.filterToggleTextActive]}>
              {t.search.filters}
            </Text>
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <ActiveFilterPills
            selectedCategory={selectedCategory}
            selectedSeason={selectedSeason}
            selectedOccasion={selectedOccasion}
            setSelectedCategory={setSelectedCategory}
            setSelectedSeason={setSelectedSeason}
            setSelectedOccasion={setSelectedOccasion}
          />
        </View>
      </View>

      <FilterPanel
        showFilters={showFilters}
        selectedCategory={selectedCategory}
        selectedSeason={selectedSeason}
        selectedOccasion={selectedOccasion}
        selectedPriceRange={selectedPriceRange}
        selectedSizes={selectedSizes}
        hasActiveFilters={hasActiveFilters}
        setSelectedCategory={(cat) => {
          setSelectedCategory(cat);
          if (cat) {
            void clothingEnhancementApi.getSubcategories(cat).then((res) => {
              if (res.success && res.data) {
                setSubcategories(res.data);
              }
            });
          } else {
            setSubcategories([]);
          }
        }}
        setSelectedSeason={setSelectedSeason}
        setSelectedOccasion={setSelectedOccasion}
        setSelectedPriceRange={setSelectedPriceRange}
        setSelectedSizes={setSelectedSizes}
        onClearFilters={handleClearFilters}
      />

      <CategoryNavigation
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat as ClothingCategory | null);
          if (cat) {
            void clothingEnhancementApi.getSubcategories(cat).then((res) => {
              if (res.success && res.data) {
                setSubcategories(res.data);
              }
            });
            void searchEnhancementApi.getFilterOptions(cat).then((res) => {
              if (res.success && res.data) {
                setFilterOptions(res.data);
              }
            });
          } else {
            setSubcategories([]);
            setFilterOptions(null);
          }
        }}
      />

      {subcategories.length > 0 && (
        <SubcategoryTabs
          subcategories={subcategories}
          selectedSubcategory={selectedSubcategory}
          onSelectSubcategory={setSelectedSubcategory}
        />
      )}

      <FilterTags
        filterOptions={filterOptions}
        activeFilters={activeFilterDimensions}
        onApplyFilter={(dimension, value) => {
          setActiveFilterDimensions((prev) => ({
            ...prev,
            [dimension]: value,
          }));
        }}
      />

      <SortBar activeSort={activeSort} onSortChange={setActiveSort} />

      <View style={styles.separator} />

      {renderContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.divider,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  cameraButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: theme.colors.cartLight,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  filterToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.divider,
  },
  filterToggleActive: {
    backgroundColor: theme.colors.cartLight,
  },
  filterToggleText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  filterToggleTextActive: {
    color: theme.colors.primary,
    fontWeight: "500",
  },
  filterBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.surface,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
});

export default SearchScreen;

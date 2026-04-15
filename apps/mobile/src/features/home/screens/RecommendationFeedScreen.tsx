import React, { useCallback, useEffect } from "react";
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlashList } from "../../polyfills/flash-list";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { useRecommendationFeedStore } from "../../stores/recommendationFeedStore";
import { FeedTabs } from "../../components/recommendations/FeedTabs";
import { RecommendationCard } from "../../components/recommendations/RecommendationFeedCard";
import { DesignTokens } from "../../theme/tokens/design-tokens";
import type { FeedItem, FeedCategory } from "../../services/api/recommendation-feed.api";
import type { RootStackParamList } from "../../types/navigation";

const ESTIMATED_ITEM_SIZE = 280;

export function RecommendationFeedScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const {
    items,
    hasMore,
    isLoading,
    isRefreshing,
    activeCategory,
    activeSubCategory,
    error,
    setCategory,
    setSubCategory,
    fetchFeed,
    loadMore,
    refresh,
  } = useRecommendationFeedStore();

  useEffect(() => {
    void fetchFeed(true);
  }, []);

  const handleItemPress = useCallback(
    (item: FeedItem) => {
      (navigation.navigate as any)("ClothingDetail", { id: item.id });
    },
    [navigation]
  );

  const handleCategoryChange = useCallback(
    (category: FeedCategory) => {
      setCategory(category);
    },
    [setCategory]
  );

  const handleSubCategoryChange = useCallback(
    (subCategory: string | null) => {
      setSubCategory(subCategory);
    },
    [setSubCategory]
  );

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => <RecommendationCard item={item} onPress={handleItemPress} />,
    [handleItemPress]
  );

  const keyExtractor = useCallback((item: FeedItem) => item.id, []);

  const renderFooter = useCallback(() => {
    if (isLoading && !isRefreshing && items.length > 0) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={DesignTokens.colors.brand.terracotta} />
        </View>
      );
    }
    if (!hasMore && items.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerEndText}>— 已经到底了 —</Text>
        </View>
      );
    }
    return null;
  }, [isLoading, isRefreshing, hasMore, items.length]);

  if (error && items.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <FeedTabs
          activeCategory={activeCategory}
          activeSubCategory={activeSubCategory}
          onCategoryChange={handleCategoryChange}
          onSubCategoryChange={handleSubCategoryChange}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => fetchFeed(true)}>
            <Text style={styles.retryText}>重试</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FeedTabs
        activeCategory={activeCategory}
        activeSubCategory={activeSubCategory}
        onCategoryChange={handleCategoryChange}
        onSubCategoryChange={handleSubCategoryChange}
      />

      <FlashList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={ESTIMATED_ITEM_SIZE}
        contentContainerStyle={styles.listContent}
        onEndReached={() => {
          if (hasMore && !isLoading) {
            void loadMore();
          }
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={DesignTokens.colors.brand.terracotta}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.colors.backgrounds.primary,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 20,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },
  footerEnd: {
    paddingVertical: 16,
    alignItems: "center",
  },
  footerEndText: {
    fontSize: 12,
    color: DesignTokens.colors.text.tertiary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: DesignTokens.colors.text.secondary,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: DesignTokens.colors.brand.terracotta,
    borderRadius: 8,
  },
  retryText: {
    color: DesignTokens.colors.neutral.white,
    fontSize: 14,
    fontWeight: "600",
  },
});

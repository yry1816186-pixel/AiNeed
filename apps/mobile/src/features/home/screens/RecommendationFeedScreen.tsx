import React, { useCallback, useEffect } from "react";
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlashList } from "../../polyfills/flash-list";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { useRecommendationFeedStore } from '../stores/recommendationFeedStore';
import { FeedTabs } from '../../../components/recommendations/FeedTabs';
import { RecommendationCard } from '../../../components/recommendations/RecommendationFeedCard';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import type { FeedItem, FeedCategory } from '../../../services/api/recommendation-feed.api';
import type { RootStackParamList } from '../../../types/navigation';
import { Spacing } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';


const ESTIMATED_ITEM_SIZE = 280;

export function RecommendationFeedScreen() {
  const { colors } = useTheme();
  const styles = useStyles(colors);
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
      navigation.navigate("ClothingDetail", { id: item.id });
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
          <ActivityIndicator size="small" color={colors.primary} />
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
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
}

const useStyles = createStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  listContent: {
    paddingHorizontal: DesignTokens.spacing[3],
    paddingTop: Spacing.sm,
    paddingBottom: DesignTokens.spacing[5],
  },
  footerLoader: {
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  footerEnd: {
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  footerEndText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: DesignTokens.spacing[10],
    gap: DesignTokens.spacing[3],
  },
  errorText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: DesignTokens.spacing[5],
    paddingVertical: DesignTokens.spacing['2.5'],
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: colors.surface,
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
  },
}))

import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import { recommendationsApi, type RecommendedItem } from "../../../services/api/tryon.api";
import { ProductFeedCard } from "./ProductFeedCard";
import { EmptyState } from "../../../shared/components/states";

interface ProductFeedProps {
  onBrowseWardrobe?: () => void;
}

export function ProductFeed({ onBrowseWardrobe }: ProductFeedProps) {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const [products, setProducts] = useState<RecommendedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await recommendationsApi.getDiscover(20);
      if (response.success && response.data && response.data.length > 0) {
        setProducts(response.data);
      } else {
        setProducts([]);
        if (!response.success) {
          setError(response.error?.message ?? "加载失败");
        }
      }
    } catch {
      setProducts([]);
      setError("网络错误");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const handleRefresh = useCallback(() => {
    void fetchProducts(true);
  }, [fetchProducts]);

  if (isLoading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>推荐商品</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error && products.length === 0) {
    return (
      <View style={styles.section}>
        <EmptyState
          illustration="search"
          title="加载失败"
          message={error}
          actionLabel="重试"
          onAction={() => fetchProducts()}
        />
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={styles.section}>
        <EmptyState
          illustration="search"
          title="还没有发现好物，去衣橱看看？"
          actionLabel="浏览衣橱"
          onAction={onBrowseWardrobe}
        />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>推荐商品</Text>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.grid}
      >
        {products.map((product, index) => (
          <View key={product.id} style={styles.cardWrapper}>
            <ProductFeedCard
              id={product.id}
              image={product.mainImage}
              title={product.name}
              price={product.price}
              matchScore={product.score ? Math.round(product.score * 100) : undefined}
              onPress={() => {}}
              index={index}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = createStyles((colors) => ({
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  loadingContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  grid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  cardWrapper: {
    marginBottom: 4,
  },
}));

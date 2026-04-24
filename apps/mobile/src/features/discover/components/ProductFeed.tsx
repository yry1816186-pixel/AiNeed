import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import { recommendationsApi, type RecommendedItem } from "../../../services/api/tryon.api";
import { ProductFeedCard } from "./ProductFeedCard";

/** @mock fallback when API is unavailable */
const MOCK_PRODUCTS: RecommendedItem[] = [
  {
    id: "1",
    name: "经典修身西装",
    category: "商务",
    mainImage: "",
    price: 899,
    matchReasons: ["适合你的体型和面试场景"],
  },
  {
    id: "2",
    name: "丝质衬衫",
    category: "休闲",
    mainImage: "",
    price: 399,
    matchReasons: ["搭配你的肤色，提升气质"],
  },
  {
    id: "3",
    name: "羊毛大衣",
    category: "外套",
    mainImage: "",
    price: 1299,
    matchReasons: ["换季必备，百搭单品"],
  },
  {
    id: "4",
    name: "休闲运动鞋",
    category: "鞋履",
    mainImage: "",
    price: 599,
    matchReasons: ["日常舒适之选"],
  },
];

export function ProductFeed() {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const [products, setProducts] = useState<RecommendedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFromApi, setIsFromApi] = useState(false);
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
        setIsFromApi(true);
      } else {
        setProducts(MOCK_PRODUCTS);
        setIsFromApi(false);
        if (!response.success) {
          setError(response.error?.message ?? "加载失败");
        }
      }
    } catch {
      setProducts(MOCK_PRODUCTS);
      setIsFromApi(false);
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

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>推荐商品{!isFromApi ? "（预览）" : ""}</Text>
      {error && !isFromApi && <Text style={styles.errorText}>{error}，显示示例数据</Text>}
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

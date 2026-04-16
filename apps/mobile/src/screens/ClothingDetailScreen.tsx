import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import type { RootStackParamList } from "../types/navigation";
import type { ClothingItem } from "../types/clothing";
import { clothingApi } from "../services/api/clothing.api";
import { useTheme, createStyles } from '../shared/contexts/ThemeContext';
import {
  cartApi,
  favoriteApi,
  clothingEnhancementApi,
  type SizeRecommendation,
} from "../services/api/commerce.api";
import { useSizeRecommendationStore } from "../stores/sizeRecommendationStore";
import { ProductImageCarousel } from "../components/ProductImageCarousel";
import { SKUSelector } from "../components/SKUSelector";
import { OutfitRecommendationCards } from "../components/OutfitRecommendationCards";
import { DesignTokens } from "../design-system/theme/tokens/design-tokens";

type ClothingDetailRouteProp = RouteProp<RootStackParamList, "ClothingDetail">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ClothingDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ClothingDetailRouteProp>();
  const { clothingId } = route.params;

  const [item, setItem] = useState<ClothingItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showSKU, setShowSKU] = useState(false);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [relatedItems, setRelatedItems] = useState<
    { id: string; items: ClothingItem[]; title?: string }[]
  >([]);

  const sizeRecStore = useSizeRecommendationStore();
  const aiRecommendation = sizeRecStore.getRecommendation(clothingId);

  const loadItem = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await clothingApi.getById(clothingId);
      if (response.success && response.data) {
        setItem(response.data);
        setSelectedColor(response.data.colors?.[0] ?? "");
        setSelectedSize(response.data.size ?? "");

        const favResponse = await favoriteApi.check(clothingId);
        if (favResponse.success && favResponse.data) {
          setIsFavorite(favResponse.data.isFavorite);
        }
      } else {
        setError(response.error?.message ?? "加载失败");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "网络错误，请重试");
    } finally {
      setIsLoading(false);
    }
  }, [clothingId]);

  useEffect(() => {
    void loadItem();
    void sizeRecStore.fetchRecommendation(clothingId);

    void clothingEnhancementApi.getRelatedItems(clothingId).then((res) => {
      if (res.success && res.data) {
        const outfits = res.data.slice(0, 5).map((ri, idx) => ({
          id: `outfit-${idx}`,
          items: [ri],
          title: ri.name ?? `搭配 ${idx + 1}`,
        }));
        setRelatedItems(outfits);
      }
    });
  }, [clothingId, loadItem]);

  const handleToggleFavorite = useCallback(async () => {
    try {
      if (isFavorite) {
        await favoriteApi.remove(clothingId);
      } else {
        await favoriteApi.add(clothingId);
      }
      setIsFavorite(!isFavorite);
    } catch {
      Alert.alert("操作失败", "请稍后重试");
    }
  }, [clothingId, isFavorite]);

  const _handleAddToCart = useCallback(async () => {
    if (!item) {
      return;
    }
    try {
      const response = await cartApi.add({
        itemId: item.id,
        color: selectedColor,
        size: selectedSize,
        quantity,
      });
      if (response.success) {
        Alert.alert("已加入购物车", `${item.name ?? "商品"} x${quantity}`);
      } else {
        Alert.alert("添加失败", response.error?.message ?? "请稍后重试");
      }
    } catch {
      Alert.alert("添加失败", "网络错误");
    }
  }, [item, selectedColor, selectedSize, quantity]);

  const handleBuyNow = useCallback(async () => {
    if (!item) {
      return;
    }
    setShowSKU(false);
    Alert.alert("提示", "请先添加到购物车或从购物车结算");
  }, [item]);

  const handleSKUChange = useCallback((color: string, size: string, qty: number) => {
    setSelectedColor(color);
    setSelectedSize(size);
    setQuantity(qty);
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error ?? "未找到商品"}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadItem}>
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const images = [item.imageUri, ...(item.thumbnailUri ? [item.thumbnailUri] : [])].filter(
    Boolean
  ) as string[];

  const clothingItem = item as ClothingItem & { originalPrice?: number };
  /* eslint-disable eqeqeq */
  const hasDiscount =
    clothingItem.originalPrice != null &&
    clothingItem.price != null &&
    clothingItem.originalPrice > clothingItem.price;
  /* eslint-enable eqeqeq */

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>商品详情</Text>
        <TouchableOpacity onPress={handleToggleFavorite}>
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={24}
            color={isFavorite ? colors.like : colors.text}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ProductImageCarousel images={images} />

        <View style={styles.priceSection}>
          <View style={styles.priceRow}>
            <Text style={styles.currentPrice}>¥{clothingItem.price}</Text>
            {hasDiscount && <Text style={styles.originalPrice}>¥{clothingItem.originalPrice}</Text>}
            {hasDiscount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {Math.round(
                    ((clothingItem.originalPrice! - clothingItem.price!) /
                      clothingItem.originalPrice!) *
                      100
                  )}
                  %OFF
                </Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.skuTrigger} onPress={() => setShowSKU(true)}>
          <Text style={styles.skuTriggerLabel}>
            {selectedColor && selectedSize
              ? `${selectedColor} / ${selectedSize} / x${quantity}`
              : "请选择规格"}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        <View style={styles.infoSection}>
          <Text style={styles.itemName}>{item.name ?? "未命名商品"}</Text>
          {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}
        </View>

        {relatedItems.length > 0 && (
          <View style={styles.relatedSection}>
            <OutfitRecommendationCards outfits={relatedItems} />
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomLeft}>
          <TouchableOpacity style={styles.bottomIconButton} onPress={handleToggleFavorite}>
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={22}
              color={isFavorite ? colors.like : colors.textSecondary}
            />
            <Text style={styles.bottomIconLabel}>收藏</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomIconButton}
            onPress={() => navigation.navigate("VirtualTryOn", { clothingId })}
          >
            <Ionicons name="sparkles-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.bottomIconLabel}>试衣</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bottomRight}>
          <TouchableOpacity style={styles.addToCartButton} onPress={() => setShowSKU(true)}>
            <Text style={styles.addToCartText}>加入购物车</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buyNowButton} onPress={handleBuyNow}>
            <Text style={styles.buyNowText}>立即购买</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SKUSelector
        visible={showSKU}
        colors={item.colors ?? []}
        sizes={item.size ? [item.size] : []}
        stock={999}
        selectedColor={selectedColor}
        selectedSize={selectedSize}
        quantity={quantity}
        onChange={handleSKUChange}
        onClose={() => setShowSKU(false)}
        itemId={clothingId}
        aiRecommendation={aiRecommendation ?? null}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: colors.text },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textTertiary, marginTop: 8 },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textTertiary, marginTop: 12, textAlign: "center" },
  retryButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "500", color: colors.surface },
  content: { flex: 1 },
  priceSection: { paddingHorizontal: 16, paddingTop: 16 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  currentPrice: { fontSize: DesignTokens.typography.sizes.xl, fontWeight: "700", color: colors.primary },
  originalPrice: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textTertiary,
    textDecorationLine: "line-through",
  },
  discountBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: { fontSize: DesignTokens.typography.sizes.xs, fontWeight: "600", color: colors.surface },
  skuTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  skuTriggerLabel: { fontSize: DesignTokens.typography.sizes.base, color: colors.textSecondary },
  infoSection: { paddingHorizontal: 16, paddingTop: 16 },
  itemName: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600", color: colors.textPrimary, marginBottom: 4 },
  itemBrand: { fontSize: DesignTokens.typography.sizes.base, color: colors.textTertiary, marginBottom: 8 },
  relatedSection: { paddingHorizontal: 16, paddingTop: 8 },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  bottomLeft: { flexDirection: "row", gap: 16 },
  bottomIconButton: { alignItems: "center", gap: 2 },
  bottomIconLabel: { fontSize: DesignTokens.typography.sizes.xs, color: colors.textSecondary },
  bottomRight: { flex: 1, flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  addToCartButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  addToCartText: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "500", color: colors.primary },
  buyNowButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  buyNowText: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: colors.surface },
});

export default ClothingDetailScreen;

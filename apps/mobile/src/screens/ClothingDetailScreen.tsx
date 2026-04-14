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
    loadItem();
    sizeRecStore.fetchRecommendation(clothingId);

    clothingEnhancementApi.getRelatedItems(clothingId).then((res) => {
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

  const handleAddToCart = useCallback(async () => {
    if (!item) return;
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
    if (!item) return;
    setShowSKU(false);
    Alert.alert("提示", "请先添加到购物车或从购物车结算");
  }, [item]);

  const handleSKUChange = useCallback(
    (color: string, size: string, qty: number) => {
      setSelectedColor(color);
      setSelectedSize(size);
      setQuantity(qty);
    },
    [],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4D4F" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF4D4F" />
          <Text style={styles.errorText}>{error ?? "未找到商品"}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadItem}>
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const images = [
    item.imageUri,
    ...(item.thumbnailUri ? [item.thumbnailUri] : []),
  ].filter(Boolean) as string[];

  const _item = item as ClothingItem & { originalPrice?: number };
  const hasDiscount =
    _item.originalPrice != null && item.price != null && _item.originalPrice > item.price;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>商品详情</Text>
        <TouchableOpacity onPress={handleToggleFavorite}>
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={24}
            color={isFavorite ? "#FF4D4F" : "#333333"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ProductImageCarousel images={images} />

        <View style={styles.priceSection}>
          <View style={styles.priceRow}>
            <Text style={styles.currentPrice}>¥{item.price}</Text>
            {hasDiscount && (
              <Text style={styles.originalPrice}>
                ¥{_item.originalPrice}
              </Text>
            )}
            {hasDiscount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {Math.round(
                    ((_item.originalPrice! - item.price!) / _item.originalPrice!) *
                      100,
                  )}
                  %OFF
                </Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.skuTrigger}
          onPress={() => setShowSKU(true)}
        >
          <Text style={styles.skuTriggerLabel}>
            {selectedColor && selectedSize
              ? `${selectedColor} / ${selectedSize} / x${quantity}`
              : "请选择规格"}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#999999" />
        </TouchableOpacity>

        <View style={styles.infoSection}>
          <Text style={styles.itemName}>{item.name ?? "未命名商品"}</Text>
          {item.brand && (
            <Text style={styles.itemBrand}>{item.brand}</Text>
          )}
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
          <TouchableOpacity
            style={styles.bottomIconButton}
            onPress={handleToggleFavorite}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={22}
              color={isFavorite ? "#FF4D4F" : "#666666"}
            />
            <Text style={styles.bottomIconLabel}>收藏</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomIconButton}
            onPress={() =>
              navigation.navigate("VirtualTryOn", { clothingId })
            }
          >
            <Ionicons name="sparkles-outline" size={22} color="#666666" />
            <Text style={styles.bottomIconLabel}>试衣</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bottomRight}>
          <TouchableOpacity
            style={styles.addToCartButton}
            onPress={() => setShowSKU(true)}
          >
            <Text style={styles.addToCartText}>加入购物车</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.buyNowButton}
            onPress={handleBuyNow}
          >
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
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "600", color: "#333333" },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { fontSize: 14, color: "#999999", marginTop: 8 },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorText: { fontSize: 14, color: "#999999", marginTop: 12, textAlign: "center" },
  retryButton: {
    backgroundColor: "#FF4D4F",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: { fontSize: 14, fontWeight: "500", color: "#FFFFFF" },
  content: { flex: 1 },
  priceSection: { paddingHorizontal: 16, paddingTop: 16 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  currentPrice: { fontSize: 20, fontWeight: "700", color: "#FF4D4F" },
  originalPrice: {
    fontSize: 14,
    color: "#CCCCCC",
    textDecorationLine: "line-through",
  },
  discountBadge: {
    backgroundColor: "#FF4D4F",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: { fontSize: 11, fontWeight: "600", color: "#FFFFFF" },
  skuTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  skuTriggerLabel: { fontSize: 14, color: "#666666" },
  infoSection: { paddingHorizontal: 16, paddingTop: 16 },
  itemName: { fontSize: 18, fontWeight: "600", color: "#333333", marginBottom: 4 },
  itemBrand: { fontSize: 14, color: "#999999", marginBottom: 8 },
  relatedSection: { paddingHorizontal: 16, paddingTop: 8 },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FFFFFF",
  },
  bottomLeft: { flexDirection: "row", gap: 16 },
  bottomIconButton: { alignItems: "center", gap: 2 },
  bottomIconLabel: { fontSize: 10, color: "#666666" },
  bottomRight: { flex: 1, flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  addToCartButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FF4D4F",
  },
  addToCartText: { fontSize: 14, fontWeight: "500", color: "#FF4D4F" },
  buyNowButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#FF4D4F",
  },
  buyNowText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
});

export default ClothingDetailScreen;

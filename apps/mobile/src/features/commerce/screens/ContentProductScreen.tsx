/* eslint-disable @typescript-eslint/no-misused-promises */
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "../../../polyfills/expo-vector-icons";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { contentProductService, type ContentProductInfo } from "../services/contentProductService";
import { ContentUnlockCTA } from "../components/ContentUnlockCTA";
import type { RootStackParamList } from "../../../types/navigation";

type Navigation = NavigationProp<RootStackParamList>;

/** Default products displayed before API response */
const DEFAULT_PRODUCTS: ContentProductInfo[] = [
  {
    productType: "color_report",
    name: "色彩分析报告",
    description: "你的专属色彩密码，了解最适合你的色系搭配",
    price: 9.9,
    currency: "CNY",
  },
  {
    productType: "body_report",
    name: "体型分析报告",
    description: "基于体型数据的穿搭建议，扬长避短",
    price: 9.9,
    currency: "CNY",
  },
  {
    productType: "capsule_wardrobe",
    name: "胶囊衣橱方案",
    description: "30 件单品搭配 100+ 穿搭，精简你的衣橱",
    price: 19.0,
    currency: "CNY",
  },
];

interface ProductCardProps {
  product: ContentProductInfo;
  purchased: boolean;
  onPurchase: (product: ContentProductInfo) => void;
  onView: (product: ContentProductInfo) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, purchased, onPurchase, onView }) => {
  const iconMap: Record<string, string> = {
    color_report: "color-palette-outline",
    body_report: "body-outline",
    capsule_wardrobe: "shirt-outline",
  };
  const iconName = iconMap[product.productType] ?? "document-text-outline";

  return (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <View style={styles.productIcon}>
          <Ionicons
            name={iconName as keyof typeof Ionicons.glyphMap}
            size={20}
            color={DesignTokens.colors.brand.camel}
          />
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productDescription} numberOfLines={2}>
            {product.description}
          </Text>
        </View>
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>¥{product.price}</Text>
        </View>
      </View>

      {purchased ? (
        <View style={styles.purchasedSection}>
          <View style={styles.purchasedBadge}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={DesignTokens.colors.semantic.success}
            />
            <Text style={styles.purchasedText}>已解锁</Text>
          </View>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => onView(product)}
            activeOpacity={0.8}
          >
            <Text style={styles.viewButtonText}>查看报告</Text>
            <Ionicons name="arrow-forward" size={16} color={DesignTokens.colors.brand.camel} />
          </TouchableOpacity>
        </View>
      ) : (
        <ContentUnlockCTA
          productType={product.productType}
          price={product.price}
          onUnlock={() => onPurchase(product)}
        />
      )}
    </View>
  );
};

/**
 * ContentProductScreen -- lists content products with purchase/unlock states.
 *
 * D-06: Content product listing with preview/unlock mode.
 * Uses FlatList of product cards, checking purchase status per product.
 */
export const ContentProductScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const queryClient = useQueryClient();
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  const {
    data: productsResponse,
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ["content-products"],
    queryFn: () => contentProductService.getProducts(),
  });

  const products =
    productsResponse?.success && productsResponse.data && productsResponse.data.length > 0
      ? productsResponse.data
      : DEFAULT_PRODUCTS;

  const { data: purchasedResponse } = useQuery({
    queryKey: ["content-products-purchased"],
    queryFn: () => contentProductService.getPurchased(),
  });

  const purchasedTypes = new Set(
    purchasedResponse?.success && purchasedResponse.data
      ? purchasedResponse.data.map((p) => p.productType)
      : []
  );

  const handlePurchase = useCallback(
    async (product: ContentProductInfo) => {
      if (isPurchasing) return;
      setIsPurchasing(product.productType);

      try {
        const response = await contentProductService.purchase(product.productType, "wechat");
        if (response.success && response.data) {
          // Navigate to Payment screen with orderId
          (navigation as any).navigate("Payment", { orderId: response.data.orderId });
        } else {
          Alert.alert("购买失败", response.error?.message ?? "请稍后重试");
        }
      } catch {
        Alert.alert("购买失败", "网络错误，请稍后重试");
      } finally {
        setIsPurchasing(null);
        // Refetch purchased status after purchase attempt
        void queryClient.invalidateQueries({ queryKey: ["content-products-purchased"] });
      }
    },
    [isPurchasing, navigation, queryClient]
  );

  const handleView = useCallback(
    (product: ContentProductInfo) => {
      if (product.productType === "color_report") {
        navigation.navigate("ColorAnalysis" as never);
      } else if (product.productType === "body_report") {
        navigation.navigate("BodyAnalysis" as never);
      }
    },
    [navigation]
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerBack}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color={DesignTokens.colors.neutral[800]} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>AI 穿搭报告</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  const renderProduct = ({ item }: { item: ContentProductInfo }) => (
    <ProductCard
      product={item}
      purchased={purchasedTypes.has(item.productType)}
      onPurchase={handlePurchase}
      onView={handleView}
    />
  );

  if (productsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={DesignTokens.colors.brand.camel} />
          <Text style={styles.loadingText}>加载报告中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.productType}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={productsLoading}
            onRefresh={() => {
              void refetchProducts();
              void queryClient.invalidateQueries({ queryKey: ["content-products-purchased"] });
            }}
            tintColor={DesignTokens.colors.brand.camel}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.colors.neutral.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: DesignTokens.spacing[5],
    paddingVertical: DesignTokens.spacing[3],
  } as ViewStyle,
  headerBack: {
    width: DesignTokens.spacing[10],
    height: DesignTokens.spacing[10],
    borderRadius: 20,
    backgroundColor: DesignTokens.colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600" as TextStyle["fontWeight"],
    color: DesignTokens.colors.neutral[800],
  },
  headerSpacer: {
    width: DesignTokens.spacing[10],
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  loadingText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.neutral[400],
    marginTop: DesignTokens.spacing[3],
  },
  listContent: {
    paddingHorizontal: DesignTokens.spacing[5],
    paddingBottom: DesignTokens.spacing[10],
    gap: DesignTokens.spacing[4],
  } as ViewStyle,
  productCard: {
    backgroundColor: DesignTokens.colors.neutral.white,
    borderRadius: DesignTokens.borderRadius["2xl"],
    padding: DesignTokens.spacing[4],
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[100],
    ...DesignTokens.shadows.sm,
  } as ViewStyle,
  productHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: DesignTokens.spacing[4],
  } as ViewStyle,
  productIcon: {
    width: 40,
    height: 40,
    borderRadius: DesignTokens.borderRadius.lg,
    backgroundColor: `${DesignTokens.colors.brand.camel}12`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: DesignTokens.spacing[3],
  } as ViewStyle,
  productInfo: {
    flex: 1,
  } as ViewStyle,
  productName: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "700" as TextStyle["fontWeight"],
    color: DesignTokens.colors.neutral[900],
    marginBottom: DesignTokens.spacing[1],
  },
  productDescription: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.neutral[500],
    lineHeight: 20,
  },
  priceBadge: {
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: DesignTokens.spacing[1],
    borderRadius: DesignTokens.borderRadius.full,
    backgroundColor: `${DesignTokens.colors.brand.camel}15`,
  } as ViewStyle,
  priceText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "700" as TextStyle["fontWeight"],
    color: DesignTokens.colors.brand.camel,
  },
  purchasedSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: DesignTokens.spacing[2],
  } as ViewStyle,
  purchasedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing[1],
  } as ViewStyle,
  purchasedText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600" as TextStyle["fontWeight"],
    color: DesignTokens.colors.semantic.success,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing[1],
    paddingHorizontal: DesignTokens.spacing[4],
    paddingVertical: DesignTokens.spacing[2],
    borderRadius: DesignTokens.borderRadius.lg,
    backgroundColor: DesignTokens.colors.neutral[50],
  } as ViewStyle,
  viewButtonText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600" as TextStyle["fontWeight"],
    color: DesignTokens.colors.brand.camel,
  },
});

export default ContentProductScreen;

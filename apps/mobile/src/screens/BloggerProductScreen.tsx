import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { theme } from '../design-system/theme';
import { DesignTokens } from "../theme/tokens/design-tokens";
import { bloggerApi, BloggerProduct } from "../services/api/blogger.api";
import type { RootStackParamList } from "../types/navigation";

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type BloggerProductRoute = RouteProp<RootStackParamList, "BloggerProduct">;

const SCREEN_WIDTH = Dimensions.get("window").width;

export const BloggerProductScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<BloggerProductRoute>();
  const productId = route.params?.productId ?? "";

  const [product, setProduct] = useState<BloggerProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showPurchaseSheet, setShowPurchaseSheet] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<"alipay" | "wechat">("alipay");
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);

  const fetchProduct = useCallback(async () => {
    if (!productId) {
      return;
    }
    try {
      setLoading(true);
      const response = await bloggerApi.getProductById(productId);
      if (response.success && response.data) {
        setProduct(response.data);
      }
    } catch {
      Alert.alert("提示", "加载商品失败");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void fetchProduct();
  }, [fetchProduct]);

  const handlePurchase = useCallback(async () => {
    if (!product) {
      return;
    }
    try {
      setPurchasing(true);
      const response = await bloggerApi.purchaseProduct(product.id, {
        paymentMethod: selectedPayment,
      });
      if (response.success) {
        setPurchaseComplete(true);
        setShowPurchaseSheet(false);
      } else {
        Alert.alert("提示", response.error?.message ?? "购买失败");
      }
    } catch {
      Alert.alert("提示", "购买失败，请重试");
    } finally {
      setPurchasing(false);
    }
  }, [product, selectedPayment]);

  if (loading || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (purchaseComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={64} color="#27AE60" />
          <Text style={styles.successTitle}>购买成功</Text>
          <Text style={styles.successSubtitle}>{product.title}</Text>
          {product.type === "digital" && product.content && (
            <View style={styles.contentBox}>
              <Text style={styles.contentText}>{product.content}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.viewSchemeBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.viewSchemeBtnText}>返回</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>方案详情</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image carousel */}
        {product.images.length > 0 && (
          <View style={styles.carouselSection}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setCurrentImageIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {product.images.map((uri, _index) => (
                <Image key={uri} source={{ uri }} style={styles.carouselImage} resizeMode="cover" />
              ))}
            </ScrollView>
            {product.images.length > 1 && (
              <View style={styles.dots}>
                {product.images.map((_, index) => (
                  <View
                    key={`dot-${index}`}
                    style={[styles.dot, index === currentImageIndex && styles.dotActive]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Title + Price */}
        <View style={styles.infoSection}>
          <Text style={styles.productTitle}>{product.title}</Text>
          <Text style={styles.productPrice}>¥{product.price.toFixed(2)}</Text>
          {/* eslint-disable-next-line eqeqeq */}
          {product.originalPrice != null && product.originalPrice > product.price && (
            <Text style={styles.originalPrice}>¥{product.originalPrice.toFixed(2)}</Text>
          )}
        </View>

        {/* Description */}
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>方案描述</Text>
          <Text style={styles.descriptionText}>{product.description}</Text>
        </View>

        {/* Blogger info card */}
        {product.blogger && (
          <View style={styles.bloggerCard}>
            {product.blogger.avatar ? (
              <Image source={{ uri: product.blogger.avatar }} style={styles.bloggerAvatar} />
            ) : (
              <View style={styles.bloggerAvatarPlaceholder}>
                <Text style={styles.bloggerAvatarText}>{product.blogger.nickname.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.bloggerInfo}>
              <View style={styles.bloggerNameRow}>
                <Text style={styles.bloggerName}>{product.blogger.nickname}</Text>
                {product.blogger.badge === "blogger" && (
                  <View style={styles.bloggerBadgeSmall}>
                    <Ionicons name="checkmark" size={8} color="#FFFFFF" />
                  </View>
                )}
                {product.blogger.badge === "big_v" && (
                  <View style={styles.bigVBadgeSmall}>
                    <Ionicons name="shield-checkmark" size={8} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <Text style={styles.bloggerLabel}>穿搭博主</Text>
            </View>
          </View>
        )}

        {/* External link for physical products */}
        {product.type === "physical" && product.externalUrl && (
          <TouchableOpacity style={styles.externalLink}>
            <Ionicons name="link-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.externalLinkText}>查看原商品</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        )}

        {/* Sales info */}
        <View style={styles.salesInfo}>
          <Text style={styles.salesText}>已售 {product.salesCount}</Text>
          {product.reviewCount > 0 && (
            <Text style={styles.salesText}>评价 {product.reviewCount}</Text>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed purchase button */}
      <View style={styles.purchaseBar}>
        <TouchableOpacity
          style={styles.purchaseBtn}
          onPress={() => setShowPurchaseSheet(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="bag-outline" size={18} color="#FFFFFF" />
          <Text style={styles.purchaseBtnText}>购买此方案</Text>
        </TouchableOpacity>
      </View>

      {/* Purchase confirmation sheet */}
      {showPurchaseSheet && (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            onPress={() => setShowPurchaseSheet(false)}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>确认购买</Text>

            <View style={styles.sheetProductInfo}>
              <Text style={styles.sheetProductName} numberOfLines={1}>
                {product.title}
              </Text>
              <Text style={styles.sheetProductPrice}>¥{product.price.toFixed(2)}</Text>
            </View>

            <Text style={styles.paymentLabel}>支付方式</Text>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                selectedPayment === "alipay" && styles.paymentOptionSelected,
              ]}
              onPress={() => setSelectedPayment("alipay")}
            >
              <View
                style={[
                  styles.paymentRadio,
                  selectedPayment === "alipay" && styles.paymentRadioSelected,
                ]}
              >
                {selectedPayment === "alipay" && <View style={styles.paymentRadioInner} />}
              </View>
              <Ionicons name="wallet-outline" size={20} color="#1677FF" />
              <Text style={styles.paymentName}>支付宝</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                selectedPayment === "wechat" && styles.paymentOptionSelected,
              ]}
              onPress={() => setSelectedPayment("wechat")}
            >
              <View
                style={[
                  styles.paymentRadio,
                  selectedPayment === "wechat" && styles.paymentRadioSelected,
                ]}
              >
                {selectedPayment === "wechat" && <View style={styles.paymentRadioInner} />}
              </View>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#07C160" />
              <Text style={styles.paymentName}>微信支付</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmPurchaseBtn, purchasing && styles.confirmPurchaseBtnDisabled]}
              onPress={handlePurchase}
              disabled={purchasing}
            >
              {purchasing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmPurchaseBtnText}>
                  确认支付 ¥{product.price.toFixed(2)}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerSpacer: { width: 40 },
  carouselSection: { backgroundColor: DesignTokens.colors.neutral[50] },
  carouselImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.8 },
  dots: { flexDirection: "row", justifyContent: "center", paddingVertical: 10, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.2)" },
  dotActive: { backgroundColor: DesignTokens.colors.brand.terracotta, width: 8, height: 8, borderRadius: 4 },
  infoSection: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    marginTop: 8,
  },
  productTitle: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  productPrice: { fontSize: 24, fontWeight: "700", color: DesignTokens.colors.brand.terracotta, marginTop: 8 },
  originalPrice: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textDecorationLine: "line-through",
    marginTop: 4,
  },
  descriptionSection: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.text, marginBottom: 8 },
  descriptionText: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 22 },
  bloggerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    padding: 16,
    marginTop: 8,
    gap: 12,
  },
  bloggerAvatar: { width: 44, height: 44, borderRadius: 22 },
  bloggerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  bloggerAvatarText: { fontSize: 18, fontWeight: "600", color: "#FFFFFF" },
  bloggerInfo: { flex: 1 },
  bloggerNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  bloggerName: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  bloggerBadgeSmall: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: DesignTokens.colors.brand.terracotta,
    alignItems: "center",
    justifyContent: "center",
  },
  bigVBadgeSmall: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#F1C40F",
    alignItems: "center",
    justifyContent: "center",
  },
  bloggerLabel: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  externalLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.surface,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  externalLinkText: { flex: 1, fontSize: 14, color: theme.colors.primary },
  salesInfo: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    marginTop: 8,
  },
  salesText: { fontSize: 12, color: theme.colors.textTertiary },
  purchaseBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  purchaseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: DesignTokens.colors.brand.terracotta,
    borderRadius: 12,
    paddingVertical: 14,
  },
  purchaseBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: DesignTokens.colors.neutral[200],
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 18, fontWeight: "600", color: theme.colors.text, marginBottom: 14 },
  sheetProductInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  sheetProductName: { flex: 1, fontSize: 14, color: theme.colors.text, marginRight: 12 },
  sheetProductPrice: { fontSize: 18, fontWeight: "700", color: DesignTokens.colors.brand.terracotta },
  paymentLabel: { fontSize: 14, fontWeight: "600", color: theme.colors.text, marginBottom: 10 },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  paymentOptionSelected: { backgroundColor: DesignTokens.colors.backgrounds.tertiary },
  paymentRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentRadioSelected: { borderColor: DesignTokens.colors.brand.terracotta },
  paymentRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: DesignTokens.colors.brand.terracotta },
  paymentName: { fontSize: 14, color: theme.colors.text, flex: 1 },
  confirmPurchaseBtn: {
    backgroundColor: DesignTokens.colors.brand.terracotta,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  confirmPurchaseBtnDisabled: { opacity: 0.5 },
  confirmPurchaseBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  successTitle: { fontSize: 24, fontWeight: "700", color: theme.colors.text, marginTop: 16 },
  successSubtitle: { fontSize: 15, color: theme.colors.textSecondary, marginTop: 6 },
  contentBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    width: "100%",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  contentText: { fontSize: 14, color: theme.colors.text, lineHeight: 22 },
  viewSchemeBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 24,
  },
  viewSchemeBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});

export default BloggerProductScreen;

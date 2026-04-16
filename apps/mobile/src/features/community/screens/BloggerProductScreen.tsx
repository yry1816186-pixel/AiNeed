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
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { DesignTokens , flatColors as colors } from '../../../design-system/theme/tokens/design-tokens';
import { bloggerApi, BloggerProduct } from '../../../services/api/blogger.api';
import type { RootStackParamList } from '../../../types/navigation';
import { Spacing } from '../../../design-system/theme';


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
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (purchaseComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={64} color="colors.success" />
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
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
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
                    <Ionicons name="checkmark" size={8} color={colors.surface} />
                  </View>
                )}
                {product.blogger.badge === "big_v" && (
                  <View style={styles.bigVBadgeSmall}>
                    <Ionicons name="shield-checkmark" size={8} color={colors.surface} />
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
            <Ionicons name="link-outline" size={18} color={colors.primary} />
            <Text style={styles.externalLinkText}>查看原商品</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
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
          <Ionicons name="bag-outline" size={18} color={colors.surface} />
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
              <Ionicons name="wallet-outline" size={20} color="colors.info" />
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
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="colors.success" />
              <Text style={styles.paymentName}>微信支付</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmPurchaseBtn, purchasing && styles.confirmPurchaseBtnDisabled]}
              onPress={handlePurchase}
              disabled={purchasing}
            >
              {purchasing ? (
                <ActivityIndicator size="small" color={colors.surface} />
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
  container: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: colors.text },
  backBtn: { width: DesignTokens.spacing[10], height: DesignTokens.spacing[10], justifyContent: "center" },
  headerSpacer: { width: DesignTokens.spacing[10] },
  carouselSection: { backgroundColor: DesignTokens.colors.neutral[50] },
  carouselImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.8 },
  dots: { flexDirection: "row", justifyContent: "center", paddingVertical: DesignTokens.spacing['2.5'], gap: DesignTokens.spacing['1.5']},
  dot: { width: DesignTokens.spacing['1.5'], height: DesignTokens.spacing['1.5'], borderRadius: 3, backgroundColor: "rgba(0,0,0,0.2)" },
  dotActive: { backgroundColor: colors.primary, width: Spacing.sm, height: Spacing.sm, borderRadius: 4 },
  infoSection: {
    backgroundColor: colors.surface,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  productTitle: { fontSize: DesignTokens.typography.sizes.xl, fontWeight: "700", color: colors.text },
  productPrice: { fontSize: DesignTokens.typography.sizes['2xl'], fontWeight: "700", color: colors.primary, marginTop: Spacing.sm},
  originalPrice: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textTertiary,
    textDecorationLine: "line-through",
    marginTop: Spacing.xs,
  },
  descriptionSection: {
    backgroundColor: colors.surface,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  sectionTitle: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: colors.textPrimary, marginBottom: Spacing.sm},
  descriptionText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textSecondary, lineHeight: 22 },
  bloggerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    gap: DesignTokens.spacing[3],
  },
  bloggerAvatar: { width: DesignTokens.spacing[11], height: DesignTokens.spacing[11], borderRadius: 22 },
  bloggerAvatarPlaceholder: {
    width: DesignTokens.spacing[11],
    height: DesignTokens.spacing[11],
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  bloggerAvatarText: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600", color: colors.surface },
  bloggerInfo: { flex: 1 },
  bloggerNameRow: { flexDirection: "row", alignItems: "center", gap: DesignTokens.spacing['1.5']},
  bloggerName: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: colors.text },
  bloggerBadgeSmall: {
    width: DesignTokens.spacing['3.5'],
    height: DesignTokens.spacing['3.5'],
    borderRadius: 7,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  bigVBadgeSmall: {
    width: DesignTokens.spacing['3.5'],
    height: DesignTokens.spacing['3.5'],
    borderRadius: 7,
    backgroundColor: "colors.warning",
    alignItems: "center",
    justifyContent: "center",
  },
  bloggerLabel: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textTertiary, marginTop: DesignTokens.spacing['0.5']},
  externalLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: colors.surface,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['3.5'],
  },
  externalLinkText: { flex: 1, fontSize: DesignTokens.typography.sizes.base, color: colors.primary },
  salesInfo: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing[3],
    backgroundColor: colors.surface,
    marginTop: Spacing.sm,
  },
  salesText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textTertiary },
  purchaseBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing[3],
    paddingBottom: DesignTokens.spacing[5],
  },
  purchaseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: DesignTokens.spacing['3.5'],
  },
  purchaseBtnText: { color: colors.surface, fontSize: DesignTokens.typography.sizes.md, fontWeight: "600" },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingBottom: 34,
  },
  sheetHandle: {
    width: DesignTokens.spacing[10],
    height: Spacing.xs,
    borderRadius: 2,
    backgroundColor: DesignTokens.colors.neutral[200],
    alignSelf: "center",
    marginTop: DesignTokens.spacing['2.5'],
    marginBottom: DesignTokens.spacing['3.5'],
  },
  sheetTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600", color: colors.textPrimary, marginBottom: DesignTokens.spacing['3.5']},
  sheetProductInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: DesignTokens.spacing[3],
    marginBottom: Spacing.md,
  },
  sheetProductName: { flex: 1, fontSize: DesignTokens.typography.sizes.base, color: colors.textPrimary, marginRight: DesignTokens.spacing[3]},
  sheetProductPrice: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "700", color: colors.primary },
  paymentLabel: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: colors.textPrimary, marginBottom: DesignTokens.spacing['2.5']},
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing['2.5'],
    paddingVertical: DesignTokens.spacing['3.5'],
    paddingHorizontal: DesignTokens.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paymentOptionSelected: { backgroundColor: colors.backgroundTertiary },
  paymentRadio: {
    width: DesignTokens.spacing[5],
    height: DesignTokens.spacing[5],
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentRadioSelected: { borderColor: colors.primary },
  paymentRadioInner: { width: DesignTokens.spacing['2.5'], height: DesignTokens.spacing['2.5'], borderRadius: 5, backgroundColor: colors.primary },
  paymentName: { fontSize: DesignTokens.typography.sizes.base, color: colors.textPrimary, flex: 1 },
  confirmPurchaseBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: DesignTokens.spacing['3.5'],
    alignItems: "center",
    marginTop: DesignTokens.spacing[5],
  },
  confirmPurchaseBtnDisabled: { opacity: 0.5 },
  confirmPurchaseBtnText: { color: colors.surface, fontSize: DesignTokens.typography.sizes.md, fontWeight: "600" },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  successTitle: { fontSize: DesignTokens.typography.sizes['2xl'], fontWeight: "700", color: colors.textPrimary, marginTop: Spacing.md},
  successSubtitle: { fontSize: DesignTokens.typography.sizes.base, color: colors.textSecondary, marginTop: DesignTokens.spacing['1.5']},
  contentBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginTop: DesignTokens.spacing[5],
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
  },
  contentText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textPrimary, lineHeight: 22 },
  viewSchemeBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: Spacing.xl,
    paddingVertical: DesignTokens.spacing['3.5'],
    marginTop: Spacing.lg,
  },
  viewSchemeBtnText: { color: colors.surface, fontSize: DesignTokens.typography.sizes.md, fontWeight: "600" },
});

export default BloggerProductScreen;

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NavigationProp, RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import * as Haptics from "@/src/polyfills/expo-haptics";
import { clothingApi } from '../../../services/api/clothing.api';
import { cartApi } from '../../../services/api/commerce.api';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { DesignTokens , flatColors as colors } from '../../../design-system/theme/tokens/design-tokens';
import type { RootStackParamList } from '../../../types/navigation';
import type { ClothingItem } from '../../../types/clothing';
import { Spacing } from '../../../design-system/theme';

import {
  CATEGORY_LABELS,
  OCCASION_LABELS,
  SEASON_LABELS,
  STYLE_LABELS,
} from '../../../types/clothing';

interface RecommendationDetail {
  id: string;
  name: string;
  brand?: string;
  description?: string;
  imageUri?: string;
  price?: number;
  category?: string;
  colors: string[];
  sizes: string[];
  styles: string[];
  seasons: string[];
  occasions: string[];
  score?: number;
  matchReasons: string[];
  externalUrl?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type RecommendationDetailRouteProp = RouteProp<RootStackParamList, "RecommendationDetail">;

interface RecommendationPreview {
  id: string;
  name?: string;
  brand?: string;
  mainImage?: string;
  price?: number;
  category?: string;
  score?: number;
  matchReasons?: string[];
  externalUrl?: string;
}

function _mapRouteRecommendation(preview?: RecommendationPreview): RecommendationDetail | null {
  if (!preview) {
    return null;
  }

  return {
    id: preview.id,
    name: preview.name ?? "AI 推荐单品",
    brand: preview.brand,
    description: undefined,
    imageUri: preview.mainImage,
    price: preview.price,
    category: preview.category,
    colors: [],
    sizes: [],
    styles: [],
    seasons: [],
    occasions: [],
    score: preview.score,
    matchReasons: preview.matchReasons ?? [],
    externalUrl: preview.externalUrl,
  };
}

function buildFallbackReasons(item: ClothingItem, preview: RecommendationDetail | null): string[] {
  const reasons = preview?.matchReasons?.filter(Boolean) ?? [];

  if (reasons.length > 0) {
    return reasons.slice(0, 3);
  }

  if (item.brand) {
    reasons.push(`${item.brand} 的风格与当前偏好更接近`);
  }

  if (item.style.length > 0) {
    const style = STYLE_LABELS[item.style[0]] ?? item.style[0];
    reasons.push(`这件单品适合 ${style} 方向的日常搭配`);
  }

  if (item.seasons.length > 0) {
    const season = SEASON_LABELS[item.seasons[0]] ?? item.seasons[0];
    reasons.push(`${season} 场景下更容易穿出完整造型`);
  }

  if (item.occasions.length > 0) {
    const occasion = OCCASION_LABELS[item.occasions[0]] ?? item.occasions[0];
    reasons.push(`在 ${occasion} 场景里更贴合你的当下需求`);
  }

  if (reasons.length === 0) {
    reasons.push("这件单品已进入你的个性化推荐池");
  }

  return reasons.slice(0, 3);
}

function mergeRecommendationDetail(
  item: ClothingItem,
  preview: RecommendationDetail | null
): RecommendationDetail {
  return {
    id: item.id,
    name: item.name ?? preview?.name ?? "AI 推荐单品",
    brand: item.brand ?? preview?.brand,
    description: item.notes ?? preview?.description,
    imageUri: item.imageUri || item.thumbnailUri || preview?.imageUri,
    price: item.price ?? preview?.price,
    category: item.category,
    colors: item.colors ?? [],
    sizes: item.size ? [item.size] : [],
    styles: item.style ?? [],
    seasons: item.seasons ?? [],
    occasions: item.occasions ?? [],
    score: preview?.score,
    matchReasons: buildFallbackReasons(item, preview),
    externalUrl: item.externalUrl ?? preview?.externalUrl,
  };
}

export const RecommendationDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RecommendationDetailRouteProp>();
  const { recommendationId } = route.params;

  const previewDetail = useMemo(() => null, []);

  const [recommendation, setRecommendation] = useState<RecommendationDetail | null>(previewDetail);
  const [isLoading, setIsLoading] = useState(!previewDetail);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!previewDetail) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const response = await clothingApi.getById(recommendationId);
      if (response.success && response.data) {
        setRecommendation(mergeRecommendationDetail(response.data, previewDetail));
      } else {
        setError(
          typeof response.error === "string"
            ? response.error
            : response.error?.message || "加载推荐详情失败"
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "网络异常，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  }, [recommendationId, previewDetail]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleAddToCart = useCallback(async () => {
    if (!recommendation || isAddingToCart) {
      return;
    }

    setIsAddingToCart(true);

    try {
      const response = await cartApi.add({
        itemId: recommendation.id,
        color: recommendation.colors[0] ?? "默认",
        size: recommendation.sizes[0] ?? "均码",
        quantity: 1,
      });

      if (!response.success) {
        const errorMessage =
          typeof response.error === "string"
            ? response.error
            : response.error?.message || "加入购物车失败";
        throw new Error(errorMessage);
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync("success");
      }

      Alert.alert("已加入购物车", "这件推荐单品已经进入购物车。", [
        {
          text: "去购物车",
          onPress: () =>
            navigation.navigate("MainTabs", {
              screen: "Cart" as never,
            } as never),
        },
        {
          text: "继续浏览",
          style: "cancel",
        },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加入购物车失败";
      Alert.alert("操作失败", message);
    } finally {
      setIsAddingToCart(false);
    }
  }, [isAddingToCart, navigation, recommendation]);

  const handleOpenProduct = useCallback(() => {
    if (!recommendation) {
      return;
    }

    navigation.navigate("ClothingDetail", { clothingId: recommendation.id });
  }, [navigation, recommendation]);

  const handleOpenExternal = useCallback(async () => {
    if (!recommendation?.externalUrl) {
      return;
    }

    try {
      const supported = await Linking.canOpenURL(recommendation.externalUrl);
      if (!supported) {
        throw new Error("当前设备无法打开该购买来源");
      }

      await Linking.openURL(recommendation.externalUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "打开购买来源失败";
      Alert.alert("无法打开链接", message);
    }
  }, [recommendation?.externalUrl]);

  if (isLoading && !recommendation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>正在加载推荐详情...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !recommendation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => void loadData()}
            accessibilityLabel="重试加载推荐详情"
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!recommendation) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="返回上一页"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>推荐详情</Text>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={recommendation.externalUrl ? handleOpenExternal : handleOpenProduct}
          accessibilityLabel={recommendation.externalUrl ? "打开购买来源" : "查看商品详情"}
          accessibilityRole="button"
        >
          <Ionicons
            name={recommendation.externalUrl ? "open-outline" : "shirt-outline"}
            size={20}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          {recommendation.imageUri ? (
            <Image
              source={{ uri: recommendation.imageUri }}
              style={styles.heroImage}
              accessibilityLabel="推荐单品图片"
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="shirt-outline" size={80} color={colors.textTertiary} />
            </View>
          )}

          {typeof recommendation.score === "number" && recommendation.score > 0 ? (
            <View style={styles.scoreOverlay}>
              <LinearGradient colors={[colors.neutral[500], colors.neutral[700]]} style={styles.scoreBadge}>
                <Ionicons name="sparkles" size={16} color={colors.surface} />
                <Text style={styles.scoreText}>
                  匹配度 {Math.round(recommendation.score * 100)}%
                </Text>
              </LinearGradient>
            </View>
          ) : null}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.title}>{recommendation.name}</Text>

          <View style={styles.metaRow}>
            {recommendation.brand ? (
              <View style={styles.metaChip}>
                <Ionicons name="pricetag-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.metaChipText}>{recommendation.brand}</Text>
              </View>
            ) : null}
            {recommendation.category ? (
              <View style={styles.metaChip}>
                <Ionicons name="layers-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.metaChipText}>
                  {CATEGORY_LABELS[recommendation.category as keyof typeof CATEGORY_LABELS] ??
                    recommendation.category}
                </Text>
              </View>
            ) : null}
          </View>

          {typeof recommendation.price === "number" ? (
            <Text style={styles.price}>¥{recommendation.price.toFixed(0)}</Text>
          ) : null}

          {recommendation.description ? (
            <Text style={styles.description}>{recommendation.description}</Text>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>推荐理由</Text>
            {recommendation.matchReasons.map((reason, index) => (
              <View key={`${reason}-${index}`} style={styles.reasonRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            ))}
          </View>

          {recommendation.colors.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>颜色</Text>
              <View style={styles.tagWrap}>
                {recommendation.colors.map((color) => (
                  <View key={color} style={styles.tag}>
                    <Text style={styles.tagText}>{color}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {recommendation.sizes.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>尺码</Text>
              <View style={styles.tagWrap}>
                {recommendation.sizes.map((size) => (
                  <View key={size} style={styles.tag}>
                    <Text style={styles.tagText}>{size}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {recommendation.styles.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>风格</Text>
              <View style={styles.tagWrap}>
                {recommendation.styles.map((style) => (
                  <View key={style} style={styles.tag}>
                    <Text style={styles.tagText}>
                      {STYLE_LABELS[style as keyof typeof STYLE_LABELS] ?? style}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {recommendation.seasons.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>季节</Text>
              <View style={styles.tagWrap}>
                {recommendation.seasons.map((season) => (
                  <View key={season} style={styles.tag}>
                    <Text style={styles.tagText}>
                      {SEASON_LABELS[season as keyof typeof SEASON_LABELS] ?? season}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {recommendation.occasions.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>适用场景</Text>
              <View style={styles.tagWrap}>
                {recommendation.occasions.map((occasion) => (
                  <View key={occasion} style={styles.tag}>
                    <Text style={styles.tagText}>
                      {OCCASION_LABELS[occasion as keyof typeof OCCASION_LABELS] ?? occasion}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {recommendation.externalUrl ? (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleOpenExternal}
              accessibilityLabel="打开购买来源链接"
              accessibilityRole="button"
            >
              <Ionicons name="open-outline" size={18} color={colors.primary} />
              <Text style={styles.linkButtonText}>打开购买来源</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={recommendation.externalUrl ? handleOpenExternal : handleOpenProduct}
          accessibilityLabel={recommendation.externalUrl ? "打开购买来源" : "查看商品详情页"}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>
            {recommendation.externalUrl ? "购买来源" : "查看商品"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleAddToCart}
          accessibilityLabel="加入购物车"
          accessibilityRole="button"
          disabled={isAddingToCart}
        >
          <LinearGradient colors={[colors.neutral[500], colors.neutral[700]]} style={styles.primaryButtonGradient} />
          {isAddingToCart ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <Ionicons name="cart-outline" size={18} color={colors.surface} />
          )}
          <Text style={styles.primaryButtonText}>加入购物车</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: DesignTokens.spacing[5],
    paddingVertical: Spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconButton: {
    width: DesignTokens.spacing[10],
    height: DesignTokens.spacing[10],
    borderRadius: 20,
    backgroundColor: DesignTokens.colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    position: "relative",
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.12,
    resizeMode: "cover",
  },
  heroPlaceholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.12,
    backgroundColor: DesignTokens.colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  scoreOverlay: {
    position: "absolute",
    left: DesignTokens.spacing[5],
    bottom: DesignTokens.spacing[5],
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['2.5'],
    borderRadius: 999,
  },
  scoreText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.surface,
  },
  infoSection: {
    marginTop: Spacing.md,
    padding: DesignTokens.spacing[5],
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: DesignTokens.typography.sizes['2xl'],
    fontWeight: "700",
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: DesignTokens.spacing[3],
    marginBottom: DesignTokens.spacing[3],
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing['1.5'],
    paddingHorizontal: DesignTokens.spacing['2.5'],
    paddingVertical: DesignTokens.spacing['1.5'],
    borderRadius: 999,
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  metaChipText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
  },
  price: {
    fontSize: DesignTokens.typography.sizes['3xl'],
    fontWeight: "700",
    color: colors.primary,
    marginBottom: DesignTokens.spacing[3],
  },
  description: {
    fontSize: DesignTokens.typography.sizes.base,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  section: {
    marginTop: DesignTokens.spacing[5],
  },
  sectionTitle: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: DesignTokens.spacing[3],
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: DesignTokens.spacing['2.5'],
    marginBottom: DesignTokens.spacing['2.5'],
  },
  reasonText: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.base,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  tag: {
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: Spacing.sm,
    borderRadius: 999,
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  tagText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  linkButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.primary,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  stateText: {
    marginTop: DesignTokens.spacing[3],
    fontSize: DesignTokens.typography.sizes.md,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: "center",
  },
  retryButton: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: DesignTokens.spacing[3],
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  retryButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.surface,
  },
  bottomSpacer: {
    height: 100,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: DesignTokens.spacing[3],
    padding: DesignTokens.spacing[5],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  secondaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: DesignTokens.spacing['3.5'],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: DesignTokens.spacing['3.5'],
    borderRadius: 12,
    overflow: "hidden",
  },
  primaryButtonGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  primaryButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.surface,
  },
});

export default RecommendationDetailScreen;

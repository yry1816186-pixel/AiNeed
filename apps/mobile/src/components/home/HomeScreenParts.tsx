import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { type RecommendedItem } from "../../services/api/tryon.api";
import { DesignTokens } from "../../theme/tokens/design-tokens";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// --- Layout constants used by sub-components ---
const CAROUSEL_CARD_WIDTH = SCREEN_WIDTH * 0.62;
const CAROUSEL_CARD_HEIGHT = CAROUSEL_CARD_WIDTH * 1.18;
const DOT_SIZE = 6;
const DOT_SPACING = 8;
const CATEGORY_ICON_SIZE = 44;
const AI_BALL_PREVIEW_SIZE = 72;
const HORIZONTAL_PADDING = 20;

const AnimatedView = Animated.createAnimatedComponent(View);

// --- Scene/occasion tags for carousel cards ---
const OCCASION_TAGS = ["约会", "通勤", "运动", "休闲"] as const;
const OCCASION_GRADIENTS: Record<string, [string, string]> = {
  约会: [DesignTokens.colors.brand.terracotta, DesignTokens.colors.brand.terracottaLight],
  通勤: [DesignTokens.colors.brand.slate, "DesignTokens.colors.text.tertiary"], // custom color
  运动: [DesignTokens.colors.semantic.success, "DesignTokens.colors.brand.sage"], // custom color
  休闲: [DesignTokens.colors.brand.camel, "DesignTokens.colors.brand.camel"], // custom color
};

// --- Category config ---
const CATEGORIES = [
  {
    key: "tops",
    label: "上装",
    icon: "shirt-outline" as const,
    gradient: [DesignTokens.colors.brand.terracotta, DesignTokens.colors.brand.terracottaLight] as [string, string],
  },
  {
    key: "bottoms",
    label: "下装",
    icon: "remove-outline" as const,
    gradient: [DesignTokens.colors.brand.slate, "DesignTokens.colors.text.tertiary"] as [string, string], // custom color
  },
  {
    key: "shoes",
    label: "鞋靴",
    icon: "footsteps-outline" as const,
    gradient: [DesignTokens.colors.brand.camel, "DesignTokens.colors.brand.camel"] as [string, string], // custom color
  },
  {
    key: "accessories",
    label: "配饰",
    icon: "watch-outline" as const,
    gradient: [DesignTokens.colors.brand.sage, "DesignTokens.colors.brand.sage"] as [string, string], // custom color
  },
] as const;

// =====================================================
// Sub-components
// =====================================================

/**
 * Animated gradient orb that mimics the AI companion ball,
 * but rendered inline as a static preview (no drag/gesture).
 */
export const AIBallPreview: React.FC<{ size: number }> = React.memo(({ size }) => {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    return () => {
      cancelAnimation(scale);
      cancelAnimation(glow);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: interpolate(glow.value, [0, 1], [0.15, 0.35]),
    shadowRadius: interpolate(glow.value, [0, 1], [12, 24]),
  }));

  return (
    <AnimatedView
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          shadowColor: DesignTokens.colors.brand.terracotta,
          shadowOffset: { width: 0, height: 0 },
          elevation: 8,
        },
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={[DesignTokens.colors.brand.terracotta, DesignTokens.colors.brand.camel]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[partStyles.aiBallGradient, { borderRadius: size / 2 }]}
      >
        <View style={[partStyles.aiBallHighlight, { top: size * 0.12, left: size * 0.16 }]} />
        <Text style={[partStyles.aiBallText, { fontSize: size * 0.26 }]}>AI</Text>
      </LinearGradient>
    </AnimatedView>
  );
});

/**
 * Dot indicators for the recommendation carousel.
 */
export const CarouselDots: React.FC<{ count: number; activeIndex: number }> = React.memo(
  ({ count, activeIndex }) => (
    <View style={partStyles.dotsRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[partStyles.dot, i === activeIndex && partStyles.dotActive]} />
      ))}
    </View>
  )
);

/**
 * A single recommendation card inside the carousel.
 */
export const RecommendationCarouselCard: React.FC<{
  item: RecommendedItem & { occasion: string };
  onPress: () => void;
}> = React.memo(({ item, onPress }) => {
  const gradient = OCCASION_GRADIENTS[item.occasion] ?? OCCASION_GRADIENTS["休闲"];

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityLabel={`推荐: ${item.name}`}
      accessibilityRole="button"
      style={partStyles.carouselCardOuter}
    >
      <View style={partStyles.carouselCard}>
        {item.mainImage ? (
          <Image source={{ uri: item.mainImage }} style={partStyles.carouselImage} />
        ) : (
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={partStyles.carouselImage}
          >
            <Ionicons name="shirt-outline" size={36} color="rgba(255,255,255,0.5)" />
          </LinearGradient>
        )}
        {/* Scene tag overlay */}
        <View style={partStyles.carouselTagContainer}>
          <LinearGradient
            colors={["rgba(0,0,0,0.45)", "rgba(0,0,0,0.0)"]}
            style={partStyles.carouselTagGradient}
          >
            <Text style={partStyles.carouselTagText}>{item.occasion}</Text>
          </LinearGradient>
        </View>
        {/* eslint-disable-next-line eqeqeq */}
        {item.score != null && item.score > 0 && (
          <View style={partStyles.carouselScoreBadge}>
            <Ionicons name="star" size={10} color={DesignTokens.colors.semantic.warning} />
            <Text style={partStyles.carouselScoreText}>{Math.round(item.score * 100)}%</Text>
          </View>
        )}
        {/* Card info */}
        <View style={partStyles.carouselInfo}>
          <Text style={partStyles.carouselItemName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={partStyles.carouselPriceRow}>
            {item.brand ? (
              <Text style={partStyles.carouselBrand} numberOfLines={1}>
                {item.brand}
              </Text>
            ) : null}
            {item.price > 0 && <Text style={partStyles.carouselPrice}>&yen;{item.price}</Text>}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

/**
 * Category grid cell.
 */
export const CategoryCell: React.FC<{
  category: (typeof CATEGORIES)[number];
  onPress: () => void;
}> = React.memo(({ category, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={onPress}
    accessibilityLabel={category.label}
    accessibilityRole="button"
    style={partStyles.categoryCell}
  >
    <LinearGradient
      colors={category.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={partStyles.categoryIconCircle}
    >
      <Ionicons
        name={category.icon as React.ComponentProps<typeof Ionicons>["name"]}
        size={20}
        color={DesignTokens.colors.text.inverse}
      />
    </LinearGradient>
    <Text style={partStyles.categoryLabel}>{category.label}</Text>
  </TouchableOpacity>
));

/**
 * Empty state placeholder for community section when no posts are available.
 */
export const CommunityEmptyState: React.FC<{ onPressExplore: () => void }> = React.memo(
  ({ onPressExplore }) => (
    <View style={partStyles.communityEmptyContainer}>
      <View style={partStyles.communityEmptyIconCircle}>
        <Ionicons name="people-outline" size={32} color={DesignTokens.colors.neutral[400]} />
      </View>
      <Text style={partStyles.communityEmptyTitle}>暂无社区内容</Text>
      <Text style={partStyles.communityEmptySubtitle}>快来成为第一个分享穿搭灵感的人吧</Text>
      <TouchableOpacity
        style={partStyles.communityEmptyButton}
        onPress={onPressExplore}
        accessibilityLabel="去逛逛"
        accessibilityRole="button"
      >
        <Text style={partStyles.communityEmptyButtonText}>去逛逛</Text>
      </TouchableOpacity>
    </View>
  )
);

// =====================================================
// Re-exported constants needed by HomeScreen
// =====================================================

export {
  SCREEN_WIDTH,
  CAROUSEL_CARD_WIDTH,
  CAROUSEL_CARD_HEIGHT,
  HORIZONTAL_PADDING,
  CATEGORY_ICON_SIZE,
  AI_BALL_PREVIEW_SIZE,
  DOT_SIZE,
  DOT_SPACING,
  OCCASION_TAGS,
  OCCASION_GRADIENTS,
  CATEGORIES,
};

// =====================================================
// Styles used by sub-components
// =====================================================

const partStyles = StyleSheet.create({
  // --- AI Ball preview ---
  aiBallGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  aiBallHighlight: {
    position: "absolute",
    width: 14,
    height: 7,
    borderRadius: 7,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    transform: [{ rotate: "-30deg" }],
  },
  aiBallText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "700",
    letterSpacing: 1,
  },

  // --- Dots ---
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: DOT_SPACING,
    paddingTop: 12,
    paddingBottom: 4,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: DesignTokens.colors.neutral[300],
  },
  dotActive: {
    width: DOT_SIZE * 2.2,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: DesignTokens.colors.brand.terracotta,
  },

  // --- Carousel card ---
  carouselCardOuter: {
    width: CAROUSEL_CARD_WIDTH,
  },
  carouselCard: {
    borderRadius: 16,
    backgroundColor: DesignTokens.colors.backgrounds.elevated,
    overflow: "hidden",
    ...DesignTokens.shadows.sm,
  },
  carouselImage: {
    width: "100%",
    height: CAROUSEL_CARD_HEIGHT * 0.68,
    backgroundColor: DesignTokens.colors.backgrounds.tertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  carouselTagContainer: {
    position: "absolute",
    top: 12,
    left: 12,
  },
  carouselTagGradient: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  carouselTagText: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "600",
    color: DesignTokens.colors.text.inverse,
    letterSpacing: 0.5,
  },
  carouselScoreBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  carouselScoreText: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "600",
    color: DesignTokens.colors.semantic.warning,
  },
  carouselInfo: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  carouselItemName: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: DesignTokens.colors.text.primary,
  },
  carouselPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,
  },
  carouselBrand: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: DesignTokens.colors.text.tertiary,
    flex: 1,
  },
  carouselPrice: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "700",
    color: DesignTokens.colors.brand.terracotta,
  },

  // --- Category cell ---
  categoryCell: {
    width: (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - 14 * 3) / 4,
    alignItems: "center",
    gap: 10,
  },
  categoryIconCircle: {
    width: CATEGORY_ICON_SIZE,
    height: CATEGORY_ICON_SIZE,
    borderRadius: CATEGORY_ICON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "500",
    color: DesignTokens.colors.text.secondary,
  },

  // --- Community empty state ---
  communityEmptyContainer: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  communityEmptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: DesignTokens.colors.backgrounds.tertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  communityEmptyTitle: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: DesignTokens.colors.text.primary,
    marginBottom: 6,
  },
  communityEmptySubtitle: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.text.tertiary,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 18,
  },
  communityEmptyButton: {
    backgroundColor: DesignTokens.colors.brand.terracotta,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  communityEmptyButtonText: {
    color: DesignTokens.colors.text.inverse,
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
  },
});

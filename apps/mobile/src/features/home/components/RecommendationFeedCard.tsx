import React, { memo, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, type ViewStyle } from "react-native";
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import type { FeedItem } from '../../../services/api/recommendation-feed.api';
import { OptimizedImage } from "../common/OptimizedImage";

interface RecommendationCardProps {
  item: FeedItem;
  onPress: (item: FeedItem) => void;
  onLike?: (item: FeedItem) => void;
  style?: ViewStyle;
  compact?: boolean;
}

export const RecommendationCard = memo(function RecommendationCard({
  item,
  onPress,
  onLike,
  style,
  compact = false,
}: RecommendationCardProps) {
  const handlePress = useCallback(() => onPress(item), [item, onPress]);

  const discount =
    item.originalPrice && item.originalPrice > item.price
      ? Math.round((1 - item.price / item.originalPrice) * 100)
      : 0;

  return (
    <Pressable
      style={[styles.card, compact && styles.cardCompact, style]}
      onPress={handlePress}
      accessibilityLabel={`${item.category}推荐商品`}
      accessibilityRole="button"
    >
      <View style={styles.imageContainer}>
        <OptimizedImage
          source={item.mainImage}
          style={styles.image as ViewStyle}
          resizeMode="cover"
        />
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        )}
        {item.colorHarmony.score >= 85 && (
          <View style={styles.harmonyBadge}>
            <Text style={styles.harmonyText}>{item.colorHarmony.score}%</Text>
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        {item.brand && (
          <Text style={styles.brandName} numberOfLines={1}>
            {item.brand.name}
          </Text>
        )}

        {/* Match score with progress bar */}
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>{item.colorHarmony.score}% 匹配</Text>
          <View style={styles.scoreTrack}>
            <View style={[styles.scoreFill, { width: `${item.colorHarmony.score}%` }]} />
          </View>
        </View>

        {/* Recommendation reason */}
        <Text style={styles.matchReason} numberOfLines={1}>
          推荐理由：{item.matchReason}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>¥{item.price}</Text>
          {item.originalPrice && item.originalPrice > item.price && (
            <Text style={styles.originalPrice}>¥{item.originalPrice}</Text>
          )}
        </View>

        {item.styleTags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.styleTags.slice(0, 2).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
});

const CARD_GAP = 8;
const CARD_PADDING = 12;
const COLUMN_COUNT = 2;
const { width: SCREEN_WIDTH } = require("react-native").Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP) / COLUMN_COUNT;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderRadius: DesignTokens.borderRadius.md,
    overflow: "hidden",
    marginBottom: CARD_GAP,
  },
  cardCompact: {
    width: CARD_WIDTH - CARD_GAP / 2,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 3 / 4,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  discountBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: DesignTokens.colors.semantic.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: DesignTokens.colors.text.inverse,
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "700",
  },
  harmonyBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  harmonyText: {
    color: "#4ADE80", // custom color
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "600",
  },
  infoContainer: {
    padding: 8,
    gap: 4,
  },
  brandName: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: DesignTokens.colors.text.secondary,
    fontWeight: "500",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scoreLabel: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: DesignTokens.colors.brand.terracotta,
    fontWeight: "600",
  },
  scoreTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: DesignTokens.colors.backgrounds.secondary,
    overflow: "hidden",
  },
  scoreFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: DesignTokens.colors.brand.terracotta,
  },
  matchReason: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: DesignTokens.colors.text.tertiary,
    fontWeight: "400",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  price: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "700",
    color: DesignTokens.colors.text.primary,
  },
  originalPrice: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: DesignTokens.colors.text.tertiary,
    textDecorationLine: "line-through",
  },
  tagsRow: {
    flexDirection: "row",
    gap: 4,
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: DesignTokens.colors.backgrounds.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: DesignTokens.colors.text.secondary,
  },
});

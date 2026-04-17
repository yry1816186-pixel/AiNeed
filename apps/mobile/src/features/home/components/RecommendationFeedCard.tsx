import React, { memo, useCallback } from "react";
import { View, Text, Pressable, type ViewStyle } from "react-native";
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import type { FeedItem } from '../../../services/api/recommendation-feed.api';
import { OptimizedImage } from "../common/OptimizedImage";
import { Spacing, flatColors as colors } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';


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
  const { colors } = useTheme();
  const styles = useStyles(colors);
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

const useStyles = createStyles((colors) => ({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
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
    top: DesignTokens.spacing['1.5'],
    left: DesignTokens.spacing['1.5'],
    backgroundColor: colors.error,
    paddingHorizontal: DesignTokens.spacing['1.5'],
    paddingVertical: DesignTokens.spacing['0.5'],
    borderRadius: 4,
  },
  discountText: {
    color: colors.textInverse,
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "700",
  },
  harmonyBadge: {
    position: "absolute",
    top: DesignTokens.spacing['1.5'],
    right: DesignTokens.spacing['1.5'],
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: DesignTokens.spacing['1.5'],
    paddingVertical: DesignTokens.spacing['0.5'],
    borderRadius: 4,
  },
  harmonyText: {
    color: colors.success,
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "600",
  },
  infoContainer: {
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  brandName: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing['1.5'],
  },
  scoreLabel: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.primary,
    fontWeight: "600",
  },
  scoreTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.backgroundSecondary,
    overflow: "hidden",
  },
  scoreFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  matchReason: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.textTertiary,
    fontWeight: "400",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.xs,
  },
  price: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  originalPrice: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.textTertiary,
    textDecorationLine: "line-through",
  },
  tagsRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: DesignTokens.spacing['1.5'],
    paddingVertical: DesignTokens.spacing['0.5'],
    borderRadius: 4,
  },
  tagText: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.textSecondary,
  },
}))

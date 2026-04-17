import React, { memo } from "react";
import { View, Text, TouchableOpacity } from 'react-native';
import FastImage from "react-native-fast-image";
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { Spacing, BorderRadius, Typography, Shadows, DesignTokens, flatColors as colors } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

interface ClothingCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  colors?: string[];
  styleTags?: string[];
  score?: number;
  reasons?: string[];
  onPress?: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
}

/**
 * 服装卡片组件 - 使用 React.memo 优化
 * 避免父组件状态变化时不必要的重渲染
 */
export const ClothingCard = memo(function ClothingCard({
  name,
  price,
  originalPrice,
  image,
  category,
  colors,
  styleTags,
  score,
  reasons,
  onPress,
  onFavorite,
  isFavorite = false,
}: ClothingCardProps) {
  const { colors: themeColors } = useTheme();
  const styles = useStyles(themeColors);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9} accessibilityLabel={`${name}，${category}`} accessibilityRole="button">
      <View style={styles.imageContainer}>
        <FastImage
          source={{ uri: image, priority: FastImage.priority.normal }}
          style={styles.image}
          resizeMode={FastImage.resizeMode.cover}
          accessibilityLabel={`${name}图片`}
          accessibilityRole="image"
        />
        {onFavorite && (
          <TouchableOpacity style={styles.favoriteButton} onPress={onFavorite} activeOpacity={0.7} accessibilityLabel={isFavorite ? "取消收藏" : "收藏"} accessibilityRole="button">
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={18}
              color={isFavorite ? themeColors.error : themeColors.textTertiary}
            />
          </TouchableOpacity>
        )}
        {score !== undefined && (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{(score * 100).toFixed(0)}%</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.category}>{category}</Text>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>¥{price}</Text>
          {originalPrice && originalPrice > price && (
            <Text style={styles.originalPrice}>¥{originalPrice}</Text>
          )}
        </View>
        {colors && colors.length > 0 && (
          <View style={styles.colorRow}>
            {colors.slice(0, 4).map((color, index) => (
              <View
                key={index}
                style={[styles.colorDot, { backgroundColor: getColorCode(color) }]}
              />
            ))}
          </View>
        )}
        {reasons && reasons.length > 0 && (
          <View style={styles.reasonsContainer}>
            <View style={styles.reasonIconContainer}>
              <Ionicons name="sparkles" size={12} color={themeColors.primary} />
            </View>
            <Text style={styles.reasonText} numberOfLines={1}>
              {reasons[0]}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

/**
 * 颜色代码映射函数
 * 服装颜色是物理颜色，不随主题变化，使用 DesignTokens 静态值
 */
const COLOR_MAP: Record<string, string> = {
  black: DesignTokens.colors.neutral[900],
  white: DesignTokens.colors.neutral[50],
  red: DesignTokens.colors.semantic.error,
  blue: DesignTokens.colors.semantic.info,
  green: DesignTokens.colors.semantic.success,
  yellow: DesignTokens.colors.semantic.warning,
  orange: DesignTokens.colors.semantic.warning,
  purple: DesignTokens.colors.brand.terracotta,
  pink: DesignTokens.colors.brand.terracottaLight,
  brown: DesignTokens.colors.brand.terracottaDark,
  gray: DesignTokens.colors.neutral[500],
  beige: DesignTokens.colors.semantic.warningLight,
  navy: DesignTokens.colors.neutral[800],
};

function getColorCode(colorName: string): string {
  return COLOR_MAP[colorName.toLowerCase()] || DesignTokens.colors.neutral[300];
}

const useStyles = createStyles((colors) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    ...Shadows.lg,
    width: 168,
  },
  imageContainer: {
    position: "relative",
    height: 192,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  favoriteButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: DesignTokens.spacing[9],
    height: DesignTokens.spacing[9],
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255,255,255,0.95)",
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.sm,
  },
  scoreBadge: {
    position: "absolute",
    bottom: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  scoreText: {
    color: colors.textInverse,
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "700",
  },
  content: {
    padding: Spacing.md,
  },
  category: {
    ...Typography.caption.sm,
    color: colors.textTertiary,
    marginBottom: Spacing.xs,
    fontWeight: "500",
  },
  name: {
    ...Typography.body.sm,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
    height: 42,
    lineHeight: 21,
    fontWeight: "600",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  price: {
    ...Typography.heading.sm,
    color: colors.primary,
  },
  originalPrice: {
    ...Typography.caption.sm,
    color: colors.textTertiary,
    textDecorationLine: "line-through",
  },
  colorRow: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  colorDot: {
    width: DesignTokens.spacing['3.5'],
    height: DesignTokens.spacing['3.5'],
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  reasonsContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  reasonIconContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  reasonText: {
    ...Typography.caption.sm,
    color: colors.primary,
    fontWeight: "500",
  },
}))

interface ClothingGridProps {
  items: ClothingCardProps[];
  onItemPress?: (item: ClothingCardProps) => void;
  onFavorite?: (item: ClothingCardProps) => void;
  favorites?: Set<string>;
}

/**
 * 服装网格组件 - 使用 React.memo 优化
 */
export const ClothingGrid = memo(function ClothingGrid({
  items,
  onItemPress,
  onFavorite,
  favorites,
}: ClothingGridProps) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.md }}>
      {items.map((item, index) => (
        <ClothingCard
          key={item.id || index}
          {...item}
          isFavorite={favorites?.has(item.id)}
          onPress={() => onItemPress?.(item)}
          onFavorite={() => onFavorite?.(item)}
        />
      ))}
    </View>
  );
});

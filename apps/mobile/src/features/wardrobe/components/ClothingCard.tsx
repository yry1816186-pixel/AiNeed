import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../../../design-system/theme';
import { DesignTokens } from "../../../design-system/theme";

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
              color={isFavorite ? Colors.rose[500] : Colors.neutral[400]}
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
              <Ionicons name="sparkles" size={12} color={Colors.primary[600]} />
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
 */
const COLOR_MAP: Record<string, string> = {
  black: Colors.neutral[900],
  white: Colors.white,
  red: DesignTokens.colors.semantic.error, // custom color
  blue: Colors.sky[500],
  green: Colors.emerald[500],
  yellow: "#EAB308", // custom color
  orange: Colors.amber[500],
  purple: Colors.primary[500],
  pink: DesignTokens.colors.brand.camel, // custom color
  brown: "#92400E", // custom color
  gray: Colors.neutral[500],
  beige: DesignTokens.colors.semantic.warningLight, // custom color
  navy: Colors.sky[900],
};

function getColorCode(colorName: string): string {
  return COLOR_MAP[colorName.toLowerCase()] || Colors.neutral[300];
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
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
    width: 36,
    height: 36,
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
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  scoreText: {
    color: Colors.white,
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "700",
  },
  content: {
    padding: Spacing.md,
  },
  category: {
    ...Typography.caption.sm,
    color: Colors.neutral[400],
    marginBottom: Spacing.xs,
    fontWeight: "500",
  },
  name: {
    ...Typography.body.sm,
    color: Colors.neutral[800],
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
    color: Colors.primary[600],
  },
  originalPrice: {
    ...Typography.caption.sm,
    color: Colors.neutral[400],
    textDecorationLine: "line-through",
  },
  colorRow: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.neutral[200],
  },
  reasonsContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  reasonIconContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
  },
  reasonText: {
    ...Typography.caption.sm,
    color: Colors.primary[600],
    fontWeight: "500",
  },
});

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

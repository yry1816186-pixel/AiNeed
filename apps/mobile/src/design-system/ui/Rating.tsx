import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { Colors, Spacing, BorderRadius, Typography } from '../design-system/theme';

export interface RatingProps {
  value?: number;
  maxStars?: number;
  size?: number;
  readonly?: boolean;
  showValue?: boolean;
  reviewCount?: number;
  variant?: "default" | "compact" | "large";
  onRatingChange?: (rating: number) => void;
  style?: ViewStyle;
}

export const Rating: React.FC<RatingProps> = ({
  value = 0,
  maxStars = 5,
  size = 20,
  readonly = true,
  showValue = false,
  reviewCount,
  variant = "default",
  onRatingChange,
  style,
}) => {
  const sizes = { default: 20, compact: 14, large: 28 };
  const starSize = sizes[variant] || size;

  const handlePress = (index: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(index + 1);
    }
  };

  const getStarIcon = (index: number): keyof typeof Ionicons.glyphMap => {
    const filled = index < Math.floor(value);
    const halfFilled = !filled && index < value;
    if (filled) return "star";
    if (halfFilled) return "star-half";
    return "star-outline";
  };

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: maxStars }).map((_, index) => {
        const filled = index < Math.floor(value);
        const halfFilled = !filled && index < value;
        return (
          <TouchableOpacity
            key={index}
            onPress={() => handlePress(index)}
            disabled={readonly}
            activeOpacity={0.7}
          >
            <Ionicons
              name={getStarIcon(index)}
              size={starSize}
              color={filled || halfFilled ? Colors.amber[500] : Colors.neutral[300]}
            />
          </TouchableOpacity>
        );
      })}
      {showValue && (
        <Text style={[styles.ratingValue, variant === "compact" && styles.ratingValueCompact]}>
          {value.toFixed(1)}
        </Text>
      )}
      {reviewCount !== undefined && (
        <Text style={[styles.reviewCount, variant === "compact" && styles.reviewCountCompact]}>
          ({reviewCount})
        </Text>
      )}
    </View>
  );
};

export interface RatingBadgeProps {
  value: number;
  reviewCount?: number;
  style?: ViewStyle;
}

export const RatingBadge: React.FC<RatingBadgeProps> = ({ value, reviewCount, style }) => (
  <View style={[styles.badgeContainer, style]}>
    <Ionicons name="star" size={14} color={Colors.amber[500]} />
    <Text style={styles.badgeValue}>{value.toFixed(1)}</Text>
    {reviewCount !== undefined && <Text style={styles.badgeCount}> ({reviewCount})</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: Spacing[1] },
  ratingValue: {
    ...Typography.styles.bodySmall,
    color: Colors.neutral[700],
    fontWeight: "600",
    marginLeft: Spacing[2],
  },
  ratingValueCompact: { fontSize: 12 },
  reviewCount: { ...Typography.styles.caption, color: Colors.neutral[500] },
  reviewCountCompact: { fontSize: 10 },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.semantic.successLight,
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.sm,
  },
  badgeValue: { ...Typography.styles.caption, color: "#1B7A3D", fontWeight: "700" },
  badgeCount: { ...Typography.styles.caption, color: Colors.neutral[500] },
});

export default Rating;

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from "react-native";
import { AirbnbRating } from "react-native-ratings";
import { Colors, Spacing, Typography, BorderRadius } from "../../theme";

interface StarIconProps {
  filled: boolean;
  size: number;
  color: string;
}

function StarIcon({ filled, size, color }: StarIconProps) {
  return <Text style={{ fontSize: size, color }}>{filled ? "★" : "☆"}</Text>;
}

interface RatingProps {
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

export function Rating({
  value = 0,
  maxStars = 5,
  size = 20,
  readonly = true,
  showValue = false,
  reviewCount,
  variant = "default",
  onRatingChange,
  style,
}: RatingProps) {
  const sizes = {
    default: 20,
    compact: 14,
    large: 28,
  };

  const starSize = sizes[variant] || size;

  const handlePress = (index: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(index + 1);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: maxStars }).map((_, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => handlePress(index)}
          disabled={readonly}
          activeOpacity={0.7}
        >
          <StarIcon
            filled={index < Math.floor(value)}
            size={starSize}
            color={Colors.amber[500]}
          />
        </TouchableOpacity>
      ))}
      {showValue && (
        <Text
          style={[
            styles.ratingValue,
            variant === "compact" && styles.ratingValueCompact,
          ]}
        >
          {value.toFixed(1)}
        </Text>
      )}
      {reviewCount !== undefined && (
        <Text
          style={[
            styles.reviewCount,
            variant === "compact" && styles.reviewCountCompact,
          ]}
        >
          ({reviewCount})
        </Text>
      )}
    </View>
  );
}

interface StarRatingInputProps {
  value?: number;
  size?: number;
  onRatingChange: (rating: number) => void;
  label?: string;
  style?: ViewStyle;
}

export function StarRatingInput({
  value = 0,
  size = 40,
  onRatingChange,
  label,
  style,
}: StarRatingInputProps) {
  return (
    <View style={[styles.inputContainer, style]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <AirbnbRating
        count={5}
        reviews={["很差", "较差", "一般", "很好", "非常好"]}
        defaultRating={value}
        size={size}
        showRating={false}
        onFinishRating={onRatingChange}
        starContainerStyle={styles.starContainer}
        selectedColor={Colors.amber[500]}
      />
    </View>
  );
}

interface RatingBadgeProps {
  value: number;
  reviewCount?: number;
  style?: ViewStyle;
}

export function RatingBadge({ value, reviewCount, style }: RatingBadgeProps) {
  return (
    <View style={[styles.badgeContainer, style]}>
      <Text style={styles.badgeValue}>{value.toFixed(1)}</Text>
      <Text style={styles.badgeStar}>★</Text>
      {reviewCount !== undefined && (
        <Text style={styles.badgeCount}> ({reviewCount})</Text>
      )}
    </View>
  );
}

interface RatingProgressProps {
  ratings: { stars: number; count: number }[];
  totalReviews: number;
  style?: ViewStyle;
}

export function RatingProgress({
  ratings,
  totalReviews,
  style,
}: RatingProgressProps) {
  return (
    <View style={[styles.progressContainer, style]}>
      {ratings.map((item) => {
        const percentage =
          totalReviews > 0 ? (item.count / totalReviews) * 100 : 0;
        return (
          <View key={item.stars} style={styles.progressRow}>
            <Text style={styles.progressLabel}>{item.stars}★</Text>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${percentage}%` }]}
              />
            </View>
            <Text style={styles.progressCount}>{item.count}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[1],
  },
  ratingValue: {
    ...Typography.body.sm,
    color: Colors.neutral[700],
    fontWeight: "600",
    marginLeft: Spacing[2],
  },
  ratingValueCompact: {
    fontSize: 12,
  },
  reviewCount: {
    ...Typography.caption.sm,
    color: Colors.neutral[500],
  },
  reviewCountCompact: {
    fontSize: 10,
  },
  inputContainer: {
    alignItems: "center",
  },
  inputLabel: {
    ...Typography.body.md,
    color: Colors.neutral[700],
    marginBottom: Spacing[3],
  },
  starContainer: {
    gap: Spacing[2],
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.success[50],
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.sm,
  },
  badgeValue: {
    ...Typography.caption.md,
    color: Colors.success[700],
    fontWeight: "700",
  },
  badgeStar: {
    ...Typography.caption.md,
    color: Colors.amber[500],
    marginLeft: 2,
  },
  badgeCount: {
    ...Typography.caption.sm,
    color: Colors.neutral[500],
  },
  progressContainer: {
    gap: Spacing[2],
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
  },
  progressLabel: {
    ...Typography.caption.md,
    color: Colors.neutral[500],
    width: 28,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.amber[500],
    borderRadius: BorderRadius.full,
  },
  progressCount: {
    ...Typography.caption.md,
    color: Colors.neutral[500],
    width: 40,
    textAlign: "right",
  },
});

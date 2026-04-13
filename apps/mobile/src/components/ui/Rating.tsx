import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export interface RatingProps {
  value?: number;
  maxStars?: number;
  size?: number;
  readonly?: boolean;
  showValue?: boolean;
  reviewCount?: number;
  variant?: 'default' | 'compact' | 'large';
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
  variant = 'default',
  onRatingChange,
  style,
}) => {
  const sizes = { default: 20, compact: 14, large: 28 };
  const starSize = sizes[variant] || size;

  const handlePress = (index: number) => {
    if (!readonly && onRatingChange) onRatingChange(index + 1);
  };

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: maxStars }).map((_, index) => {
        const filled = index < Math.floor(value);
        const halfFilled = !filled && index < value;
        return (
          <TouchableOpacity key={index} onPress={() => handlePress(index)} disabled={readonly} activeOpacity={0.7}>
            <Text style={{ fontSize: starSize, color: filled || halfFilled ? colors.gold[500] : colors.neutral[300] }}>
              {filled ? '★' : halfFilled ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        );
      })}
      {showValue && (
        <Text style={[styles.ratingValue, variant === 'compact' && styles.ratingValueCompact]}>
          {value.toFixed(1)}
        </Text>
      )}
      {reviewCount !== undefined && (
        <Text style={[styles.reviewCount, variant === 'compact' && styles.reviewCountCompact]}>
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
    <Text style={styles.badgeStar}>★</Text>
    <Text style={styles.badgeValue}>{value.toFixed(1)}</Text>
    {reviewCount !== undefined && <Text style={styles.badgeCount}> ({reviewCount})</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: spacing.scale[1] },
  ratingValue: { ...typography.styles.bodySm, color: colors.neutral[700], fontWeight: '600', marginLeft: spacing.scale[2] },
  ratingValueCompact: { fontSize: 12 },
  reviewCount: { ...typography.styles.caption, color: colors.neutral[500] },
  reviewCountCompact: { fontSize: 10 },
  badgeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.semantic.successLight, paddingHorizontal: spacing.scale[2], paddingVertical: spacing.scale[1], borderRadius: spacing.borderRadius.sm },
  badgeStar: { ...typography.styles.caption, color: colors.gold[500] },
  badgeValue: { ...typography.styles.caption, color: '#1B7A3D', fontWeight: '700' },
  badgeCount: { ...typography.styles.caption, color: colors.neutral[500] },
});

export default Rating;

import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography, shadows } from '../../theme';
import { Text } from '../ui/Text';
import type { StylistOutfitItem } from '../../types';

interface OutfitResultCardProps {
  item: StylistOutfitItem;
}

export const OutfitResultCard: React.FC<OutfitResultCardProps> = ({
  item,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>{item.name.charAt(0)}</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text variant="body" style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>¥{item.price}</Text>
          {item.originalPrice && item.originalPrice > item.price && (
            <Text style={styles.originalPrice}>¥{item.originalPrice}</Text>
          )}
        </View>
        <Text variant="bodySmall" style={styles.reason} numberOfLines={2}>
          {item.reason}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 140,
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.card,
  },
  imageContainer: {
    width: 140,
    height: 160,
    backgroundColor: colors.backgroundSecondary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  placeholderText: {
    ...typography.h1,
    color: colors.textTertiary,
  },
  info: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  name: {
    color: colors.textPrimary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  price: {
    ...typography.body,
    fontWeight: '600',
    color: colors.accent,
  },
  originalPrice: {
    ...typography.caption,
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  reason: {
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

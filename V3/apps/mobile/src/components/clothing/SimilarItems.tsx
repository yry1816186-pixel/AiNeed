import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, typography, shadows } from '../../theme';
import type { SimilarItem } from '../../services/clothing.service';

interface SimilarItemsProps {
  title: string;
  items: SimilarItem[];
}

const ITEM_WIDTH = 140;
const ITEM_HEIGHT = 190;

export const SimilarItems: React.FC<SimilarItemsProps> = ({ title, items }) => {
  const router = useRouter();

  if (items.length === 0) return null;

  const handleItemPress = (itemId: string) => {
    router.replace(`/clothing/${itemId}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => handleItemPress(item.id)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={item.name}
          >
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.cardImage}
              contentFit="cover"
              transition={200}
              placeholder={require('../../../assets/placeholder-clothing.png')}
            />
            <View style={styles.cardInfo}>
              <Text style={styles.cardBrand} numberOfLines={1}>
                {item.brand}
              </Text>
              <Text style={styles.cardName} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.priceRow}>
                <Text style={styles.cardPrice}>¥{item.price}</Text>
                {item.originalPrice && item.originalPrice > item.price && (
                  <Text style={styles.cardOriginalPrice}>
                    ¥{item.originalPrice}
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </Animated.ScrollView>
    </View>
  );
};

const Animated = require('react-native-reanimated');

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    width: ITEM_WIDTH,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundCard,
    ...shadows.card,
    overflow: 'hidden',
  },
  cardImage: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    backgroundColor: colors.backgroundSecondary,
  },
  cardInfo: {
    padding: spacing.sm,
    gap: 2,
  },
  cardBrand: {
    ...typography.overline,
    color: colors.textTertiary,
  },
  cardName: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '500' as const,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.accent,
    lineHeight: 18,
  },
  cardOriginalPrice: {
    fontSize: 11,
    color: colors.textDisabled,
    textDecorationLine: 'line-through',
    lineHeight: 14,
  },
});

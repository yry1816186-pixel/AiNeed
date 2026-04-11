import React, { useRef, useCallback } from 'react';
import {
  ScrollView,
  View,
  TouchableOpacity,
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
} from 'react-native';
import { colors, spacing, radius, typography, shadows } from '../../theme';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { OutfitResultCard } from './OutfitResultCard';
import type { StylistOutfit } from '../../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = spacing.md;
const CARD_WIDTH = SCREEN_WIDTH - spacing.xl * 2;

interface OutfitCarouselProps {
  outfits: StylistOutfit[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onTryOn: (outfit: StylistOutfit) => void;
  onFavorite: (outfit: StylistOutfit) => void;
  onTryAll: () => void;
  onRegenerate: () => void;
}

export const OutfitCarousel: React.FC<OutfitCarouselProps> = ({
  outfits,
  currentIndex,
  onIndexChange,
  onTryOn,
  onFavorite,
  onTryAll,
  onRegenerate,
}) => {
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / (CARD_WIDTH + CARD_GAP));
      if (index !== currentIndex && index >= 0 && index < outfits.length) {
        onIndexChange(index);
      }
    },
    [currentIndex, outfits.length, onIndexChange],
  );

  const currentOutfit = outfits[currentIndex] ?? outfits[0];

  if (outfits.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <Text variant="h2" style={styles.title}>
        为你推荐这套:
      </Text>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {outfits.map((outfit, index) => (
          <View key={outfit.id} style={styles.outfitPage}>
            <View style={styles.outfitCard}>
              <Text variant="h3" style={styles.outfitName} numberOfLines={1}>
                {outfit.name}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.itemsRow}
              >
                {outfit.items.map((item) => (
                  <View key={item.id} style={styles.itemWrapper}>
                    <OutfitResultCard item={item} />
                  </View>
                ))}
              </ScrollView>
              {outfit.styleDescription ? (
                <Text variant="bodySmall" style={styles.description} numberOfLines={3}>
                  {outfit.styleDescription}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>

      {outfits.length > 1 && (
        <View style={styles.pagination}>
          {outfits.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}

      {currentOutfit && (
        <View style={styles.actions}>
          <View style={styles.primaryActions}>
            <Button
              variant="primary"
              size="medium"
              onPress={() => onTryOn(currentOutfit)}
              style={styles.actionButton}
            >
              试穿
            </Button>
            <Button
              variant="secondary"
              size="medium"
              onPress={() => onFavorite(currentOutfit)}
              style={styles.actionButton}
            >
              收藏
            </Button>
          </View>
          <View style={styles.secondaryActions}>
            <Button
              variant="text"
              size="small"
              onPress={onRegenerate}
              textStyle={styles.regenerateText}
            >
              换一套
            </Button>
            <Button
              variant="text"
              size="small"
              onPress={onTryAll}
              textStyle={styles.tryAllText}
            >
              全部试穿
            </Button>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    gap: CARD_GAP,
  },
  outfitPage: {
    width: CARD_WIDTH,
  },
  outfitCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.card,
    gap: spacing.md,
  },
  outfitName: {
    color: colors.textPrimary,
  },
  itemsRow: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  itemWrapper: {
    width: 140,
  },
  description: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gray300,
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.accent,
  },
  actions: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  primaryActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  regenerateText: {
    color: colors.textSecondary,
  },
  tryAllText: {
    color: colors.accent,
  },
});

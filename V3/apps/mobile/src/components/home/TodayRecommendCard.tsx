import React, { useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { Text } from '../ui/Text';
import type { ClothingRecommendation } from '../../services/home.service';

interface TodayRecommendCardProps {
  item: ClothingRecommendation;
  onPress: (id: string) => void;
}

const TodayRecommendCard: React.FC<TodayRecommendCardProps> = React.memo(
  ({ item, onPress }) => {
    const handlePress = useCallback(() => {
      onPress(item.id);
    }, [item.id, onPress]);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={item.name}
      >
        <View style={styles.imageContainer}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text variant="caption" color={colors.textTertiary}>
                {item.category}
              </Text>
            </View>
          )}
        </View>
        <Text variant="body2" weight="600" numberOfLines={1} style={styles.name}>
          {item.name}
        </Text>
        <Text variant="caption" color={colors.accent} weight="600">
          ¥{item.price}
        </Text>
      </TouchableOpacity>
    );
  },
);

TodayRecommendCard.displayName = 'TodayRecommendCard';

interface TodayRecommendSectionProps {
  recommendations: ClothingRecommendation[];
  onRefresh: () => void;
  onCardPress: (id: string) => void;
  isRefreshing: boolean;
}

export const TodayRecommendSection: React.FC<TodayRecommendSectionProps> =
  React.memo(({ recommendations, onRefresh, onCardPress, isRefreshing }) => {
    return (
      <View style={styles.section}>
        <View style={styles.header}>
          <Text variant="h3" style={styles.title}>
            今日推荐
          </Text>
          <TouchableOpacity
            onPress={onRefresh}
            disabled={isRefreshing}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="换一套"
          >
            <Text
              variant="bodySmall"
              color={isRefreshing ? colors.textDisabled : colors.accent}
              weight="600"
            >
              {isRefreshing ? '加载中...' : '换一套'}
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {recommendations.map((item) => (
            <TodayRecommendCard
              key={item.id}
              item={item}
              onPress={onCardPress}
            />
          ))}
        </ScrollView>
      </View>
    );
  });

TodayRecommendSection.displayName = 'TodayRecommendSection';

const CARD_WIDTH = 130;

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
  },
  scrollContent: {
    gap: spacing.md,
    paddingRight: spacing.xl,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.md,
    padding: spacing.sm,
    ...shadows.card,
  },
  imageContainer: {
    width: '100%',
    height: 110,
    borderRadius: radius.sm,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: colors.textPrimary,
    marginBottom: 2,
  },
});

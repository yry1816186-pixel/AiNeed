/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  type ImageStyle,
} from "react-native";
import Carousel from "react-native-reanimated-carousel";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { SpringConfigs } from "../../../design-system/theme/tokens/animations";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OutfitItem {
  id: string;
  image: string;
  title: string;
  matchScore: number;
  tags: string[];
}

export interface OutfitCarouselProps {
  items: OutfitItem[];
  onSelect?: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.7;
const CARD_HEIGHT = 320;

// ---------------------------------------------------------------------------
// Custom 3D perspective animation
// ---------------------------------------------------------------------------

const customAnimation = (value: number, _index: number) => {
  "worklet";
  const rotateY = interpolate(value, [-1, 0, 1], [-25, 0, 25], Extrapolate.CLAMP);
  const translateX = interpolate(value, [-1, 0, 1], [-SCREEN_WIDTH * 0.6, 0, SCREEN_WIDTH * 0.6]);
  const scale = interpolate(value, [-1, 0, 1], [0.75, 1, 0.75]);
  const opacity = interpolate(value, [-1, -0.5, 0, 0.5, 1], [0.4, 0.7, 1, 0.7, 0.4]);

  return {
    transform: [{ perspective: 400 }, { rotateY: `${rotateY}deg` }, { translateX }, { scale }],
    opacity,
  } as const;
};

// ---------------------------------------------------------------------------
// CarouselCard — individual card inside the carousel
// ---------------------------------------------------------------------------

interface CarouselCardProps {
  item: OutfitItem;
  onPress: (id: string) => void;
}

const CarouselCard: React.FC<CarouselCardProps> = ({ item, onPress }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, SpringConfigs.snappy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SpringConfigs.bouncy);
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => onPress(item.id)}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <Animated.View style={[styles.card, animatedStyle]}>
        {/* Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.image }} style={styles.image as ImageStyle} />

          {/* Match score badge */}
          <View style={styles.matchBadge}>
            <Text style={styles.matchBadgeText}>{item.matchScore}%</Text>
          </View>

          {/* Tags row */}
          {item.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {item.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagText} numberOfLines={1}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

// ---------------------------------------------------------------------------
// OutfitCarousel
// ---------------------------------------------------------------------------

export const OutfitCarousel: React.FC<OutfitCarouselProps> = ({ items, onSelect }) => {
  const { colors } = useTheme();

  const handleSelect = useCallback(
    (id: string) => {
      onSelect?.(id);
    },
    [onSelect]
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <Carousel
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        data={items}
        loop
        autoPlay={items.length > 1}
        autoPlayInterval={4000}
        scrollAnimationDuration={800}
        onConfigurePanGesture={(gesture) => {
          gesture.activeOffsetX([-10, 10]);
        }}
        customAnimation={customAnimation}
        renderItem={({ item }) => <CarouselCard item={item} onPress={handleSelect} />}
      />
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const useStyles = createStyles((colors) => ({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: DesignTokens.borderRadius.xl,
    backgroundColor: colors.surface,
    overflow: "hidden",
    ...DesignTokens.shadows.md,
  },
  imageContainer: {
    width: "100%",
    height: CARD_HEIGHT - 48,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    backgroundColor: colors.backgroundTertiary,
  },
  matchBadge: {
    position: "absolute",
    top: DesignTokens.spacing[3],
    right: DesignTokens.spacing[3],
    width: 40,
    height: 40,
    borderRadius: DesignTokens.borderRadius.full,
    backgroundColor: DesignTokens.colors.brand.terracotta,
    alignItems: "center",
    justifyContent: "center",
    ...DesignTokens.shadows.sm,
  },
  matchBadgeText: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: DesignTokens.typography.fontWeights.bold,
    color: DesignTokens.colors.neutral.white,
  },
  tagsRow: {
    position: "absolute",
    bottom: DesignTokens.spacing[2],
    left: DesignTokens.spacing[2],
    right: DesignTokens.spacing[2],
    flexDirection: "row",
    flexWrap: "wrap",
    gap: DesignTokens.spacing[1],
  },
  tagPill: {
    paddingHorizontal: DesignTokens.spacing[2],
    paddingVertical: DesignTokens.spacing[1],
    borderRadius: DesignTokens.borderRadius.md,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  tagText: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: DesignTokens.typography.fontWeights.medium,
    color: DesignTokens.colors.neutral.white,
  },
  titleContainer: {
    height: 48,
    paddingHorizontal: DesignTokens.spacing[3],
    justifyContent: "center",
  },
  title: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: DesignTokens.typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
}));

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    paddingVertical: DesignTokens.spacing[4],
  },
});

export default OutfitCarousel;

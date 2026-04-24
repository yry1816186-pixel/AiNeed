import React, { useCallback } from "react";
import { View, Text, Image, Pressable, Platform, StyleSheet, type ImageStyle } from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Heart } from "phosphor-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeInUp,
} from "react-native-reanimated";
import { DesignTokens } from "../theme/tokens/design-tokens";
import { SpringConfigs } from "../theme/tokens/animations";
import { useTheme, createStyles } from "../../shared/contexts/ThemeContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OutfitCardProps {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
  tag?: string;
  matchScore?: number;
  price?: number;
  onPress: (id: string) => void;
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
  index?: number;
}

// ---------------------------------------------------------------------------
// OutfitCard
// ---------------------------------------------------------------------------

export const OutfitCard: React.FC<OutfitCardProps> = ({
  id,
  image,
  title,
  subtitle,
  tag,
  matchScore,
  price,
  onPress,
  onFavorite,
  isFavorite = false,
  index = 0,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  // ---- press animation (scale + shadow elevation) ----
  const pressScale = useSharedValue(1);
  const pressElevation = useSharedValue(2);

  const handlePressIn = useCallback(() => {
    pressScale.value = withSpring(0.97, SpringConfigs.snappy);
    pressElevation.value = withSpring(8, SpringConfigs.snappy);
  }, [pressScale, pressElevation]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withSpring(1, SpringConfigs.bouncy);
    pressElevation.value = withSpring(2, SpringConfigs.bouncy);
  }, [pressScale, pressElevation]);

  const pressAnimatedStyle = useAnimatedStyle(() => {
    const shadow = Platform.select({
      ios: {
        shadowOpacity: 0.06 + pressElevation.value * 0.012,
        shadowRadius: pressElevation.value,
        shadowOffset: { width: 0, height: pressElevation.value * 0.6 },
      },
      android: {
        elevation: pressElevation.value,
      },
    });
    return {
      transform: [{ scale: pressScale.value }],
      ...(shadow ?? {}),
    };
  });

  // ---- heart bounce animation ----
  const heartScale = useSharedValue(1);

  const handleFavoritePress = useCallback(() => {
    onFavorite?.(id);
    heartScale.value = withSequence(
      withSpring(1.4, SpringConfigs.bouncy),
      withSpring(1, SpringConfigs.bouncy)
    );
  }, [onFavorite, id, heartScale]);

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  // ---- stagger entrance ----
  const entering = FadeInUp.delay(index * 50)
    .springify()
    .damping(12)
    .stiffness(180);

  return (
    <Animated.View entering={entering} style={pressAnimatedStyle}>
      <Pressable
        onPress={() => onPress(id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={styles.card}
      >
        {/* Image with gradient overlay */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.image as ImageStyle} />
          <LinearGradient
            colors={["transparent", "rgba(0, 0, 0, 0.5)"]}
            start={{ x: 0, y: 0.4 }}
            end={{ x: 0, y: 1 }}
            style={styles.gradientOverlay}
          />

          {/* Match score badge */}
          {matchScore !== undefined && (
            <View style={styles.matchBadge}>
              <Text style={styles.matchBadgeText}>{matchScore}%</Text>
            </View>
          )}

          {/* Tag pill */}
          {tag && (
            <View style={styles.tagPill}>
              <Text style={styles.tagText} numberOfLines={1}>
                {tag}
              </Text>
            </View>
          )}

          {/* Favorite button */}
          {onFavorite && (
            <Pressable
              onPress={handleFavoritePress}
              hitSlop={8}
              style={styles.favoriteButton}
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? "取消收藏" : "收藏"}
            >
              <Animated.View style={heartAnimatedStyle}>
                <Heart
                  size={20}
                  weight={isFavorite ? "fill" : "regular"}
                  color={
                    isFavorite
                      ? DesignTokens.colors.brand.terracotta
                      : DesignTokens.colors.neutral.white
                  }
                />
              </Animated.View>
            </Pressable>
          )}
        </View>

        {/* Info section */}
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
          {price !== undefined && <Text style={styles.price}>¥{price.toFixed(2)}</Text>}
        </View>
      </Pressable>
    </Animated.View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const useStyles = createStyles((colors) => ({
  card: {
    width: 160,
    borderRadius: DesignTokens.borderRadius.xl,
    backgroundColor: colors.surface,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 2,
      },
    }),
  },
  imageContainer: {
    width: "100%",
    height: 200,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    backgroundColor: colors.backgroundTertiary,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  matchBadge: {
    position: "absolute",
    top: DesignTokens.spacing[2],
    left: DesignTokens.spacing[2],
    width: 36,
    height: 36,
    borderRadius: DesignTokens.borderRadius.full,
    backgroundColor: DesignTokens.colors.brand.terracotta,
    alignItems: "center",
    justifyContent: "center",
  },
  matchBadgeText: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: DesignTokens.typography.fontWeights.bold,
    color: DesignTokens.colors.neutral.white,
    lineHeight: undefined,
  },
  tagPill: {
    position: "absolute",
    bottom: DesignTokens.spacing[2],
    left: DesignTokens.spacing[2],
    paddingHorizontal: DesignTokens.spacing[2],
    paddingVertical: DesignTokens.spacing[1],
    borderRadius: DesignTokens.borderRadius.md,
    backgroundColor: `${DesignTokens.colors.brand.terracotta}26`, // 15% opacity ≈ hex 26
  },
  tagText: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: DesignTokens.typography.fontWeights.semibold,
    color: DesignTokens.colors.brand.terracotta,
  },
  favoriteButton: {
    position: "absolute",
    top: DesignTokens.spacing[2],
    right: DesignTokens.spacing[2],
    width: 32,
    height: 32,
    borderRadius: DesignTokens.borderRadius.full,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoContainer: {
    padding: DesignTokens.spacing[3],
  },
  title: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: DesignTokens.typography.fontWeights.semibold,
    color: colors.textPrimary,
    lineHeight: DesignTokens.typography.sizes.base * DesignTokens.typography.lineHeights.snug,
  },
  subtitle: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.textTertiary,
    marginTop: DesignTokens.spacing[1],
    lineHeight: DesignTokens.typography.sizes.xs * DesignTokens.typography.lineHeights.normal,
  },
  price: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: DesignTokens.typography.fontWeights.bold,
    color: DesignTokens.colors.brand.terracotta,
    marginTop: DesignTokens.spacing[1],
  },
}));

export default OutfitCard;

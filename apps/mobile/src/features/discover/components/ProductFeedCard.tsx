import React, { useCallback } from "react";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import { Heart } from "phosphor-react-native";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { SpringConfigs } from "../../../design-system/theme/tokens/animations";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeInUp,
} from "react-native-reanimated";

interface ProductFeedCardProps {
  id: string;
  image: string;
  title: string;
  price?: number;
  matchScore?: number;
  isFavorite?: boolean;
  onPress: (id: string) => void;
  onFavorite?: (id: string) => void;
  index?: number;
}

export function ProductFeedCard({
  id,
  image,
  title,
  price,
  matchScore,
  isFavorite = false,
  onPress,
  onFavorite,
  index = 0,
}: ProductFeedCardProps) {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const pressScale = useSharedValue(1);
  const heartScale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    pressScale.value = withSpring(0.97, SpringConfigs.snappy);
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withSpring(1, SpringConfigs.bouncy);
  }, [pressScale]);

  const handlePress = useCallback(() => {
    onPress(id);
  }, [onPress, id]);

  const handleFavorite = useCallback(() => {
    heartScale.value = withSequence(
      withSpring(1.4, SpringConfigs.bouncy),
      withSpring(1, SpringConfigs.bouncy)
    );
    onFavorite?.(id);
  }, [onFavorite, id, heartScale]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 50)
        .springify()
        .damping(12)
        .stiffness(180)}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={styles.card}
      >
        <Animated.View style={[styles.innerCard, cardAnimatedStyle]}>
          {/* Image area */}
          <View style={styles.imageContainer}>
            {image ? (
              <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>{title[0]}</Text>
              </View>
            )}
            {/* Gradient overlay */}
            <View style={styles.gradientOverlay} />

            {/* Match score badge */}
            {matchScore != null && (
              <View style={styles.matchBadge}>
                <Text style={styles.matchText}>{matchScore}%</Text>
              </View>
            )}

            {/* Favorite button */}
            {onFavorite && (
              <Pressable onPress={handleFavorite} hitSlop={8} style={styles.favoriteButton}>
                <Animated.View style={heartAnimatedStyle}>
                  <Heart
                    size={18}
                    weight={isFavorite ? "fill" : "regular"}
                    color={
                      isFavorite
                        ? DesignTokens.colors.semantic.error
                        : DesignTokens.colors.text.inverse
                    }
                  />
                </Animated.View>
              </Pressable>
            )}
          </View>

          {/* Info area */}
          <View style={styles.infoContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {price != null && <Text style={styles.price}>¥{price}</Text>}
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const useStyles = createStyles((colors) => ({
  card: {
    borderRadius: DesignTokens.borderRadius.xl,
    overflow: "hidden",
  },
  innerCard: {
    borderRadius: DesignTokens.borderRadius.xl,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  imageContainer: {
    position: "relative",
    height: 200,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: {
    fontSize: DesignTokens.typography.sizes["4xl"],
    fontWeight: DesignTokens.typography.fontWeights.bold,
    color: colors.primary,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundGradient: undefined,
  },
  matchBadge: {
    position: "absolute",
    top: DesignTokens.spacing[2],
    left: DesignTokens.spacing[2],
    width: 36,
    height: 36,
    borderRadius: DesignTokens.borderRadius.full,
    backgroundColor: DesignTokens.colors.brand.terracotta,
    justifyContent: "center",
    alignItems: "center",
  },
  matchText: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: DesignTokens.typography.fontWeights.bold,
    color: DesignTokens.colors.text.inverse,
  },
  favoriteButton: {
    position: "absolute",
    top: DesignTokens.spacing[2],
    right: DesignTokens.spacing[2],
    width: 32,
    height: 32,
    borderRadius: DesignTokens.borderRadius.full,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: {
    padding: DesignTokens.spacing[3],
  },
  title: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: DesignTokens.typography.fontWeights.medium,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  price: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: DesignTokens.typography.fontWeights.bold,
    color: colors.primary,
  },
}));

/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, type TextStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInUp,
} from "react-native-reanimated";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { SpringConfigs } from "../../../design-system/theme/tokens/animations";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import { MatchScoreBadge } from "../../../design-system/ui/MatchScoreBadge";

export interface OutfitItem {
  id: string;
  image: string;
  title: string;
  matchScore: number;
}

export interface OutfitResultBubbleProps {
  outfits: {
    id: string;
    image: string;
    title: string;
    matchScore: number;
  }[];
  onViewDetail?: (id: string) => void;
}

/**
 * OutfitResultBubble - Embedded outfit recommendation result in chat.
 *
 * Design:
 * - Card container with rounded corners, surface background
 * - Horizontal scroll of mini outfit cards (120px wide)
 * - Each mini card: image placeholder, title, match score badge
 * - Stagger animation: each card delays by index * 100ms using FadeInUp
 * - Overall container animates in with spring scale
 */
export const OutfitResultBubble: React.FC<OutfitResultBubbleProps> = ({
  outfits,
  onViewDetail,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const containerScale = useSharedValue(0);

  useEffect(() => {
    containerScale.value = withSpring(1, SpringConfigs.bouncy);
  }, []);

  const containerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: containerScale.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerAnimStyle]}>
      <Text style={styles.sectionTitle}>推荐搭配</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {outfits.map((outfit, index) => (
          <Animated.View key={outfit.id} entering={FadeInUp.delay(index * 100).springify()}>
            <OutfitMiniCard outfit={outfit} onPress={onViewDetail} />
          </Animated.View>
        ))}
      </ScrollView>
    </Animated.View>
  );
};

/** Individual mini outfit card */
interface OutfitMiniCardProps {
  outfit: {
    id: string;
    image: string;
    title: string;
    matchScore: number;
  };
  onPress?: (id: string) => void;
}

const OutfitMiniCard: React.FC<OutfitMiniCardProps> = ({ outfit, onPress }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  return (
    <Pressable
      style={styles.miniCard}
      onPress={() => onPress?.(outfit.id)}
      accessibilityRole="button"
      accessibilityLabel={outfit.title}
    >
      {/* Image placeholder */}
      <View style={styles.imagePlaceholder}>
        <Text style={styles.placeholderIcon}>👗</Text>
      </View>

      {/* Title */}
      <Text style={styles.cardTitle} numberOfLines={1}>
        {outfit.title}
      </Text>

      {/* Match score */}
      <View style={styles.scoreContainer}>
        <MatchScoreBadge score={outfit.matchScore} size="sm" animated />
      </View>
    </Pressable>
  );
};

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: DesignTokens.borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: DesignTokens.spacing[3],
      maxWidth: "85%",
      alignSelf: "flex-start",
      ...DesignTokens.shadows.xs,
    },
    sectionTitle: {
      fontSize: DesignTokens.typography.sizes.sm,
      fontWeight: DesignTokens.typography.fontWeights.semibold as TextStyle["fontWeight"],
      color: DesignTokens.colors.brand.terracotta,
      marginBottom: DesignTokens.spacing[2],
    },
    scrollContent: {
      gap: DesignTokens.spacing[2],
    },
    miniCard: {
      width: 120,
      borderRadius: DesignTokens.borderRadius.lg,
      backgroundColor: colors.surfaceSecondary,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    imagePlaceholder: {
      width: 120,
      height: 100,
      backgroundColor: colors.backgroundTertiary,
      alignItems: "center",
      justifyContent: "center",
    },
    placeholderIcon: {
      fontSize: 28,
    },
    cardTitle: {
      fontSize: DesignTokens.typography.sizes.xs,
      fontWeight: DesignTokens.typography.fontWeights.medium as TextStyle["fontWeight"],
      color: colors.textPrimary,
      paddingHorizontal: DesignTokens.spacing[2],
      paddingTop: DesignTokens.spacing[2],
    },
    scoreContainer: {
      paddingHorizontal: DesignTokens.spacing[2],
      paddingBottom: DesignTokens.spacing[2],
      paddingTop: DesignTokens.spacing[1],
      alignItems: "flex-end",
    },
  })
);

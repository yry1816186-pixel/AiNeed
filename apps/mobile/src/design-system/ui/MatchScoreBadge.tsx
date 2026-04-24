import React, { useEffect } from "react";
import { View, Text, StyleSheet, type TextStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  cancelAnimation,
} from "react-native-reanimated";
import { DesignTokens } from "../theme/tokens/design-tokens";
import { SpringConfigs } from "../theme/tokens/animations";
import { useTheme, createStyles } from "../../shared/contexts/ThemeContext";

export interface MatchScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

const SIZE_CONFIG = {
  sm: { dimension: 36, fontSize: 10, borderWidth: 2 },
  md: { dimension: 44, fontSize: 12, borderWidth: 2.5 },
  lg: { dimension: 56, fontSize: 16, borderWidth: 3 },
} as const;

type ScoreTier = "high" | "medium" | "low";

function getScoreTier(score: number): ScoreTier {
  if (score >= 80) {
    return "high";
  }
  if (score >= 60) {
    return "medium";
  }
  return "low";
}

function getTierColor(tier: ScoreTier): { bg: string; text: string; border: string } {
  switch (tier) {
    case "high":
      return {
        bg: DesignTokens.colors.semantic.successLight,
        text: DesignTokens.colors.semantic.success,
        border: DesignTokens.colors.semantic.success,
      };
    case "medium":
      return {
        bg: "rgba(198, 123, 92, 0.12)",
        text: DesignTokens.colors.brand.terracotta,
        border: DesignTokens.colors.brand.terracotta,
      };
    case "low":
      return {
        bg: DesignTokens.colors.semantic.warningLight,
        text: DesignTokens.colors.semantic.warning,
        border: DesignTokens.colors.semantic.warning,
      };
  }
}

/**
 * MatchScoreBadge - Animated score badge showing match percentage.
 *
 * Design:
 * - Circle with score text + "%" label
 * - Score animates from 0 to target over 800ms
 * - Scale spring entrance (bouncy)
 * - Color coded: green >=80, terracotta >=60, warning <60
 * - Three sizes: sm (36), md (44), lg (56)
 */
export const MatchScoreBadge: React.FC<MatchScoreBadgeProps> = ({
  score,
  size = "md",
  animated = true,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const config = SIZE_CONFIG[size];
  const tier = getScoreTier(score);
  const tierColors = getTierColor(tier);

  const displayScore = useSharedValue(animated ? 0 : score);
  const scale = useSharedValue(animated ? 0 : 1);

  useEffect(() => {
    if (animated) {
      displayScore.value = withTiming(score, { duration: 800 });
      scale.value = withSpring(1, SpringConfigs.bouncy);
    }

    return () => {
      cancelAnimation(displayScore);
      cancelAnimation(scale);
    };
  }, [score, animated]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const roundedScore = Math.round(score);

  return (
    <Animated.View
      style={[
        {
          width: config.dimension,
          height: config.dimension,
          borderRadius: config.dimension / 2,
          backgroundColor: tierColors.bg,
          borderWidth: config.borderWidth,
          borderColor: tierColors.border,
          alignItems: "center",
          justifyContent: "center",
        },
        animatedContainerStyle,
      ]}
    >
      <Text
        style={[
          styles.scoreText,
          {
            fontSize: config.fontSize,
            color: tierColors.text,
          },
        ]}
        adjustsFontSizeToFit
      >
        {roundedScore}
      </Text>
      <Text
        style={[
          styles.percentLabel,
          {
            fontSize: Math.max(config.fontSize - 4, 7),
            color: tierColors.text,
          },
        ]}
      >
        %
      </Text>
    </Animated.View>
  );
};

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    scoreText: {
      fontWeight: DesignTokens.typography.fontWeights.bold as TextStyle["fontWeight"],
      lineHeight: undefined,
      textAlign: "center",
    },
    percentLabel: {
      fontWeight: DesignTokens.typography.fontWeights.semibold as TextStyle["fontWeight"],
      lineHeight: undefined,
      textAlign: "center",
      marginTop: -2,
    },
  })
);

import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { SpringConfigs } from "../../../design-system/theme/tokens/animations";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from "react-native-reanimated";

interface RecommendReasonTagProps {
  reason: string;
  variant?: "brand" | "sage";
}

export function RecommendReasonTag({ reason, variant = "brand" }: RecommendReasonTagProps) {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.05, SpringConfigs.rubber),
      withSpring(1, SpringConfigs.rubber)
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isBrand = variant === "brand";

  return (
    <Animated.View style={animatedStyle}>
      {isBrand ? (
        <LinearGradient
          colors={DesignTokens.gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={staticStyles.tagBase}
        >
          <Text style={staticStyles.tagTextBrand}>{reason}</Text>
        </LinearGradient>
      ) : (
        <View style={[staticStyles.tagBase, styles.sageBackground]}>
          <Text style={styles.sageText}>{reason}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const staticStyles = StyleSheet.create({
  tagBase: {
    borderRadius: DesignTokens.borderRadius.full,
    paddingHorizontal: DesignTokens.spacing[2],
    paddingVertical: DesignTokens.spacing.px,
  },
  tagTextBrand: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: DesignTokens.typography.fontWeights.medium,
    color: DesignTokens.colors.text.inverse,
  },
});

const useStyles = createStyles((colors) => ({
  sageBackground: {
    backgroundColor: DesignTokens.colors.brand.sageLight,
  },
  sageText: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: DesignTokens.typography.fontWeights.medium,
    color: DesignTokens.colors.brand.sageDark,
  },
}));

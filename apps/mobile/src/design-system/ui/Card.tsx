/**
 * Card - UI layer re-export with extended variants
 *
 * This file provides the UI-layer Card with additional theme tokens
 * and gradient support. Core animation logic uses Reanimated.
 */
import React from "react";
import { View, Pressable, ViewStyle, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import * as Haptics from "@/src/polyfills/expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Colors, Spacing, BorderRadius, Shadows, gradients, SpringConfigs } from '../design-system/theme';

// Re-export from primitives for backward compatibility
export {
  Card as PrimitiveCard,
  ProductCard as PrimitiveProductCard,
} from "../../design-system/primitives/Card";
export type {
  CardProps as PrimitiveCardProps,
  CardVariant as PrimitiveCardVariant,
  CardPadding as PrimitiveCardPadding,
  ProductCardProps as PrimitiveProductCardProps,
} from "../../design-system/primitives/Card";

export type CardVariant = "elevated" | "outlined" | "filled" | "glass" | "gradient";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  gradientColors?: [string, string, ...string[]];
  glassIntensity?: number;
  hapticFeedback?: boolean;
}

const paddingConfig: Record<CardPadding, number> = {
  none: 0,
  sm: Spacing.sm,
  md: Spacing.lg,
  lg: Spacing.xl,
};

export const Card: React.FC<CardProps> = ({
  variant = "elevated",
  padding = "md",
  interactive = false,
  onPress,
  onLongPress,
  children,
  style,
  gradientColors,
  glassIntensity = 80,
  hapticFeedback = true,
}) => {
  const scaleAnim = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const handlePressIn = React.useCallback(() => {
    if (!interactive) {
      return;
    }
    if (hapticFeedback && Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    scaleAnim.value = withSpring(0.98, SpringConfigs.snappy);
  }, [interactive, hapticFeedback]);

  const handlePressOut = React.useCallback(() => {
    if (!interactive) {
      return;
    }
    scaleAnim.value = withSpring(1, SpringConfigs.bouncy);
  }, [interactive]);

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case "elevated":
        return { backgroundColor: Colors.neutral.white, ...Shadows.md };
      case "outlined":
        return {
          backgroundColor: Colors.neutral.white,
          borderWidth: 1,
          borderColor: Colors.neutral[200],
        };
      case "filled":
        return { backgroundColor: Colors.neutral[50] };
      case "glass":
        return { backgroundColor: `rgba(255, 255, 255, ${glassIntensity / 100})` };
      case "gradient":
        return {};
      default:
        return {};
    }
  };

  const containerStyle: ViewStyle = {
    borderRadius: BorderRadius.xl,
    padding: paddingConfig[padding],
    overflow: "hidden",
    ...getVariantStyle(),
  };

  const renderContent = () => {
    if (variant === "gradient") {
      const gColors = gradientColors || gradients.brand;
      return (
        <LinearGradient
          colors={gColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={containerStyle}
        >
          {children}
        </LinearGradient>
      );
    }
    if (variant === "glass") {
      return (
        <BlurView intensity={glassIntensity} tint="light" style={containerStyle}>
          {children}
        </BlurView>
      );
    }
    return <View style={containerStyle}>{children}</View>;
  };

  if (!interactive || !onPress) {
    return <View style={[containerStyle, style]}>{children}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onLongPress}
      style={{ overflow: "visible" }}
    >
      <Animated.View style={[animatedStyle, style]}>
        {renderContent()}
      </Animated.View>
    </Pressable>
  );
};

export default Card;

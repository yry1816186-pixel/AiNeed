import React from "react";
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
  Pressable,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import * as Haptics from "@/src/polyfills/expo-haptics";
import { useTheme } from "../../theme/themeStore";
import { semanticTokens } from "../../theme/tokens/generated/semantic-tokens";
import { componentTokens } from "../../theme/tokens/generated/component-tokens";
import { SpringConfigs, Duration } from "../../theme/tokens/animations";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "text" | "gradient" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  children: React.ReactNode;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  hapticFeedback?: boolean;
  gradientColors?: string[];
  activeOpacity?: number;
  accessibilityLabel?: string;
}

const sizeConfig: Record<
  ButtonSize,
  { height: number; paddingHorizontal: number; fontSize: number; borderRadius: number }
> = {
  sm: {
    height: 36,
    paddingHorizontal: 16,
    fontSize: semanticTokens.typography.body.small.fontSize,
    borderRadius: semanticTokens.radius.button.default,
  },
  md: {
    height: 44,
    paddingHorizontal: 20,
    fontSize: semanticTokens.typography.body.default.fontSize,
    borderRadius: semanticTokens.radius.button.default,
  },
  lg: {
    height: 52,
    paddingHorizontal: 24,
    fontSize: semanticTokens.typography.body.default.fontSize,
    borderRadius: semanticTokens.radius.button.default,
  },
  xl: {
    height: 60,
    paddingHorizontal: 32,
    fontSize: semanticTokens.typography.body.large.fontSize,
    borderRadius: semanticTokens.radius.button.default,
  },
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = "left",
  children,
  onPress,
  onPressIn,
  onPressOut,
  onLongPress,
  style,
  textStyle,
  hapticFeedback = true,
  gradientColors,
  activeOpacity = 0.8,
  accessibilityLabel,
}) => {
  const theme = useTheme();
  const scaleAnim = useSharedValue(1);
  const glowAnim = useSharedValue(0);

  const config = sizeConfig[size];
  const btn = theme.components.button;

  const getVariantColors = (): { bg: string; text: string; border: string } => {
    if (disabled)
      return {
        bg: btn.disabled.background as string,
        text: btn.disabled.text as string,
        border: btn.disabled.border as string,
      };

    switch (variant) {
      case "primary":
        return {
          bg: btn.primary.background as string,
          text: btn.primary.text as string,
          border: btn.primary.border as string,
        };
      case "secondary":
        return {
          bg: "transparent",
          text: btn.secondary.text as string,
          border: btn.secondary.border as string,
        };
      case "ghost":
      case "text":
        return { bg: "transparent", text: btn.ghost.text as string, border: "transparent" };
      case "danger":
        return {
          bg: theme.colors.status.error,
          text: theme.colors.text.inverse,
          border: "transparent",
        };
      case "gradient":
        return { bg: "transparent", text: theme.colors.text.inverse, border: "transparent" };
      default:
        return {
          bg: btn.primary.background as string,
          text: btn.primary.text as string,
          border: btn.primary.border as string,
        };
    }
  };

  const variantColor = getVariantColors();

  const triggerHaptic = React.useCallback(() => {
    if (hapticFeedback && Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [hapticFeedback]);

  const handlePressIn = React.useCallback(() => {
    triggerHaptic();
    onPressIn?.();
    scaleAnim.value = withSpring(0.96, SpringConfigs.snappy);
    glowAnim.value = withTiming(1, { duration: Duration.fast });
  }, [triggerHaptic, onPressIn]);

  const handlePressOut = React.useCallback(() => {
    onPressOut?.();
    scaleAnim.value = withSpring(1, SpringConfigs.bouncy);
    glowAnim.value = withTiming(0, { duration: Duration.normal });
  }, [onPressOut]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const handlePress = React.useCallback(() => {
    if (!disabled && !loading) onPress?.();
  }, [disabled, loading, onPress]);

  const handleLongPress = React.useCallback(() => {
    if (!disabled && !loading) {
      if (hapticFeedback && Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onLongPress?.();
    }
  }, [disabled, loading, hapticFeedback, onLongPress]);

  const isDisabled = disabled || loading;
  const isOutline = variant === "secondary";
  const isGhostOrText = variant === "ghost" || variant === "text";

  const containerStyle: ViewStyle = {
    height: config.height,
    paddingHorizontal: config.paddingHorizontal,
    borderRadius: config.borderRadius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    opacity: isDisabled && !disabled ? 0.5 : disabled ? 0.5 : 1,
    overflow: "hidden",
    backgroundColor: variantColor.bg,
    borderWidth: isOutline ? 1.5 : 0,
    borderColor: variantColor.border,
    ...(fullWidth && { width: "100%" }),
  };

  const textStyleMerged: TextStyle = {
    fontSize: config.fontSize,
    fontWeight: "600" as const,
    color: variantColor.text,
    ...textStyle,
  };

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isGhostOrText || isOutline ? variantColor.text : variantColor.text}
        />
      ) : (
        <>
          {icon && iconPosition === "left" && <>{icon}</>}
          <Text style={[textStyleMerged, icon ? { marginHorizontal: 8 } : {}]}>{children}</Text>
          {icon && iconPosition === "right" && <>{icon}</>}
        </>
      )}
    </>
  );

  const gradients = gradientColors || [
    theme.colors.interactive.primary,
    theme.colors.interactive.hover,
  ];

  if (variant === "gradient") {
    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        disabled={isDisabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        style={({ pressed }) => [
          { opacity: pressed ? activeOpacity : 1 },
          fullWidth && { width: "100%" },
        ]}
      >
        <Animated.View style={[animatedStyle, style]}>
          <LinearGradient
            colors={gradients as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={containerStyle}
          >
            {renderContent()}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={handleLongPress}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        { opacity: pressed && !isDisabled ? activeOpacity : 1 },
        fullWidth && { width: "100%" },
      ]}
    >
      <Animated.View
        style={[containerStyle, animatedStyle, variant === "primary" && theme.shadows.card, style]}
      >
        {renderContent()}
      </Animated.View>
    </Pressable>
  );
};

export const IconButton: React.FC<Omit<ButtonProps, "children"> & { icon: React.ReactNode }> = ({
  icon,
  size = "md",
  variant = "ghost",
  ...props
}) => {
  const sizeMap = { sm: 32, md: 40, lg: 48, xl: 56 };
  return (
    <Button
      variant={variant}
      size={size}
      {...props}
      style={StyleSheet.flatten([{ width: sizeMap[size], paddingHorizontal: 0 }, props.style])}
    >
      {icon}
    </Button>
  );
};

export default Button;

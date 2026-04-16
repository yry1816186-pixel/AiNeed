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
import { Colors, BorderRadius, Shadows } from '../theme';
import { SpringConfigs, Duration } from "../../../theme/tokens/animations";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "gradient" | "danger";
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
}

const sizeConfig: Record<
  ButtonSize,
  {
    height: number;
    paddingHorizontal: number;
    fontSize: number;
    borderRadius: number;
  }
> = {
  sm: {
    height: 36,
    paddingHorizontal: 16,
    fontSize: DesignTokens.typography.sizes.base,
    borderRadius: BorderRadius.lg,
  },
  md: {
    height: 44,
    paddingHorizontal: 20,
    fontSize: DesignTokens.typography.sizes.md,
    borderRadius: BorderRadius.xl,
  },
  lg: {
    height: 52,
    paddingHorizontal: 24,
    fontSize: DesignTokens.typography.sizes.md,
    borderRadius: BorderRadius.xl,
  },
  xl: {
    height: 60,
    paddingHorizontal: 32,
    fontSize: DesignTokens.typography.sizes.lg,
    borderRadius: BorderRadius["2xl"],
  },
};

const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
  primary: {
    container: {
      backgroundColor: Colors.primary[500],
    },
    text: {
      color: Colors.white,
    },
  },
  secondary: {
    container: {
      backgroundColor: Colors.neutral[100],
    },
    text: {
      color: Colors.neutral[800],
    },
  },
  outline: {
    container: {
      backgroundColor: "transparent",
      borderWidth: 1.5,
      borderColor: Colors.primary[500],
    },
    text: {
      color: Colors.primary[500],
    },
  },
  ghost: {
    container: {
      backgroundColor: "transparent",
    },
    text: {
      color: Colors.primary[500],
    },
  },
  gradient: {
    container: {
      backgroundColor: "transparent",
    },
    text: {
      color: Colors.white,
    },
  },
  danger: {
    container: {
      backgroundColor: Colors.error[500],
    },
    text: {
      color: Colors.white,
    },
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
}) => {
  const scaleAnim = useSharedValue(1);
  const glowAnim = useSharedValue(0);

  const config = sizeConfig[size];
  const vStyle = variantStyles[variant];

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
    if (!disabled && !loading) {
      onPress?.();
    }
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

  const containerStyle: ViewStyle = {
    height: config.height,
    paddingHorizontal: config.paddingHorizontal,
    borderRadius: config.borderRadius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    opacity: isDisabled ? 0.5 : 1,
    overflow: "hidden",
    ...(fullWidth && { width: "100%" }),
    ...vStyle.container,
  };

  const textStyleMerged: TextStyle = {
    fontSize: config.fontSize,
    fontWeight: "600",
    ...vStyle.text,
    ...textStyle,
  };

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "outline" || variant === "ghost" ? Colors.primary[500] : Colors.white}
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

  if (variant === "gradient") {
    const colors = gradientColors || Colors.gradient.hero;

    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          { opacity: pressed ? activeOpacity : 1 },
          fullWidth && { width: "100%" },
        ]}
      >
        <Animated.View style={[animatedStyle, style]}>
          <LinearGradient
            colors={colors as [string, string, ...string[]]}
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
      style={({ pressed }) => [
        { opacity: pressed ? activeOpacity : 1 },
        fullWidth && { width: "100%" },
      ]}
    >
      <Animated.View
        style={[
          containerStyle,
          animatedStyle,
          variant === "primary" && Shadows.md,
          style,
        ]}
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
  const sizeMap = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 56,
  };

  return (
    <Button
      variant={variant}
      size={size}
      {...props}
      style={StyleSheet.flatten([
        {
          width: sizeMap[size],
          paddingHorizontal: 0,
        },
        props.style,
      ])}
    >
      {icon}
    </Button>
  );
};

export default Button;

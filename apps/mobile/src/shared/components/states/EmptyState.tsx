import React, { useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ViewStyle } from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";

import { DesignTokens } from "../../../theme/tokens/design-tokens";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { flatColors as colors } from "../../../design-system/theme";
import { createStyles } from "../../contexts/ThemeContext";

const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);

const springConfig = {
  damping: 15,
  stiffness: 150,
  mass: 0.5,
};

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap | "custom";
  customIcon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  illustration?:
    | "empty-box"
    | "search"
    | "error"
    | "no-internet"
    | "no-notification"
    | "no-favorite"
    | "no-order"
    | "no-cart";
  style?: ViewStyle;
  animated?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  customIcon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  illustration,
  style,
  animated = true,
}) => {
  const styles = useStyles(colors);
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const floatY = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, springConfig);
    opacity.value = withTiming(1, { duration: 400 });

    if (animated) {
      floatY.value = withRepeat(
        withSequence(
          withTiming(-10, {
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );

      rotation.value = withRepeat(
        withSequence(
          withTiming(5, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(-5, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [animated]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const floatAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }, { rotateZ: `${rotation.value}deg` }],
  }));

  const getIllustrationIcon = () => {
    switch (illustration) {
      case "empty-box":
        return { icon: "cube-outline", color: colors.neutral[400] };
      case "search":
        return { icon: "search-outline", color: colors.primary[400] };
      case "error":
        return { icon: "alert-circle-outline", color: colors.error[400] };
      case "no-internet":
        return { icon: "cloud-offline-outline", color: colors.warning[400] };
      case "no-notification":
        return {
          icon: "notifications-off-outline",
          color: colors.neutral[400],
        };
      case "no-favorite":
        return { icon: "heart-outline", color: colors.error[300] };
      case "no-order":
        return { icon: "receipt-outline", color: colors.neutral[400] };
      case "no-cart":
        return { icon: "cart-outline", color: colors.neutral[400] };
      default:
        return {
          icon: icon || "help-circle-outline",
          color: colors.neutral[400],
        };
    }
  };

  const iconConfig = getIllustrationIcon();

  return (
    <AnimatedView style={[styles.emptyContainer, containerAnimatedStyle, style]}>
      <AnimatedView style={[styles.emptyIconContainer, floatAnimatedStyle]}>
        {customIcon ? (
          customIcon
        ) : (
          <View style={[styles.emptyIconCircle, { backgroundColor: `${iconConfig.color}20` }]}>
            <Ionicons name={iconConfig.icon} size={56} color={iconConfig.color} />
          </View>
        )}
      </AnimatedView>

      <Text style={styles.emptyTitle}>{title}</Text>
      {description && <Text style={styles.emptyDescription}>{description}</Text>}

      {actionLabel && onAction && (
        <TouchableOpacity style={styles.emptyAction} onPress={onAction}>
          <LinearGradient
            colors={[DesignTokens.colors.brand.slateLight, DesignTokens.colors.brand.slateDark]}
            style={styles.emptyActionGradient}
          >
            <Text style={styles.emptyActionText}>{actionLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {secondaryActionLabel && onSecondaryAction && (
        <TouchableOpacity style={styles.emptySecondaryAction} onPress={onSecondaryAction}>
          <Text style={styles.emptySecondaryText}>{secondaryActionLabel}</Text>
        </TouchableOpacity>
      )}
    </AnimatedView>
  );
};

const useStyles = createStyles((colors) => ({
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: colors.neutral[800],
    textAlign: "center",
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.neutral[500],
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyAction: {
    borderRadius: 24,
    overflow: "hidden",
  },
  emptyActionGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  emptyActionText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textInverse,
  },
  emptySecondaryAction: {
    marginTop: 12,
    paddingVertical: 10,
  },
  emptySecondaryText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.primary[500],
    fontWeight: "500",
  },
}));

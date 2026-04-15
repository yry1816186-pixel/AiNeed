/**
 * EmptyState - UI layer re-export from primitives/EmptyState
 *
 * This file re-exports the canonical EmptyState from primitives/EmptyState
 * with additional UI-layer-specific styling.
 *
 * @deprecated Use `primitives/EmptyState` for the canonical implementation.
 * This file is kept for backward compatibility.
 */
import React from "react";
import { Text, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Colors, Spacing, BorderRadius, Typography, gradients } from '../design-system/theme';

// Re-export from primitives for backward compatibility
export {
  EmptyState as PrimitiveEmptyState,
  EmptyCart,
  EmptyFavorites,
  EmptyOrders,
  EmptySearch,
  EmptyNotifications,
  EmptyWardrobe,
  EmptyRecommendations,
  EmptyPosts,
  EmptyGeneric,
} from "../../design-system/primitives/EmptyState";

export interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

/**
 * EmptyState - UI-layer variant with FadeInUp animation
 *
 * @deprecated Use `primitives/EmptyState` for the canonical implementation.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "shirt-outline",
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}) => {
  return (
    <Animated.View entering={FadeInUp.duration(600).springify()} style={[styles.container, style]}>
      <LinearGradient
        colors={[Colors.primary[50], Colors.sage[50]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconContainer}
      >
        <Ionicons name={icon} size={56} color={Colors.sage[400]} />
      </LinearGradient>

      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction} activeOpacity={0.8}>
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionGradient}
          >
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["3xl"] * 2,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.styles.h4,
    color: Colors.neutral[900],
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.styles.body,
    color: Colors.neutral[500],
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  actionGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  actionLabel: {
    ...Typography.styles.button,
    color: Colors.neutral.white,
  },
});

export default EmptyState;

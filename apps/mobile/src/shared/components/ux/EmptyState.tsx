import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { Ionicons } from "../../polyfills/expo-vector-icons";
import { LinearGradient } from "../../polyfills/expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../design-system/theme';

/**
 * EmptyState - UX layer variant
 *
 * @deprecated Use `primitives/EmptyState` instead. This component is kept
 * for backward compatibility but will be removed in a future version.
 */
interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: "default" | "illustration";
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function EmptyState({
  icon = "folder-open-outline",
  title,
  description,
  actionLabel,
  onAction,
  _variant = "default",
  accessibilityLabel,
  style,
}: EmptyStateProps) {
  const label = accessibilityLabel || `空状态: ${title}`;
  return (
    <Animated.View
      entering={FadeInUp.duration(500).springify()}
      style={[styles.container, style]}
      accessibilityLabel={label}
      accessibilityRole="summary"
    >
      <View style={styles.iconContainer}>
        <LinearGradient
          colors={[Colors.primary[50], Colors.sage[50]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconGradient}
        >
          <Ionicons name={icon} size={48} color={Colors.primary[500]} />
        </LinearGradient>
      </View>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          activeOpacity={0.8}
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing[10] },
  iconContainer: { marginBottom: Spacing[6] },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...Typography.heading.lg,
    color: Colors.neutral[800],
    textAlign: "center",
    marginBottom: Spacing[2],
  },
  description: {
    ...Typography.body.md,
    color: Colors.neutral[500],
    textAlign: "center",
    maxWidth: 280,
    marginBottom: Spacing[6],
  },
  actionButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing[8],
    paddingVertical: Spacing[3],
    borderRadius: BorderRadius.xl,
    ...Shadows.md,
  },
  actionText: { ...Typography.styles.button, color: Colors.neutral.white },
});

export default EmptyState;

import React from "react";
import { View, Text, TouchableOpacity, ViewStyle, StyleSheet } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../design-system/theme';

export interface IconCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  onPress?: () => void;
  variant?: "primary" | "accent" | "success" | "warning";
  style?: ViewStyle;
}

export const IconCard: React.FC<IconCardProps> = ({
  icon,
  title,
  description,
  onPress,
  variant = "primary",
  style,
}) => {
  const bgColors: Record<string, string> = {
    primary: Colors.primary[100],
    accent: Colors.accent[100],
    success: Colors.success[100],
    warning: Colors.warning[100],
  };

  const iconColors: Record<string, string> = {
    primary: Colors.primary[600],
    accent: Colors.accent[600],
    success: Colors.success[600],
    warning: Colors.warning[600],
  };

  return (
    <TouchableOpacity style={[styles.iconCard, style]} onPress={onPress} activeOpacity={0.9}>
      <View style={[styles.iconWrapper, { backgroundColor: bgColors[variant] }]}>
        <Ionicons name={icon} size={28} color={iconColors[variant]} />
      </View>
      <Text style={[Typography.heading.sm, styles.iconTitle]}>{title}</Text>
      {description && <Text style={[Typography.body.sm, styles.iconDesc]}>{description}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  iconCard: {
    flex: 1,
    backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: "center",
    ...Shadows.md,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  iconTitle: {
    color: Colors.neutral[800],
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  iconDesc: {
    color: Colors.neutral[500],
    textAlign: "center",
  },
});

export default IconCard;

import React from "react";
import { View, Text, TouchableOpacity, ViewStyle, StyleSheet } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { Colors, Spacing, BorderRadius, Typography, Shadows } from "../../design-system/theme";
import { useTheme, createStyles } from "../../shared/contexts/ThemeContext";

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
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const bgColors: Record<string, string> = {
    primary: colors.primary[100],
    accent: Colors.accent[100],
    success: colors.success[100],
    warning: colors.warning[100],
  };

  const iconColors: Record<string, string> = {
    primary: colors.primary[600],
    accent: Colors.accent[600],
    success: colors.success[600],
    warning: colors.warning[600],
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

const useStyles = createStyles((colors) => ({
  iconCard: {
    flex: 1,
    backgroundColor: colors.neutral[0],
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
    color: colors.neutral[800],
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  iconDesc: {
    color: colors.neutral[500],
    textAlign: "center",
  },
}));

export default IconCard;

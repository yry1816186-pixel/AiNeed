import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from "react-native";
import { Colors, Spacing, BorderRadius, Typography } from '../../design-system/theme';
import { Spacing } from '../theme';
import { DesignTokens } from '../theme/tokens/design-tokens';
import { useTheme } from '../../design-system/theme';



export type BadgeVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "neutral"
  | "gold"
  | "season";
export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export type ColorSeasonKey = "spring" | "summer" | "autumn" | "winter";

export interface SeasonBadgeProps {
  season: ColorSeasonKey;
  size?: BadgeSize;
  style?: ViewStyle;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: Colors.primary[100], text: Colors.primary[700] },
  secondary: { bg: Colors.sage[100], text: Colors.sage[700] },
  success: { bg: Colors.semantic.successLight, text: DesignTokens.colors.semantic.success },
  warning: { bg: Colors.semantic.warningLight, text: DesignTokens.colors.semantic.warning },
  error: { bg: Colors.semantic.errorLight, text: DesignTokens.colors.semantic.error },
  neutral: { bg: Colors.neutral[100], text: Colors.neutral[700] },
  gold: { bg: Colors.amber[100], text: Colors.amber[700] },
  season: { bg: Colors.neutral[50], text: Colors.primary[500] },
};

const sizeStyles: Record<
  BadgeSize,
  { paddingHorizontal: number; paddingVertical: number; fontSize: number; borderRadius: number }
> = {
  sm: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    fontSize: Typography.sizes.xs,
    borderRadius: BorderRadius.sm,
  },
  md: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing[2],
    fontSize: Typography.sizes.xs,
    borderRadius: BorderRadius.md,
  },
  lg: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.sm,
    borderRadius: BorderRadius.lg,
  },
};

export const Badge: React.FC<BadgeProps> = ({
  text,
  variant = "primary",
  size = "md",
  icon,
  onPress,
  style,
  textStyle,
}) => {
  const { colors } = useTheme();
  const vStyle = variantStyles[variant];
  const sStyle = sizeStyles[size];

  const content = (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: vStyle.bg,
          paddingHorizontal: sStyle.paddingHorizontal,
          paddingVertical: sStyle.paddingVertical,
          borderRadius: sStyle.borderRadius,
        },
        style,
      ]}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text
        style={[{ fontSize: sStyle.fontSize, color: vStyle.text, fontWeight: "600" }, textStyle]}
      >
        {text}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export const SeasonBadge: React.FC<SeasonBadgeProps> = ({ season, size = "md", style }) => {
  const seasonData = Colors.colorSeasons[season];
  const sStyle = sizeStyles[size];

  return (
    <View
      style={[
        styles.seasonBadge,
        {
          backgroundColor: seasonData.bg,
          paddingHorizontal: sStyle.paddingHorizontal,
          paddingVertical: sStyle.paddingVertical,
          borderRadius: sStyle.borderRadius,
        },
        style,
      ]}
    >
      <View style={styles.seasonDots}>
        {seasonData.colors.slice(0, 3).map((color, i) => (
          <View key={i} style={[styles.seasonDot, { backgroundColor: color }]} />
        ))}
      </View>
      <Text style={{ fontSize: sStyle.fontSize, color: Colors.primary[700], fontWeight: "600" }}>
        {seasonData.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start" },
  iconContainer: { marginRight: Spacing[1] },
  seasonBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start" },
  seasonDots: { flexDirection: "row", marginRight: Spacing[2] },
  seasonDot: { width: Spacing.sm, height: Spacing.sm, borderRadius: 4, marginRight: DesignTokens.spacing['0.5']},
});

export default Badge;

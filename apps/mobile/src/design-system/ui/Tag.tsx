import React from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors, Spacing, BorderRadius, Typography } from "../../design-system/theme";
import { useTheme, createStyles } from "../../shared/contexts/ThemeContext";

export interface TagProps {
  text: string;
  selected?: boolean;
  onPress?: () => void;
  variant?: "primary" | "accent" | "success" | "warning" | "error";
}

export const Tag: React.FC<TagProps> = ({
  text,
  selected = false,
  onPress,
  variant = "primary",
}) => {
  const styles = useStyles(colors);
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const variantColors: Record<string, string> = {
    primary: colors.primary[500],
    accent: Colors.accent[500],
    success: colors.success[500],
    warning: colors.warning[500],
    error: colors.error[500],
  };

  const color = variantColors[variant];
  const bgColor = selected ? color : colors.neutral[50];
  const textColor = selected ? colors.neutral[0] : colors.neutral[600];
  const borderColor = selected ? color : colors.neutral[200];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.tagBase,
        {
          backgroundColor: bgColor,
          borderWidth: selected ? 0 : 1,
          borderColor,
        },
      ]}
      activeOpacity={0.8}
    >
      <Text
        style={[Typography.body.sm, { color: textColor, fontWeight: selected ? "600" : "500" }]}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
};

const useStyles = createStyles((colors) => ({
  tagBase: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
}));

export default Tag;

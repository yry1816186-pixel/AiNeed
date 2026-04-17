import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { flatColors as colors } from '../../../design-system/theme';

interface MatchBadgeProps {
  percentage: number;
  size?: "small" | "default";
}

export const MatchBadge: React.FC<MatchBadgeProps> = ({ percentage, size = "default" }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const clampedPercentage = Math.min(Math.max(percentage, 0), 99);

  return (
    <View style={[styles.badge, size === "small" ? styles.badgeSmall : styles.badgeDefault]}>
      <Text style={[styles.text, size === "small" ? styles.textSmall : styles.textDefault]}>
        {clampedPercentage}%
      </Text>
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  badge: {
    backgroundColor: "colors.primary",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  badgeDefault: {
    width: DesignTokens.spacing[11],
    height: DesignTokens.spacing[7],
    borderRadius: 14,
  },
  badgeSmall: {
    width: 34,
    height: 22,
    borderRadius: 11,
  },
  text: {
    color: colors.surface,
    fontWeight: "600",
  },
  textDefault: {
    fontSize: DesignTokens.typography.sizes.sm,
  },
  textSmall: {
    fontSize: DesignTokens.typography.sizes.xs,
  },
}))

export default MatchBadge;

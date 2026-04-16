import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { DesignTokens } from "../../design-system/theme/tokens/design-tokens";

interface MatchBadgeProps {
  percentage: number;
  size?: "small" | "default";
}

export const MatchBadge: React.FC<MatchBadgeProps> = ({ percentage, size = "default" }) => {
  const clampedPercentage = Math.min(Math.max(percentage, 0), 99);

  return (
    <View style={[styles.badge, size === "small" ? styles.badgeSmall : styles.badgeDefault]}>
      <Text style={[styles.text, size === "small" ? styles.textSmall : styles.textDefault]}>
        {clampedPercentage}%
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: "#C67B5C",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  badgeDefault: {
    width: 44,
    height: 28,
    borderRadius: 14,
  },
  badgeSmall: {
    width: 34,
    height: 22,
    borderRadius: 11,
  },
  text: {
    color: DesignTokens.colors.backgrounds.primary,
    fontWeight: "600",
  },
  textDefault: {
    fontSize: 13,
  },
  textSmall: {
    fontSize: 11,
  },
});

export default MatchBadge;

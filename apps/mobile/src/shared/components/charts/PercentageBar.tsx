import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/src/theme/tokens/colors";
import { typography } from "@/src/theme/tokens/typography";
import { spacing } from "@/src/theme/tokens/spacing";

interface PercentageBarProps {
  label: string;
  percentage: number;
  color?: string;
  showPercentage?: boolean;
}

export const PercentageBar: React.FC<PercentageBarProps> = ({
  label,
  percentage,
  color = colors.brand.primary,
  showPercentage = true,
}) => {
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label} accessibilityLabel={label}>
          {label}
        </Text>
        {showPercentage && (
          <Text style={styles.percentage} accessibilityLabel={`${clampedPercentage}%`}>
            {clampedPercentage}%
          </Text>
        )}
      </View>
      <View style={styles.track} accessibilityLabel={`${label}进度条`}>
        <View style={[styles.fill, { width: `${clampedPercentage}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.aliases.sm,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.scale[1],
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.neutral[700],
  },
  percentage: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[500],
  },
  track: {
    height: 6,
    borderRadius: spacing.borderRadius.full,
    backgroundColor: colors.neutral[200],
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: spacing.borderRadius.full,
  },
});

export default PercentageBar;

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { DesignTokens, Spacing, flatColors as colors } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

interface FreeShippingProgressProps {
  currentAmount: number;
  threshold?: number;
}

export const FreeShippingProgress: React.FC<FreeShippingProgressProps> = ({
  currentAmount,
  threshold = 99,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const isFree = currentAmount >= threshold;
  const progress = Math.min(currentAmount / threshold, 1);
  const remaining = threshold - currentAmount;

  return (
    <View style={styles.container}>
      {isFree ? (
        <Text style={styles.freeText}>已免运费</Text>
      ) : (
        <Text style={styles.progressText}>再买¥{remaining.toFixed(0)}免运费</Text>
      )}
      <View style={styles.barBackground}>
        <View
          style={[
            styles.barFill,
            { width: `${progress * 100}%` },
            isFree && styles.barFillComplete,
          ]}
        />
      </View>
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  progressText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
    marginBottom: Spacing.xs,
  },
  freeText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: "colors.success",
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  barBackground: {
    height: Spacing.xs,
    borderRadius: 2,
    backgroundColor: "colors.backgroundTertiary",
  },
  barFill: {
    height: Spacing.xs,
    borderRadius: 2,
    backgroundColor: "colors.success",
  },
  barFillComplete: {
    backgroundColor: "colors.success",
  },
}))

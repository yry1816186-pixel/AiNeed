import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { DesignTokens } from "../../../design-system/theme";

interface FreeShippingProgressProps {
  currentAmount: number;
  threshold?: number;
}

export const FreeShippingProgress: React.FC<FreeShippingProgressProps> = ({
  currentAmount,
  threshold = 99,
}) => {
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

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  progressText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.text.tertiary,
    marginBottom: 4,
  },
  freeText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: "#52C41A",
    fontWeight: "500",
    marginBottom: 4,
  },
  barBackground: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#F0F0F0",
  },
  barFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#52C41A",
  },
  barFillComplete: {
    backgroundColor: "#52C41A",
  },
});

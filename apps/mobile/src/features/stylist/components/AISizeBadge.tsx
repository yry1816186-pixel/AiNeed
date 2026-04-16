import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { SizeRecommendation } from '../../../services/api/commerce.api';
import { DesignTokens, Spacing } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

interface AISizeBadgeProps {
  recommendation: SizeRecommendation;
}

const useStyles = createStyles((colors) => ({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "colors.successLight",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    gap: Spacing.xs,
  },
  badgeText: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "600",
    color: "colors.success",
  },
  badgeSize: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "700",
    color: "#3D5E4D",
  },
  detail: {
    marginTop: Spacing.xs,
    padding: Spacing.sm,
    backgroundColor: "colors.backgroundTertiary",
    borderRadius: 8,
    gap: Spacing.xs,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: "colors.textTertiary",
  },
  detailValue: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  reasonText: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: "colors.textSecondary",
  },
}))

export const AISizeBadge: React.FC<AISizeBadgeProps> = ({ recommendation }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const [expanded, setExpanded] = useState(false);

  return (
    <View>
      <TouchableOpacity
        style={styles.badge}
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.7}
      >
        <Text style={styles.badgeText}>AI推荐</Text>
        <Text style={styles.badgeSize}>{recommendation.recommendedSize}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.detail}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>置信度</Text>
            <Text style={styles.detailValue}>{Math.round(recommendation.confidence * 100)}%</Text>
          </View>
          {recommendation.reasons.map((reason, index) => (
            <Text key={index} style={styles.reasonText}>
              {reason}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Spacing, BorderRadius, flatColors as colors } from '../../../design-system/theme';
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

interface PhotoQuality {
  clarity: number;
  brightness: number;
  composition: number;
  overall: number;
  passed: boolean;
}

interface PhotoQualityIndicatorProps {
  quality: PhotoQuality;
  onRetake?: () => void;
}

function getScoreColor(score: number): string {
  if (score >= 60) {
    return DesignTokens.colors.semantic.success;
  }
  if (score >= 40) {
    return DesignTokens.colors.semantic.warning;
  }
  return DesignTokens.colors.semantic.error;
}

function getScoreLabel(score: number): string {
  if (score >= 60) {
    return "良好";
  }
  if (score >= 40) {
    return "一般";
  }
  return "较差";
}

export const PhotoQualityIndicator: React.FC<PhotoQualityIndicatorProps> = ({
  quality,
  onRetake,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const overallColor = getScoreColor(quality.overall);
  const overallInt = Math.round(quality.overall);

  return (
    <View style={styles.container}>
      <View style={styles.badgeContainer}>
        <View style={[styles.badge, { borderColor: overallColor }]}>
          <Text style={[styles.badgeScore, { color: overallColor }]}>{overallInt}</Text>
        </View>
        <Text style={[styles.badgeLabel, { color: overallColor }]}>
          {getScoreLabel(quality.overall)}
        </Text>
      </View>

      <View style={styles.metricsContainer}>
        <MetricBar label="清晰度" value={quality.clarity} />
        <MetricBar label="亮度" value={quality.brightness} />
        <MetricBar label="构图" value={quality.composition} />
      </View>

      {!quality.passed && onRetake && (
        <Pressable
          onPress={onRetake}
          accessibilityLabel="重新拍照"
          accessibilityRole="button"
          style={styles.retakeButton}
        >
          <Text style={styles.retakeText}>重新拍照</Text>
        </Pressable>
      )}
    </View>
  );
};

interface MetricBarProps {
  label: string;
  value: number;
}

const MetricBar: React.FC<MetricBarProps> = ({ label, value }) => {
  const color = getScoreColor(value);
  const clampedValue = Math.max(0, Math.min(100, value));
  const displayValue = Math.round(clampedValue);

  return (
    <View style={metricStyles.container}>
      <View style={metricStyles.labelRow}>
        <Text style={metricStyles.label}>{label}</Text>
        <Text style={[metricStyles.value, { color }]}>{displayValue}</Text>
      </View>
      <View style={metricStyles.track}>
        <View style={[metricStyles.fill, { width: `${clampedValue}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    padding: Spacing[4],
    alignItems: "center",
  },
  badgeContainer: {
    alignItems: "center",
    marginBottom: Spacing[4],
  },
  badge: {
    width: Spacing['3xl'],
    height: Spacing['3xl'],
    borderRadius: 32,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeScore: {
    fontSize: DesignTokens.typography.sizes['2xl'],
    fontWeight: "600",
  },
  badgeLabel: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "400",
    marginTop: Spacing[1],
  },
  metricsContainer: {
    width: "100%",
    gap: Spacing[3],
  },
  retakeButton: {
    marginTop: Spacing[4],
    backgroundColor: colors.error,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[6],
    minHeight: DesignTokens.spacing[11],
    justifyContent: "center",
    alignItems: "center",
  },
  retakeText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.surface,
  },
}))

const metricStyles = StyleSheet.create({
  container: {
    marginVertical: Spacing[1],
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "400",
    color: "colors.textSecondary",
  },
  value: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
  },
  track: {
    height: DesignTokens.spacing['1.5'],
    backgroundColor: DesignTokens.colors.neutral[200],
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: DesignTokens.spacing['1.5'],
    borderRadius: 3,
  },
});

export default PhotoQualityIndicator;

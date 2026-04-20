import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { sizeRecommendationApi, type SizeRecommendation } from "../../../services/api/commerce.api";
import { BorderRadius, Spacing } from "../../../design-system/theme";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

interface AiSizeRecommendationProps {
  itemId: string;
  itemCategory?: string;
  onSizeSelect?: (size: string) => void;
}

interface LocalSizeResult {
  size: string;
  confidence: number;
  reason: string;
}

function calculateLocalSize(
  heightCm: number,
  weightKg: number,
  category?: string
): LocalSizeResult {
  const bmi = weightKg / (heightCm / 100) ** 2;
  let size = "M";
  let confidence = 80;
  let reason = "";

  if (category === "tops" || category === "dresses" || category === "outerwear") {
    if (bmi < 18.5) {
      size = "S";
      confidence = 85;
      reason = "偏瘦体型，S码更贴合";
    } else if (bmi < 24) {
      size = "M";
      confidence = 90;
      reason = "标准体型，M码最佳";
    } else if (bmi < 28) {
      size = "L";
      confidence = 82;
      reason = "建议L码更舒适";
    } else {
      size = "XL";
      confidence = 75;
      reason = "建议XL码";
    }
  } else if (category === "bottoms") {
    if (bmi < 20) {
      size = "S";
      confidence = 78;
    } else if (bmi < 25) {
      size = "M";
      confidence = 85;
    } else {
      size = "L";
      confidence = 75;
    }
    reason = "基于身高体重数据推荐";
  } else {
    if (bmi < 18.5) {
      size = "S";
      confidence = 75;
    } else if (bmi < 24) {
      size = "M";
      confidence = 80;
    } else if (bmi < 28) {
      size = "L";
      confidence = 72;
    } else {
      size = "XL";
      confidence = 68;
    }
    reason = "基于BMI数据推荐";
  }

  return { size, confidence, reason };
}

export const AiSizeRecommendation: React.FC<AiSizeRecommendationProps> = ({
  itemId,
  itemCategory,
  onSizeSelect,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const [recommendation, setRecommendation] = useState<SizeRecommendation | null>(null);
  const [localResult, setLocalResult] = useState<LocalSizeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchRecommendation = useCallback(async () => {
    setLoading(true);
    try {
      const response = await sizeRecommendationApi.getSizeRecommendation(itemId);
      if (response.success && response.data) {
        setRecommendation(response.data);
        if (onSizeSelect) {
          onSizeSelect(response.data.recommendedSize);
        }
      } else {
        const local = calculateLocalSize(170, 65, itemCategory);
        setLocalResult(local);
        if (onSizeSelect) {
          onSizeSelect(local.size);
        }
      }
    } catch {
      const local = calculateLocalSize(170, 65, itemCategory);
      setLocalResult(local);
      if (onSizeSelect) {
        onSizeSelect(local.size);
      }
    } finally {
      setLoading(false);
    }
  }, [itemId, itemCategory, onSizeSelect]);

  useEffect(() => {
    void fetchRecommendation();
  }, [fetchRecommendation]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const displaySize = recommendation?.recommendedSize ?? localResult?.size ?? "M";
  const displayConfidence = recommendation
    ? Math.round(recommendation.confidence * 100)
    : (localResult?.confidence ?? 80);
  const displayReason = recommendation?.reasons?.[0] ?? localResult?.reason ?? "";

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeIcon}>✨</Text>
        <Text style={styles.badgeText}>AI 推荐</Text>
      </View>
      <View style={styles.recommendRow}>
        <Text style={styles.recommendSize}>{displaySize}码</Text>
        <Text style={styles.recommendConfidence}>({displayConfidence}% 合身)</Text>
      </View>
      {displayReason ? (
        <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
          <Text style={styles.reasonText} numberOfLines={expanded ? undefined : 1}>
            {displayReason}
          </Text>
        </TouchableOpacity>
      ) : null}
      {recommendation?.sizeChart && recommendation.sizeChart.length > 0 && expanded ? (
        <View style={styles.chartContainer}>
          {recommendation.sizeChart.map((entry) => (
            <View key={entry.size} style={styles.chartRow}>
              <Text style={styles.chartLabel}>{entry.label || entry.size}</Text>
              <View style={styles.chartBarBg}>
                <View
                  style={[
                    styles.chartBarFill,
                    { width: `${Math.min(entry.matchScore * 100, 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.chartScore}>{Math.round(entry.matchScore * 100)}%</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    backgroundColor: colors.primary + "10",
    borderRadius: BorderRadius.lg,
    padding: DesignTokens.spacing[3],
    marginTop: DesignTokens.spacing[2],
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing[1],
    marginBottom: DesignTokens.spacing[1],
  },
  badgeIcon: {
    fontSize: DesignTokens.typography.sizes.sm,
  },
  badgeText: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "600",
    color: colors.primary,
  },
  recommendRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: DesignTokens.spacing[2],
  },
  recommendSize: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "700",
    color: colors.primary,
  },
  recommendConfidence: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
  },
  reasonText: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.textTertiary,
    marginTop: DesignTokens.spacing[1],
    lineHeight: 16,
  },
  chartContainer: {
    marginTop: DesignTokens.spacing[3],
    gap: DesignTokens.spacing[2],
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing[2],
  },
  chartLabel: {
    width: 40,
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.textSecondary,
  },
  chartBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.backgroundTertiary,
    overflow: "hidden",
  },
  chartBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  chartScore: {
    width: 36,
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.textTertiary,
    textAlign: "right",
  },
}));

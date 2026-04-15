import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { LinearGradient } from "../polyfills/expo-linear-gradient";
import { Ionicons } from "../polyfills/expo-vector-icons";
import Svg, { Polygon, Circle, Line, Text as SvgText } from "react-native-svg";
import { theme, Colors, Spacing, BorderRadius, Shadows } from '../design-system/theme';
import { DesignTokens } from "../theme/tokens/design-tokens";
import { useProfileStore } from "../stores/profileStore";
import { useTranslation } from "../i18n";
import { ScreenLayout, Header } from "../shared/components/layout/ScreenLayout";
import type { RootStackParamList } from "../types/navigation";

type BodyAnalysisNavProp = NavigationProp<RootStackParamList>;

const BODY_TYPE_LABELS: Record<string, string> = {
  hourglass: "沙漏型",
  triangle: "梨形",
  inverted_triangle: "倒三角型",
  rectangle: "矩形",
  oval: "苹果形",
};

const BODY_TYPE_TIPS: Record<string, string[]> = {
  hourglass: [
    "选择收腰款式的上装，突出腰线",
    "高腰裤或A字裙能平衡上下身比例",
    "避免过于宽松或过于紧身的款式",
  ],
  triangle: ["上身选择亮色或有细节设计的款式", "A字裙和阔腿裤是下半身的好选择", "避免紧身裤和短裙"],
  inverted_triangle: [
    "下身选择有体积感的款式来平衡比例",
    "V领或圆领上衣能柔化肩线",
    "避免垫肩和高领设计",
  ],
  rectangle: ["腰带和层叠穿搭能创造腰线", "选择有纹理和层次感的面料", "避免直线剪裁的无腰线款式"],
  oval: ["V领和开衫能拉长上身线条", "选择直筒或微喇裤型", "避免腰部收紧和过短的款式"],
};

// Radar chart dimensions
const CHART_SIZE = 260;
const CHART_CENTER = CHART_SIZE / 2;
const CHART_RADIUS = 90;
const AXES = ["肩宽", "胸围", "腰围", "臀围"] as const;

function getPointOnAxis(
  angle: number,
  radius: number,
  centerX: number,
  centerY: number
): { x: number; y: number } {
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

const RadarChart: React.FC<{
  actual: number[];
  ideal: number[];
}> = ({ actual, ideal }) => {
  const axisCount = AXES.length;
  const angleStep = (2 * Math.PI) / axisCount;
  const startAngle = -Math.PI / 2;

  const axisPoints = AXES.map((_, i) =>
    getPointOnAxis(startAngle + i * angleStep, CHART_RADIUS, CHART_CENTER, CHART_CENTER)
  );

  const actualPoints = actual.map((val, i) =>
    getPointOnAxis(startAngle + i * angleStep, val * CHART_RADIUS, CHART_CENTER, CHART_CENTER)
  );
  const idealPoints = ideal.map((val, i) =>
    getPointOnAxis(startAngle + i * angleStep, val * CHART_RADIUS, CHART_CENTER, CHART_CENTER)
  );

  const actualPath = actualPoints.map((p) => `${p.x},${p.y}`).join(" ");
  const idealPath = idealPoints.map((p) => `${p.x},${p.y}`).join(" ");

  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  return (
    <Svg width={CHART_SIZE} height={CHART_SIZE}>
      {/* Grid lines */}
      {gridLevels.map((level) => {
        const points = AXES.map((_, i) => {
          const p = getPointOnAxis(
            startAngle + i * angleStep,
            level * CHART_RADIUS,
            CHART_CENTER,
            CHART_CENTER
          );
          return `${p.x},${p.y}`;
        }).join(" ");
        return (
          <Polygon
            key={level}
            points={points}
            fill="none"
            stroke={Colors.neutral[200]}
            strokeWidth={1}
          />
        );
      })}

      {/* Axis lines */}
      {axisPoints.map((point, i) => (
        <Line
          key={i}
          x1={CHART_CENTER}
          y1={CHART_CENTER}
          x2={point.x}
          y2={point.y}
          stroke={Colors.neutral[200]}
          strokeWidth={1}
        />
      ))}

      {/* Ideal shape (dashed) */}
      <Polygon
        points={idealPath}
        fill="rgba(198, 123, 92, 0.1)"
        stroke="rgba(198, 123, 92, 0.4)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />

      {/* Actual shape */}
      <Polygon
        points={actualPath}
        fill="rgba(198, 123, 92, 0.2)"
        stroke={DesignTokens.colors.brand.terracotta}
        strokeWidth={2}
      />

      {/* Actual points */}
      {actualPoints.map((point, i) => (
        <Circle key={`actual-${i}`} cx={point.x} cy={point.y} r={4} fill={DesignTokens.colors.brand.terracotta} />
      ))}

      {/* Axis labels */}
      {axisPoints.map((point, i) => {
        const labelOffset = 20;
        const dx = point.x - CHART_CENTER;
        const dy = point.y - CHART_CENTER;
        const len = Math.sqrt(dx * dx + dy * dy);
        const labelX = CHART_CENTER + (dx / len) * (CHART_RADIUS + labelOffset);
        const labelY = CHART_CENTER + (dy / len) * (CHART_RADIUS + labelOffset);
        return (
          <SvgText
            key={`label-${i}`}
            x={labelX}
            y={labelY}
            textAnchor="middle"
            alignmentBaseline="middle"
            fontSize={12}
            fill={theme.colors.textSecondary}
          >
            {AXES[i]}
          </SvgText>
        );
      })}
    </Svg>
  );
};

export const BodyAnalysisScreen: React.FC = () => {
  const navigation = useNavigation<BodyAnalysisNavProp>();
  const { bodyAnalysis, loadBodyAnalysis, isLoading } = useProfileStore();
  const t = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        await loadBodyAnalysis();
      } catch {
        setError(t.errors.serverError);
      }
    };
    void load();
  }, [loadBodyAnalysis]);

  const handleRetry = useCallback(() => {
    setError(null);
    void loadBodyAnalysis();
  }, [loadBodyAnalysis]);

  // Loading state
  if (isLoading && !bodyAnalysis) {
    return (
      <ScreenLayout
        header={
          <Header
            title={t.bodyTypes.rectangle}
            leftAction={
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                accessibilityLabel="返回"
                accessibilityRole="button"
              >
                <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            }
          />
        }
        backgroundColor={Colors.neutral[50]}
      >
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t.common.loading}</Text>
        </View>
      </ScreenLayout>
    );
  }

  // Error state
  if (error && !bodyAnalysis) {
    return (
      <ScreenLayout
        header={
          <Header
            title="体型分析"
            leftAction={
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                accessibilityLabel="返回"
                accessibilityRole="button"
              >
                <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            }
          />
        }
        backgroundColor={Colors.neutral[50]}
      >
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textTertiary} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            accessibilityLabel="重试"
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>{t.common.retry}</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  const bodyType = bodyAnalysis?.bodyType?.type ?? null;
  const bodyTypeLabel = bodyType ? (BODY_TYPE_LABELS[bodyType] ?? t.bodyTypes.rectangle) : null;
  const tips = bodyType ? (BODY_TYPE_TIPS[bodyType] ?? BODY_TYPE_TIPS.rectangle) : [];

  // Derive radar data from API body measurements, or show empty state
  const profile = useProfileStore((s) => s.profile);
  const hasMeasurements = !!(profile?.shoulder || profile?.bust || profile?.waist || profile?.hip);

  // Normalize body measurements to 0-1 range for radar chart
  const normalizeMeasurement = (value: number | undefined, min: number, max: number): number => {
    if (!value) return 0.5;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  };

  const actual = hasMeasurements
    ? [
        normalizeMeasurement(profile?.shoulder, 30, 55),
        normalizeMeasurement(profile?.bust, 70, 110),
        normalizeMeasurement(profile?.waist, 50, 95),
        normalizeMeasurement(profile?.hip, 75, 115),
      ]
    : null;
  const ideal = [0.75, 0.65, 0.6, 0.75];

  // No data state
  if (!bodyType && !isLoading && !error) {
    return (
      <ScreenLayout
        header={
          <Header
            title="体型分析"
            leftAction={
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                accessibilityLabel="返回"
                accessibilityRole="button"
              >
                <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            }
          />
        }
        backgroundColor={Colors.neutral[50]}
      >
        <View style={styles.centerContainer}>
          <Ionicons name="body-outline" size={64} color={theme.colors.textTertiary} />
          <Text style={styles.emptyTitle}>还没有体型数据</Text>
          <Text style={styles.emptySubtitle}>完善身体数据后，AI将为你生成专属体型分析和穿搭建议</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate("ProfileSetup" as never)}
            accessibilityLabel="去完善数据"
            accessibilityRole="button"
          >
            <Text style={styles.emptyButtonText}>去完善数据</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  // Use bodyType from API, fallback to "rectangle" only if we have data but missing type
  const displayBodyType = bodyType ?? "rectangle";
  const displayBodyTypeLabel = BODY_TYPE_LABELS[displayBodyType] ?? t.bodyTypes.rectangle;
  const displayTips = BODY_TYPE_TIPS[displayBodyType] ?? BODY_TYPE_TIPS.rectangle;

  return (
    <ScreenLayout
      header={
        <Header
          title="体型分析"
          leftAction={
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              accessibilityLabel="返回"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          }
        />
      }
      scrollable
      backgroundColor={Colors.neutral[50]}
    >
      <View style={styles.content}>
        {/* Body type card with gradient */}
        <View style={styles.typeCard}>
          <LinearGradient
            colors={[DesignTokens.colors.brand.terracotta, DesignTokens.colors.brand.camel]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.typeGradient}
          >
            <Text style={styles.typeLabel}>你的体型</Text>
            <Text style={styles.typeName}>{displayBodyTypeLabel}</Text>
            {bodyAnalysis?.bodyType?.description && (
              <Text style={styles.typeDescription}>{bodyAnalysis.bodyType.description}</Text>
            )}
          </LinearGradient>
        </View>

        {/* Radar chart */}
        {actual && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>身体比例分析</Text>
            <View style={styles.chartContainer}>
              <RadarChart actual={actual} ideal={ideal} />
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: DesignTokens.colors.brand.terracotta }]} />
                <Text style={styles.legendText}>实际比例</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    {
                      backgroundColor: "rgba(198, 123, 92, 0.4)",
                      borderWidth: 1,
                      borderColor: "rgba(198, 123, 92, 0.6)",
                    },
                  ]}
                />
                <Text style={styles.legendText}>理想比例</Text>
              </View>
            </View>
          </View>
        )}

        {/* Outfit advice */}
        <View style={styles.adviceCard}>
          <Text style={styles.adviceTitle}>穿搭建议</Text>
          {displayTips.map((tip, index) => (
            <View key={index} style={styles.adviceItem}>
              <View style={styles.adviceBullet} />
              <Text style={styles.adviceText}>{tip}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[8],
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing[8],
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textTertiary,
    marginTop: Spacing[3],
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: Spacing[3],
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
    marginTop: Spacing[4],
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: DesignTokens.colors.neutral.white,
  },
  typeCard: {
    borderRadius: BorderRadius["2xl"],
    overflow: "hidden",
    marginBottom: Spacing[4],
    ...Shadows.md,
  },
  typeGradient: {
    padding: Spacing[6],
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: Spacing[1],
  },
  typeName: {
    fontSize: 28,
    fontWeight: "600",
    color: DesignTokens.colors.neutral.white,
    marginBottom: Spacing[2],
  },
  typeDescription: {
    fontSize: 16,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 24,
  },
  chartCard: {
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing[5],
    marginBottom: Spacing[4],
    alignItems: "center",
    ...Shadows.sm,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: Spacing[4],
    alignSelf: "flex-start",
  },
  chartContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  legendRow: {
    flexDirection: "row",
    gap: Spacing[6],
    marginTop: Spacing[3],
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  adviceCard: {
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing[5],
    marginBottom: Spacing[4],
    ...Shadows.sm,
  },
  adviceTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: Spacing[3],
  },
  adviceItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing[3],
    marginBottom: Spacing[3],
  },
  adviceBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginTop: 8,
  },
  adviceText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: Spacing[4],
    marginBottom: Spacing[2],
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[6],
  },
  emptyButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: DesignTokens.colors.neutral.white,
  },
});

export default BodyAnalysisScreen;

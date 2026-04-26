/**
 * WeeklyReportScreen - Displays 7-section style report.
 *
 * Sections: satisfaction, styleDistribution, trendSummary,
 * evolutionCurve, sceneCoverage, colorAnalysis, itemReuseRate.
 * Fetches via TanStack Query from GET /api/v1/diary/weekly-report.
 */
import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";

import apiClient from "../../../services/api/client";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { createStyles, type FlatColors } from "../../../shared/contexts/ThemeContext";
import { flatColors as colors } from "../../../design-system/theme";
import StyleEvolutionChart, { type EvolutionDataPoint } from "./StyleEvolutionChart";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeeklyReport {
  id: string;
  weekStart: string;
  weekEnd: string;
  satisfaction: number | null;
  styleDistribution: Record<string, number> | null;
  trendSummary: string | null;
  evolutionCurve: EvolutionDataPoint[] | null;
  sceneCoverage: Record<string, number> | null;
  colorAnalysis: Record<string, number> | null;
  itemReuseRate: number | null;
  generatedAt: string;
}

interface ReportResponse {
  hasReport: boolean;
  report?: WeeklyReport;
  message?: string;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

async function fetchWeeklyReport(): Promise<ReportResponse> {
  const response = await apiClient.get("/diary/weekly-report");
  return (response.data ?? response) as ReportResponse;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.getMonth() + 1}/${s.getDate()} - ${e.getMonth() + 1}/${e.getDate()}`;
}

function getSatisfactionColor(score: number | null): string {
  if (score === null) return colors.neutral[400];
  if (score >= 0.8) return colors.semantic.success;
  if (score >= 0.5) return colors.semantic.warning;
  return colors.semantic.error;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SectionCard: React.FC<{
  title: string;
  icon: string;
  children: React.ReactNode;
}> = ({ title, icon, children }) => {
  const styles = useStyles(colors);

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={18} color={colors.borders.brand} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
};

const SatisfactionSection: React.FC<{ satisfaction: number | null }> = ({ satisfaction }) => {
  const styles = useStyles(colors);
  const color = getSatisfactionColor(satisfaction);
  const percentage = satisfaction !== null ? Math.round(satisfaction * 100) : 0;

  return (
    <SectionCard title="穿搭满意度" icon="happy-outline">
      <View style={styles.satisfactionContainer}>
        <View style={styles.satisfactionCircle}>
          <Text style={[styles.satisfactionValue, { color }]}>{percentage}</Text>
          <Text style={styles.satisfactionUnit}>分</Text>
        </View>
        <View style={styles.satisfactionBarContainer}>
          <View style={styles.satisfactionBarBg}>
            <View
              style={[
                styles.satisfactionBarFill,
                { width: `${percentage}%`, backgroundColor: color },
              ]}
            />
          </View>
          <Text style={styles.satisfactionLabel}>
            {satisfaction !== null
              ? satisfaction >= 0.8
                ? "本周穿搭表现优秀"
                : satisfaction >= 0.5
                ? "穿搭水平良好，还有提升空间"
                : "可以尝试新的搭配风格"
              : "暂无数据"}
          </Text>
        </View>
      </View>
    </SectionCard>
  );
};

const StyleDistributionSection: React.FC<{ data: Record<string, number> | null }> = ({ data }) => {
  const styles = useStyles(colors);

  if (!data) {
    return (
      <SectionCard title="风格分布" icon="pie-chart-outline">
        <Text style={styles.noDataText}>暂无风格数据</Text>
      </SectionCard>
    );
  }

  const sorted = Object.entries(data).sort(([, a], [, b]) => b - a);

  return (
    <SectionCard title="风格分布" icon="pie-chart-outline">
      {sorted.map(([style, ratio]) => (
        <View key={style} style={styles.distributionRow}>
          <Text style={styles.distributionLabel}>{style}</Text>
          <View style={styles.distributionBarBg}>
            <View style={[styles.distributionBarFill, { width: `${Math.round(ratio * 100)}%` }]} />
          </View>
          <Text style={styles.distributionValue}>{Math.round(ratio * 100)}%</Text>
        </View>
      ))}
    </SectionCard>
  );
};

const TrendSummarySection: React.FC<{ summary: string | null }> = ({ summary }) => {
  const styles = useStyles(colors);

  return (
    <SectionCard title="趋势摘要" icon="trending-up-outline">
      <Text style={styles.trendText}>{summary ?? "暂无趋势数据"}</Text>
    </SectionCard>
  );
};

const EvolutionSection: React.FC<{ data: EvolutionDataPoint[] | null }> = ({ data }) => {
  const styles = useStyles(colors);

  return (
    <SectionCard title="风格进化曲线" icon="analytics-outline">
      {data && data.length > 0 ? (
        <StyleEvolutionChart data={data} />
      ) : (
        <Text style={styles.noDataText}>暂无进化数据，需要更多天的穿搭记录</Text>
      )}
    </SectionCard>
  );
};

const SceneCoverageSection: React.FC<{ data: Record<string, number> | null }> = ({ data }) => {
  const styles = useStyles(colors);

  if (!data) {
    return (
      <SectionCard title="场景覆盖" icon="location-outline">
        <Text style={styles.noDataText}>暂无场景数据</Text>
      </SectionCard>
    );
  }

  const sorted = Object.entries(data).sort(([, a], [, b]) => b - a);

  return (
    <SectionCard title="场景覆盖" icon="location-outline">
      <View style={styles.sceneGrid}>
        {sorted.map(([scene, ratio]) => (
          <View key={scene} style={styles.sceneChip}>
            <Text style={styles.sceneChipLabel}>{scene}</Text>
            <Text style={styles.sceneChipValue}>{Math.round(ratio * 100)}%</Text>
          </View>
        ))}
      </View>
    </SectionCard>
  );
};

const ColorAnalysisSection: React.FC<{ data: Record<string, number> | null }> = ({ data }) => {
  const styles = useStyles(colors);

  if (!data) {
    return (
      <SectionCard title="色彩分析" icon="color-palette-outline">
        <Text style={styles.noDataText}>暂无色彩数据</Text>
      </SectionCard>
    );
  }

  const sorted = Object.entries(data).sort(([, a], [, b]) => b - a);

  return (
    <SectionCard title="色彩分析" icon="color-palette-outline">
      <View style={styles.colorGrid}>
        {sorted.slice(0, 8).map(([colorName, ratio]) => (
          <View key={colorName} style={styles.colorItem}>
            <View style={[styles.colorSwatch, { backgroundColor: colorName }]} />
            <Text style={styles.colorName}>{colorName}</Text>
            <Text style={styles.colorValue}>{Math.round(ratio * 100)}%</Text>
          </View>
        ))}
      </View>
    </SectionCard>
  );
};

const ItemReuseSection: React.FC<{ rate: number | null }> = ({ rate }) => {
  const styles = useStyles(colors);

  const percentage = rate !== null ? Math.round(rate * 100) : 0;
  const label =
    rate === null
      ? "暂无数据"
      : rate >= 0.8
      ? "搭配丰富度高，单品利用充分"
      : rate >= 0.5
      ? "搭配多样性适中"
      : "可以尝试搭配更多不同的单品";

  return (
    <SectionCard title="单品复用率" icon="repeat-outline">
      <View style={styles.reuseContainer}>
        <Text style={styles.reuseValue}>{percentage}%</Text>
        <View style={styles.reuseBarBg}>
          <View
            style={[
              styles.reuseBarFill,
              {
                width: `${percentage}%`,
                backgroundColor: colors.borders.brand,
              },
            ]}
          />
        </View>
        <Text style={styles.reuseLabel}>{label}</Text>
      </View>
    </SectionCard>
  );
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export const WeeklyReportScreen: React.FC = () => {
  const styles = useStyles(colors);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["diary", "weekly-report"],
    queryFn: fetchWeeklyReport,
    staleTime: 10 * 60 * 1000,
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["diary"] });
  }, [queryClient]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>生成报告中...</Text>
          <Text style={styles.stateSubtitle}>正在为你分析本周穿搭数据</Text>
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.stateContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.neutral[300]} />
          <Text style={styles.stateTitle}>加载失败</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void refetch()}>
            <Text style={styles.retryButtonText}>重新加载</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!data?.hasReport || !data.report) {
      return (
        <View style={styles.stateContainer}>
          <Ionicons name="document-text-outline" size={48} color={colors.neutral[300]} />
          <Text style={styles.stateTitle}>暂无周报数据</Text>
          <Text style={styles.stateSubtitle}>
            {data?.message ?? "系统将在每周日晚8点自动生成本周穿搭报告"}
          </Text>
        </View>
      );
    }

    const report = data.report;

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Week range badge */}
        <View style={styles.weekBadge}>
          <Ionicons name="calendar-outline" size={14} color={colors.textInverse} />
          <Text style={styles.weekBadgeText}>
            {formatDateRange(report.weekStart, report.weekEnd)}
          </Text>
        </View>

        {/* 7 sections */}
        <SatisfactionSection satisfaction={report.satisfaction} />
        <StyleDistributionSection data={report.styleDistribution} />
        <TrendSummarySection summary={report.trendSummary} />
        <EvolutionSection data={report.evolutionCurve} />
        <SceneCoverageSection data={report.sceneCoverage} />
        <ColorAnalysisSection data={report.colorAnalysis} />
        <ItemReuseSection rate={report.itemReuseRate} />

        {/* Footer */}
        <Text style={styles.footerText}>
          报告生成于 {new Date(report.generatedAt).toLocaleDateString("zh-CN")}
        </Text>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>穿搭周报</Text>
        <Text style={styles.headerSubtitle}>每周日晚自动生成</Text>
      </View>

      {renderContent()}
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const useStyles = createStyles((themeColors: FlatColors) => ({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.backgrounds.secondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: DesignTokens.typography.sizes["2xl"],
    fontWeight: "700",
    color: themeColors.text.primary,
  },
  headerSubtitle: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: themeColors.text.secondary,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  weekBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: themeColors.borders.brand,
    marginBottom: 16,
    gap: 4,
  },
  weekBadgeText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: themeColors.textInverse,
  },
  sectionCard: {
    backgroundColor: themeColors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...DesignTokens.shadows.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: themeColors.text.primary,
  },
  noDataText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: themeColors.neutral[400],
    textAlign: "center",
    paddingVertical: 8,
  },
  // Satisfaction
  satisfactionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  satisfactionCircle: {
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: themeColors.neutral[50],
  },
  satisfactionValue: {
    fontSize: DesignTokens.typography.sizes["2xl"],
    fontWeight: "700",
  },
  satisfactionUnit: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: themeColors.neutral[400],
  },
  satisfactionBarContainer: {
    flex: 1,
  },
  satisfactionBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: themeColors.neutral[100],
    overflow: "hidden",
  },
  satisfactionBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  satisfactionLabel: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: themeColors.neutral[500],
    marginTop: 6,
  },
  // Distribution
  distributionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  distributionLabel: {
    width: 60,
    fontSize: DesignTokens.typography.sizes.sm,
    color: themeColors.text.secondary,
  },
  distributionBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: themeColors.neutral[100],
    overflow: "hidden",
  },
  distributionBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: themeColors.borders.brand,
  },
  distributionValue: {
    width: 36,
    fontSize: DesignTokens.typography.sizes.xs,
    color: themeColors.neutral[500],
    textAlign: "right",
  },
  // Trend
  trendText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: themeColors.text.secondary,
    lineHeight: 22,
  },
  // Scene
  sceneGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sceneChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: themeColors.neutral[50],
    gap: 6,
  },
  sceneChipLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: themeColors.text.primary,
    fontWeight: "500",
  },
  sceneChipValue: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: themeColors.text.secondary,
  },
  // Color
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorItem: {
    alignItems: "center",
    width: 60,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: themeColors.neutral[200],
  },
  colorName: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: themeColors.text.secondary,
    marginTop: 4,
  },
  colorValue: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: themeColors.neutral[400],
  },
  // Reuse
  reuseContainer: {
    alignItems: "center",
  },
  reuseValue: {
    fontSize: DesignTokens.typography.sizes["3xl"],
    fontWeight: "700",
    color: themeColors.text.primary,
    marginBottom: 8,
  },
  reuseBarBg: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: themeColors.neutral[100],
    overflow: "hidden",
    marginBottom: 8,
  },
  reuseBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  reuseLabel: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: themeColors.neutral[500],
  },
  // Footer
  footerText: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: themeColors.neutral[400],
    textAlign: "center",
    marginTop: 8,
  },
  // State
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  stateTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: themeColors.text.primary,
    marginTop: 16,
  },
  stateSubtitle: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: themeColors.text.secondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: themeColors.borders.brand,
  },
  retryButtonText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: themeColors.textInverse,
  },
}));

export default WeeklyReportScreen;

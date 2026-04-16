import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { useBloggerStore } from '../stores/bloggerStore';
import type { TrendMetric } from '../../../services/api/blogger.api';
import type { RootStackParamList } from '../../../types/navigation';
import { Spacing, flatColors as colors } from '../../../design-system/theme';


type Navigation = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_WIDTH = Dimensions.get("window").width;

const PERIOD_TABS = [
  { key: "7d" as const, label: "7天" },
  { key: "30d" as const, label: "30天" },
];

const METRIC_OPTIONS: { key: TrendMetric; label: string }[] = [
  { key: "views", label: "浏览量" },
  { key: "likes", label: "点赞" },
  { key: "bookmarks", label: "收藏" },
  { key: "followers", label: "粉丝" },
];

function MetricCard({ label, value, change }: { label: string; value: number; change: number }) {
    const { colors } = useTheme();
  const isPositive = change >= 0;
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>
        {value >= 10000 ? `${(value / 10000).toFixed(1)}万` : value.toLocaleString()}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricChange, isPositive ? styles.metricUp : styles.metricDown]}>
        {isPositive ? "+" : ""}
        {change.toFixed(1)}%
      </Text>
    </View>
  );
}

function TrendChart({ data, width }: { data: { date: string; value: number }[]; width: number }) {
  if (data.length === 0) {
    return (
      <View style={styles.chartEmpty}>
        <Text style={styles.chartEmptyText}>暂无数据</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const chartHeight = 120;
  const chartPadding = 16;
  const chartWidth = width - chartPadding * 2;
  const barWidth = chartWidth / data.length;

  return (
    <View style={[styles.chartContainer, { height: chartHeight + 40 }]}>
      <View style={[styles.chartArea, { height: chartHeight }]}>
        {data.map((point, index) => {
          const barHeight = (point.value / maxValue) * (chartHeight - 20);
          return (
            <View
              key={point.date}
              style={[
                styles.chartBar,
                {
                  height: Math.max(barHeight, 2),
                  width: Math.max(barWidth - 4, 4),
                  left: chartPadding + index * barWidth + 2,
                  bottom: DesignTokens.spacing['2.5'],
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.chartXAxis}>
        {data
          .filter((_, i) => i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2))
          .map((point, idx, _filtered) => (
            <Text key={point.date} style={styles.chartXLabel}>
              {point.date.slice(5)}
            </Text>
          ))}
      </View>
    </View>
  );
}

export const BloggerDashboardScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const {
    dashboardData,
    trendData,
    isLoadingDashboard,
    isLoadingTrend,
    fetchDashboard,
    fetchTrendData,
  } = useBloggerStore();

  const [period, setPeriod] = useState<"7d" | "30d">("7d");
  const [selectedMetric, setSelectedMetric] = useState<TrendMetric>("views");
  const [isBlogger, _setIsBlogger] = useState(true); // Would check user's bloggerLevel

  useEffect(() => {
    void fetchDashboard(period);
  }, [period, fetchDashboard]);

  useEffect(() => {
    void fetchTrendData(selectedMetric, period);
  }, [selectedMetric, period, fetchTrendData]);

  const handlePeriodChange = useCallback((newPeriod: "7d" | "30d") => {
    setPeriod(newPeriod);
  }, []);

  const handleMetricChange = useCallback((metric: TrendMetric) => {
    setSelectedMetric(metric);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>数据面板</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Period tabs */}
        <View style={styles.periodRow}>
          {PERIOD_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.periodTab, period === tab.key && styles.periodTabActive]}
              onPress={() => handlePeriodChange(tab.key)}
            >
              <Text
                style={[styles.periodTabText, period === tab.key && styles.periodTabTextActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Core metrics grid */}
        {isLoadingDashboard ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : dashboardData ? (
          <View style={styles.metricsGrid}>
            <MetricCard
              label="浏览量"
              value={dashboardData.views}
              change={dashboardData.viewsChange}
            />
            <MetricCard
              label="点赞数"
              value={dashboardData.likes}
              change={dashboardData.likesChange}
            />
            <MetricCard
              label="收藏数"
              value={dashboardData.bookmarks}
              change={dashboardData.bookmarksChange}
            />
            <MetricCard
              label="评论数"
              value={dashboardData.comments}
              change={dashboardData.commentsChange}
            />
          </View>
        ) : (
          <Text style={styles.noData}>暂无数据</Text>
        )}

        {/* Blogger enhanced metrics */}
        {isBlogger && dashboardData && (
          <View style={styles.enhancedSection}>
            <Text style={styles.sectionTitle}>博主数据</Text>
            <View style={styles.enhancedRow}>
              <View style={styles.enhancedCard}>
                <Text style={styles.enhancedValue}>
                  {/* eslint-disable-next-line eqeqeq */}
                  {dashboardData.conversionRate != null
                    ? `${dashboardData.conversionRate.toFixed(1)}%`
                    : "--"}
                </Text>
                <Text style={styles.enhancedLabel}>转化率</Text>
              </View>
              <View style={styles.enhancedCard}>
                <Text style={styles.enhancedValue}>
                  {dashboardData.followerGrowth !== null
                    ? `+${dashboardData.followerGrowth}`
                    : "--"}
                </Text>
                <Text style={styles.enhancedLabel}>粉丝增长</Text>
              </View>
            </View>
          </View>
        )}

        {/* Trend chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>趋势</Text>
          <View style={styles.metricSelector}>
            {METRIC_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.metricChip, selectedMetric === opt.key && styles.metricChipActive]}
                onPress={() => handleMetricChange(opt.key)}
              >
                <Text
                  style={[
                    styles.metricChipText,
                    selectedMetric === opt.key && styles.metricChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {isLoadingTrend ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
          ) : (
            <TrendChart data={trendData} width={SCREEN_WIDTH} />
          )}
        </View>

        {/* Manage products entry */}
        <TouchableOpacity
          style={styles.manageBtn}
          onPress={() => navigation.navigate("BloggerProfile", {})}
        >
          <Ionicons name="bag-outline" size={18} color={colors.primary} />
          <Text style={styles.manageBtnText}>管理我的商品</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* Non-blogger upgrade prompt */}
        {!isBlogger && (
          <View style={styles.upgradeSection}>
            <Ionicons name="rocket-outline" size={32} color={colors.primary} />
            <Text style={styles.upgradeTitle}>成为博主解锁更多数据</Text>
            <Text style={styles.upgradeDesc}>综合分≥60 且 粉丝≥500 即可自动升级为博主</Text>
          </View>
        )}

        <View style={{ height: DesignTokens.spacing[10] }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: colors.text },
  backBtn: { width: DesignTokens.spacing[10], height: DesignTokens.spacing[10], justifyContent: "center" },
  headerSpacer: { width: DesignTokens.spacing[10] },
  scrollContent: { paddingHorizontal: Spacing.md, paddingTop: DesignTokens.spacing[3]},
  periodRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: Spacing.xs,
    marginBottom: Spacing.md,
  },
  periodTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: 8,
  },
  periodTabActive: { backgroundColor: colors.primary },
  periodTabText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textSecondary },
  periodTabTextActive: { color: colors.surface, fontWeight: "600" },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: DesignTokens.spacing['2.5'],
  },
  metricCard: {
    width: (SCREEN_WIDTH - 42) / 2,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: DesignTokens.spacing['3.5'],
  },
  metricValue: { fontSize: DesignTokens.typography.sizes.xl, fontWeight: "700", color: colors.text },
  metricLabel: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textSecondary, marginTop: Spacing.xs},
  metricChange: { fontSize: DesignTokens.typography.sizes.sm, fontWeight: "500", marginTop: Spacing.xs},
  metricUp: { color: "colors.success" },
  metricDown: { color: "colors.error" },
  loader: { paddingVertical: Spacing.lg},
  noData: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textTertiary,
    textAlign: "center",
    paddingVertical: DesignTokens.spacing[10],
  },
  enhancedSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: DesignTokens.spacing['3.5'],
    marginTop: Spacing.md,
  },
  sectionTitle: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: colors.textPrimary, marginBottom: DesignTokens.spacing['2.5']},
  enhancedRow: { flexDirection: "row", gap: DesignTokens.spacing['2.5']},
  enhancedCard: {
    flex: 1,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 10,
    padding: DesignTokens.spacing['3.5'],
    alignItems: "center",
  },
  enhancedValue: { fontSize: DesignTokens.typography.sizes.xl, fontWeight: "700", color: colors.primary },
  enhancedLabel: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textSecondary, marginTop: Spacing.xs},
  chartSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: DesignTokens.spacing['3.5'],
    marginTop: Spacing.md,
  },
  metricSelector: {
    flexDirection: "row",
    gap: DesignTokens.spacing['1.5'],
    marginBottom: DesignTokens.spacing[3],
  },
  metricChip: {
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: DesignTokens.spacing['1.5'],
    borderRadius: 14,
    backgroundColor: colors.background,
  },
  metricChipActive: { backgroundColor: colors.backgroundTertiary },
  metricChipText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textSecondary },
  metricChipTextActive: { color: colors.primary, fontWeight: "600" },
  chartContainer: {
    position: "relative",
    marginTop: Spacing.sm,
  },
  chartArea: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chartBar: {
    position: "absolute",
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  chartXAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: DesignTokens.spacing['1.5'],
  },
  chartXLabel: { fontSize: DesignTokens.typography.sizes.xs, color: colors.textTertiary },
  chartEmpty: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  chartEmptyText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textTertiary },
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  manageBtnText: { flex: 1, fontSize: DesignTokens.typography.sizes.base, color: colors.textPrimary, fontWeight: "500" },
  upgradeSection: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  upgradeTitle: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: DesignTokens.spacing[3],
  },
  upgradeDesc: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: DesignTokens.spacing['1.5'],
    textAlign: "center",
  },
});

export default BloggerDashboardScreen;

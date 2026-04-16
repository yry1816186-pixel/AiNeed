import React, { useEffect, useCallback, useState, useRef } from "react";
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
import { theme, Colors, Spacing, BorderRadius, Shadows, Typography } from '../design-system/theme';
import { useProfileStore } from "../stores/profileStore";
import { useTheme } from "../contexts/ThemeContext";
import { normalizeColorSeason, seasonLabels, type ColorSeason } from "../theme/tokens/season-colors";
import { ScreenLayout, Header } from "../shared/components/layout/ScreenLayout";
import { SeasonPalette } from "../shared/components/visualization/SeasonPalette";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import type { RootStackParamList } from "../types/navigation";
import { DesignTokens } from "../design-system/theme/tokens/design-tokens";

type ColorAnalysisNavProp = NavigationProp<RootStackParamList>;

const COLOR_SEASON_NAMES: Record<string, { name: string; nameEn: string }> = {
  spring_warm: { name: "暖春型", nameEn: "Warm Spring" },
  spring_light: { name: "浅春型", nameEn: "Light Spring" },
  summer_cool: { name: "冷夏型", nameEn: "Cool Summer" },
  summer_light: { name: "浅夏型", nameEn: "Light Summer" },
  autumn_warm: { name: "暖秋型", nameEn: "Warm Autumn" },
  autumn_deep: { name: "深秋型", nameEn: "Deep Autumn" },
  winter_cool: { name: "冷冬型", nameEn: "Cool Winter" },
  winter_deep: { name: "深冬型", nameEn: "Deep Winter" },
  spring: { name: "春季型", nameEn: "Spring" },
  summer: { name: "夏季型", nameEn: "Summer" },
  autumn: { name: "秋季型", nameEn: "Autumn" },
  winter: { name: "冬季型", nameEn: "Winter" },
};

const SEASON_GRADIENTS: Record<string, [string, string]> = {
  spring_warm: [Colors.colorSeasons.spring.colors[0], Colors.colorSeasons.spring.colors[1]],
  spring_light: [Colors.colorSeasons.spring.colors[1], Colors.colorSeasons.spring.bg],
  spring: [Colors.colorSeasons.spring.colors[0], Colors.colorSeasons.spring.colors[1]],
  summer_cool: [Colors.colorSeasons.summer.colors[0], Colors.colorSeasons.summer.colors[1]],
  summer_light: [Colors.colorSeasons.summer.colors[1], Colors.colorSeasons.summer.bg],
  summer: [Colors.colorSeasons.summer.colors[0], Colors.colorSeasons.summer.colors[1]],
  autumn_warm: [Colors.colorSeasons.autumn.colors[0], Colors.colorSeasons.autumn.colors[1]],
  autumn_deep: [Colors.colorSeasons.autumn.colors[2], Colors.colorSeasons.autumn.colors[3]],
  autumn: [Colors.colorSeasons.autumn.colors[0], Colors.colorSeasons.autumn.colors[1]],
  winter_cool: [Colors.colorSeasons.winter.colors[0], Colors.colorSeasons.winter.colors[1]],
  winter_deep: [Colors.colorSeasons.winter.colors[2], Colors.colorSeasons.winter.colors[3]],
  winter: [Colors.colorSeasons.winter.colors[0], Colors.colorSeasons.winter.colors[1]],
};

const DEFAULT_PALETTE = [
  { hex: Colors.colorSeasons.autumn.colors[0], name: "赤陶" },
  { hex: Colors.amber[600], name: "琥珀" },
  { hex: Colors.colorSeasons.autumn.colors[3], name: "驼色" },
  { hex: Colors.sage[400], name: "橄榄" },
  { hex: Colors.amber[400], name: "蜂蜜" },
  { hex: Colors.sage[600], name: "苔绿" },
  { hex: Colors.colorSeasons.summer.colors[1], name: "米灰" },
  { hex: Colors.colorSeasons.autumn.colors[2], name: "赭石" },
];

const FALLBACK_NEUTRALS = [
  Colors.neutral[950],
  Colors.neutral[500],
  Colors.neutral[400],
  Colors.neutral[50],
];
const FALLBACK_AVOID = [Colors.semantic.error, Colors.sky[500]];

export const ColorAnalysisScreen: React.FC = () => {
  const navigation = useNavigation<ColorAnalysisNavProp>();
  const { colorAnalysis, loadColorAnalysis, isLoading } = useProfileStore();
  const { colorSeason, seasonAccent, setSeasonAccent } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [showSeasonBanner, setShowSeasonBanner] = useState(false);
  const prevSeasonRef = useRef<ColorSeason | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        await loadColorAnalysis();
      } catch {
        setError("加载失败，请重试");
      }
    };
    void load();
  }, [loadColorAnalysis]);

  // 当色彩分析数据加载完成且有季节类型时，自动设置季节强调色
  useEffect(() => {
    if (!colorAnalysis?.colorSeason?.type) return;

    const normalized = normalizeColorSeason(colorAnalysis.colorSeason.type);
    if (!normalized) return;

    // 首次设置或季节类型变化时触发
    if (normalized !== prevSeasonRef.current) {
      prevSeasonRef.current = normalized;
      void setSeasonAccent(normalized);

      // 如果之前没有季节色彩（首次分析完成），显示过渡动画提示
      if (colorSeason === null) {
        setShowSeasonBanner(true);
        // 3秒后自动隐藏
        const timer = setTimeout(() => setShowSeasonBanner(false), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [colorAnalysis?.colorSeason?.type, colorSeason, setSeasonAccent]);

  const handleRetry = useCallback(() => {
    setError(null);
    void loadColorAnalysis();
  }, [loadColorAnalysis]);

  const seasonType = colorAnalysis?.colorSeason?.type ?? null;
  const seasonInfo = seasonType ? (COLOR_SEASON_NAMES[seasonType] ?? COLOR_SEASON_NAMES.spring) : null;
  const gradient = seasonType ? (SEASON_GRADIENTS[seasonType] ?? SEASON_GRADIENTS.spring) : SEASON_GRADIENTS.spring;

  const bestColors = colorAnalysis?.bestColors ?? [];
  const neutralColors = colorAnalysis?.neutralColors ?? [];
  const avoidColors = colorAnalysis?.avoidColors ?? [];

  const paletteItems =
    bestColors.length > 0
      ? bestColors.slice(0, 8).map((hex, i) => ({
          hex,
          name: DEFAULT_PALETTE[i]?.name ?? `颜色${i + 1}`,
        }))
      : [];

  // No data state - show empty state instead of fallback data
  if (!seasonType && !isLoading && !error) {
    return (
      <ScreenLayout
        header={
          <Header
            title="色彩分析"
            leftAction={
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                accessibilityLabel="返回"
                accessibilityRole="button"
              >
                <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            }
          />
        }
        backgroundColor={Colors.neutral[50]}
      >
        <View style={styles.centerContainer}>
          <Ionicons name="color-palette-outline" size={64} color={theme.colors.textTertiary} />
          <Text style={styles.emptyTitle}>还没有色彩分析数据</Text>
          <Text style={styles.emptySubtitle}>上传照片或完善肤色信息后，AI将为你生成专属色彩季型分析</Text>
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

  // Use seasonType from API, fallback to "spring" only if we have partial data
  const displaySeasonType = seasonType ?? "spring";
  const displaySeasonInfo = COLOR_SEASON_NAMES[displaySeasonType] ?? COLOR_SEASON_NAMES.spring;
  const displayGradient = SEASON_GRADIENTS[displaySeasonType] ?? SEASON_GRADIENTS.spring;

  if (isLoading && !colorAnalysis) {
    return (
      <ScreenLayout
        header={
          <Header
            title="色彩分析"
            leftAction={
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                accessibilityLabel="返回"
                accessibilityRole="button"
              >
                <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            }
          />
        }
        backgroundColor={Colors.neutral[50]}
      >
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>加载色彩分析...</Text>
        </View>
      </ScreenLayout>
    );
  }

  if (error && !colorAnalysis) {
    return (
      <ScreenLayout
        header={
          <Header
            title="色彩分析"
            leftAction={
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                accessibilityLabel="返回"
                accessibilityRole="button"
              >
                <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
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
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      header={
        <Header
          title="色彩分析"
          leftAction={
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              accessibilityLabel="返回"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          }
        />
      }
      scrollable
      backgroundColor={Colors.neutral[50]}
    >
      <View style={styles.content}>
        {/* 季节色彩融入提示横幅 */}
        {showSeasonBanner && seasonAccent && (
          <Animated.View
            entering={SlideInDown.duration(500).springify()}
            style={[styles.seasonBanner, { backgroundColor: seasonAccent.accentLight }]}
          >
            <Ionicons name="sparkles" size={18} color={seasonAccent.accent} />
            <Text style={[styles.seasonBannerText, { color: seasonAccent.accentDark }]}>
              你的专属色彩已融入界面
            </Text>
          </Animated.View>
        )}

        <View style={styles.seasonCard}>
          <LinearGradient
            colors={displayGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.seasonGradient}
          >
            <Text style={styles.seasonLabel}>你的色彩季型</Text>
            <Text style={styles.seasonName}>{displaySeasonInfo.name}</Text>
            <Text style={styles.seasonNameEn}>{displaySeasonInfo.nameEn}</Text>

            {/* 季节色彩已激活标识 */}
            {colorSeason && (
              <Animated.View entering={FadeIn.duration(600)} style={styles.seasonActiveBadge}>
                <Ionicons name="checkmark-circle" size={14} color={seasonAccent?.accent ?? Colors.primary[500]} />
                <Text style={[styles.seasonActiveText, { color: seasonAccent?.accent ?? Colors.primary[500] }]}>
                  界面色彩已适配
                </Text>
              </Animated.View>
            )}
          </LinearGradient>
        </View>

        <View style={styles.paletteCard}>
          <Text style={styles.paletteTitle}>适合你的颜色</Text>
          <View style={styles.paletteGrid}>
            {paletteItems.map((item, index) => (
              <View key={index} style={styles.paletteItem}>
                <View style={[styles.colorCircle, { backgroundColor: item.hex }]}>
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={Colors.neutral.white}
                    style={styles.checkIcon}
                  />
                </View>
                <Text style={styles.colorHex}>{item.hex}</Text>
                <Text style={styles.colorName}>{item.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.paletteCard}>
          <SeasonPalette season={displaySeasonType} bestColors={bestColors} avoidColors={avoidColors} />
        </View>

        {neutralColors.length > 0 && (
          <View style={styles.paletteCard}>
            <Text style={styles.paletteTitle}>中性色</Text>
            <View style={styles.neutralRow}>
              {neutralColors.map((hex, index) => (
                <View key={index} style={styles.neutralItem}>
                  <View style={[styles.neutralCircle, { backgroundColor: hex }]} />
                  <Text style={styles.colorHex}>{hex}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {avoidColors.length > 0 && (
          <View style={styles.paletteCard}>
            <Text style={styles.paletteTitle}>建议避免的颜色</Text>
            <View style={styles.avoidRow}>
              {avoidColors.map((hex, index) => (
                <View key={index} style={styles.avoidItem}>
                  <View style={[styles.avoidCircle, { backgroundColor: hex }]}>
                    <Ionicons name="close" size={14} color={Colors.neutral.white} />
                  </View>
                  <Text style={styles.colorHex}>{hex}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.reasonCard}>
          <Ionicons name="color-palette-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.reasonText}>
            基于你的肤色分析，推荐以上色彩方向。适合的颜色能衬托气色，不适合的颜色可能让肤色显得暗沉。
          </Text>
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
    ...Typography.body.md,
    color: theme.colors.textTertiary,
    marginTop: Spacing[3],
  },
  errorText: {
    ...Typography.body.md,
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
    ...Typography.body.md,
    fontWeight: "600",
    color: Colors.neutral.white,
  },
  seasonBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing[4],
  },
  seasonBannerText: {
    fontSize: Typography.sizes.md,
    fontWeight: "600",
  },
  seasonCard: {
    borderRadius: BorderRadius["2xl"],
    overflow: "hidden",
    marginBottom: Spacing[4],
    ...Shadows.md,
  },
  seasonGradient: {
    padding: Spacing[6],
  },
  seasonLabel: {
    ...Typography.body.md,
    fontWeight: "400",
    color: Colors.overlay.light,
    marginBottom: Spacing[1],
  },
  seasonName: {
    ...Typography.styles.h2,
    color: Colors.neutral.white,
    marginBottom: Spacing[1],
  },
  seasonNameEn: {
    ...Typography.body.md,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.7)",
  },
  seasonActiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing[3],
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  seasonActiveText: {
    fontSize: Typography.sizes.xs,
    fontWeight: "600",
  },
  paletteCard: {
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing[5],
    marginBottom: Spacing[4],
    ...Shadows.sm,
  },
  paletteTitle: {
    ...Typography.styles.h4,
    color: theme.colors.textPrimary,
    marginBottom: Spacing[4],
  },
  paletteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[3],
  },
  paletteItem: {
    width: "22%",
    alignItems: "center",
    marginBottom: Spacing[2],
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing[1],
  },
  checkIcon: {
    textShadowColor: Colors.overlay.dark,
    textShadowRadius: 2,
  },
  colorHex: {
    ...Typography.caption.xs,
    color: theme.colors.textTertiary,
  },
  colorName: {
    ...Typography.caption.sm,
    color: theme.colors.textSecondary,
  },
  neutralRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[3],
  },
  neutralItem: {
    alignItems: "center",
  },
  neutralCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: Spacing[1],
  },
  avoidRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[3],
  },
  avoidItem: {
    alignItems: "center",
  },
  avoidCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing[1],
  },
  reasonCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    gap: Spacing[3],
    marginBottom: Spacing[4],
    ...Shadows.sm,
  },
  reasonText: {
    flex: 1,
    ...Typography.body.md,
    fontWeight: "400",
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  emptyTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginTop: Spacing[4],
    marginBottom: Spacing[2],
  },
  emptySubtitle: {
    fontSize: DesignTokens.typography.sizes.base,
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
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: Colors.neutral.white,
  },
});

export default ColorAnalysisScreen;

/* eslint-disable @typescript-eslint/no-misused-promises */
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import type { RootStackParamList } from "../../../navigation/types";
import { Ionicons } from "../../../polyfills/expo-vector-icons";
import {
  Spacing,
  BorderRadius,
  Shadows,
  DesignTokens,
  flatColors as colors,
} from "../../../design-system/theme";
import { useOnboardingStore, type RecommendationItem } from "../stores/onboardingStore";
import { onboardingService } from "../services/onboardingService";
import { MatchRadarChart, type MatchScores } from "../../../design-system/ui/MatchRadarChart";
import {
  goldenRecommendationApi,
  type GoldenOutfit,
} from "../../../services/api/golden-recommendation.api";
import { recommendationsApi } from "../../../services/api/tryon.api";

/** @mock fallback when all APIs are unavailable */
const MOCK_RECOMMENDATIONS: RecommendationItem[] = [
  {
    id: "rec_1",
    name: "职场精英套装",
    imageUrl: "https://placehold.co/300x400/C67B5C/FFFFFF?text=方案A",
    matchScore: 92,
    reason: "基于你选择的面试场景和简约风格，这套搭配专业得体又不失个性",
    items: [
      { name: "修身西装外套", category: "上装", imageUrl: "" },
      { name: "直筒西裤", category: "下装", imageUrl: "" },
      { name: "尖头高跟鞋", category: "鞋履", imageUrl: "" },
    ],
    matchScores: {
      bodyType: 88,
      occasion: 95,
      color: 82,
      style: 90,
      budget: 85,
    },
  },
  {
    id: "rec_2",
    name: "温柔通勤风",
    imageUrl: "https://placehold.co/300x400/D4917A/FFFFFF?text=方案B",
    matchScore: 87,
    reason: "结合你的优雅偏好和常规版型，这套搭配温柔知性",
    items: [
      { name: "针织开衫", category: "上装", imageUrl: "" },
      { name: "A字半裙", category: "下装", imageUrl: "" },
      { name: "乐福鞋", category: "鞋履", imageUrl: "" },
    ],
    matchScores: {
      bodyType: 82,
      occasion: 88,
      color: 85,
      style: 92,
      budget: 90,
    },
  },
  {
    id: "rec_3",
    name: "活力休闲装",
    imageUrl: "https://placehold.co/300x400/9AA88C/FFFFFF?text=方案C",
    matchScore: 81,
    reason: "适合你的日常场景和运动风格，舒适又有型",
    items: [
      { name: "宽松卫衣", category: "上装", imageUrl: "" },
      { name: "运动阔腿裤", category: "下装", imageUrl: "" },
      { name: "小白鞋", category: "鞋履", imageUrl: "" },
    ],
    matchScores: {
      bodyType: 78,
      occasion: 85,
      color: 75,
      style: 88,
      budget: 82,
    },
  },
];

function goldenOutfitToRecommendation(outfit: GoldenOutfit): RecommendationItem {
  const matchScores = {
    bodyType: Math.round(outfit.match_scores.bodyType * 100),
    occasion: Math.round(outfit.match_scores.occasion * 100),
    color: Math.round(outfit.match_scores.color * 100),
    style: Math.round(outfit.match_scores.style * 100),
    budget: Math.round(outfit.match_scores.budget * 100),
  };
  const overallMatch = Math.round(
    (matchScores.bodyType +
      matchScores.occasion +
      matchScores.color +
      matchScores.style +
      matchScores.budget) /
      5
  );

  return {
    id: outfit.id,
    name: outfit.name,
    imageUrl: "",
    matchScore: Math.min(99, Math.max(60, overallMatch)),
    reason: outfit.explanation,
    items: outfit.items.map((item) => ({
      name: item.name,
      category: item.category,
      imageUrl: "",
    })),
    matchScores,
  };
}

export const ResultStep: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { newOnboarding, setRecommendations, formData } = useOnboardingStore();
  const [isPreview, setIsPreview] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingRecs, setIsFetchingRecs] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  const [localRecommendations, setLocalRecommendations] = useState<RecommendationItem[]>([]);

  const recommendations =
    localRecommendations.length > 0
      ? localRecommendations
      : newOnboarding.recommendations.length > 0
      ? newOnboarding.recommendations
      : MOCK_RECOMMENDATIONS;

  const fetchGoldenRecommendations = useCallback(async () => {
    setIsFetchingRecs(true);
    setFetchError(null);

    try {
      const primaryOccasion = newOnboarding.selectedScenes[0] ?? undefined;
      const goldenResponse = await goldenRecommendationApi.findMatchingGoldenRecommendation({
        bodyType: formData.bodyType ?? undefined,
        occasion: primaryOccasion,
        stylePreference:
          newOnboarding.selectedStyles.length > 0 ? newOnboarding.selectedStyles : undefined,
        budgetMin: newOnboarding.budgetRange.min,
        budgetMax: newOnboarding.budgetRange.max,
      });

      if (goldenResponse.success && goldenResponse.data?.outfits) {
        const recs = goldenResponse.data.outfits.map(goldenOutfitToRecommendation);
        if (recs.length > 0) {
          setLocalRecommendations(recs);
          setRecommendations(recs);
          return;
        }
      }

      const coldStartResponse = await recommendationsApi.getColdStartRecommendations(3);
      if (
        coldStartResponse.success &&
        coldStartResponse.data &&
        coldStartResponse.data.length > 0
      ) {
        const recs: RecommendationItem[] = coldStartResponse.data.map((item, index) => ({
          id: item.id || `cold_${index}`,
          name: item.name || `推荐方案${index + 1}`,
          imageUrl: item.mainImage || "",
          matchScore: item.score ? Math.round(item.score * 100) : 80,
          reason: item.matchReasons?.join("，") ?? "基于你的偏好推荐",
          items: [{ name: item.name, category: item.category, imageUrl: item.mainImage }],
        }));
        setLocalRecommendations(recs);
        setRecommendations(recs);
        return;
      }

      setLocalRecommendations(MOCK_RECOMMENDATIONS);
    } catch {
      setFetchError("推荐加载失败，显示示例方案");
      setLocalRecommendations(MOCK_RECOMMENDATIONS);
    } finally {
      setIsFetchingRecs(false);
    }
  }, [newOnboarding, formData, setRecommendations]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPreview(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 2000);

    return () => clearTimeout(timer);
  }, [fadeAnim]);

  useEffect(() => {
    if (newOnboarding.recommendations.length === 0 && localRecommendations.length === 0) {
      void fetchGoldenRecommendations();
    }
  }, [
    newOnboarding.recommendations.length,
    localRecommendations.length,
    fetchGoldenRecommendations,
  ]);

  const handleComplete = useCallback(async () => {
    setIsLoading(true);
    try {
      await onboardingService.completeOnboarding(formData, newOnboarding);
    } catch {
      // Fallback: at least save profile data via legacy path
      try {
        await onboardingService.saveOnboardingData(formData);
      } catch {
        /* best effort */
      }
    }
    await onboardingService.markOnboardingComplete();
    navigation.reset({
      index: 0,
      routes: [{ name: "MainTabs" as never }],
    });
    setIsLoading(false);
  }, [formData, newOnboarding, navigation]);

  const handleRetryFetch = useCallback(() => {
    setLocalRecommendations([]);
    void fetchGoldenRecommendations();
  }, [fetchGoldenRecommendations]);

  const handleSkip = useCallback(() => {
    void handleComplete();
  }, [handleComplete]);

  if (isPreview) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.previewContainer}>
          <View style={s.previewIconWrap}>
            <Ionicons name="sparkles" size={48} color={colors.primary} />
          </View>
          <Text style={s.previewTitle}>基于你的选择</Text>
          <Text style={s.previewSubtitle}>伊伊正在为你搭配...</Text>
          <View style={s.previewTags}>
            {newOnboarding.selectedScenes.map((scene) => (
              <View key={scene} style={s.previewTag}>
                <Text style={s.previewTagText}>{scene}</Text>
              </View>
            ))}
            {newOnboarding.selectedStyles.map((style) => (
              <View key={style} style={s.previewTag}>
                <Text style={s.previewTagText}>{style}</Text>
              </View>
            ))}
          </View>
          <ActivityIndicator size="large" color={colors.primary} style={s.previewLoader} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.stepLabel}>4/4</Text>
        <Text style={s.title}>伊伊的推荐</Text>
        <Text style={s.subtitle}>{recommendations.length}套搭配方案，为你量身定制</Text>
      </View>

      <Animated.View style={[s.resultsContainer, { opacity: fadeAnim }]}>
        {isFetchingRecs ? (
          <View style={s.fetchingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={s.fetchingText}>正在生成推荐方案...</Text>
          </View>
        ) : (
          <>
            {fetchError && (
              <TouchableOpacity
                style={s.errorBanner}
                onPress={handleRetryFetch}
                activeOpacity={0.7}
              >
                <Ionicons name="cloud-offline-outline" size={16} color={colors.textTertiary} />
                <Text style={s.errorBannerText}>{fetchError}</Text>
                <Text style={s.retryText}>重试</Text>
              </TouchableOpacity>
            )}
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.carousel}
            >
              {recommendations.map((rec) => (
                <View key={rec.id} style={s.recCard}>
                  <View style={s.recImageWrap}>
                    <View style={s.recImagePlaceholder}>
                      <Ionicons name="shirt-outline" size={40} color={colors.primary} />
                    </View>
                    {!rec.matchScores && (
                      <View style={s.matchBadge}>
                        <Text style={s.matchBadgeText}>{rec.matchScore}%匹配</Text>
                      </View>
                    )}
                  </View>

                  {rec.matchScores ? (
                    <View style={s.radarChartContainer}>
                      <MatchRadarChart
                        scores={rec.matchScores as MatchScores}
                        size={220}
                        showLabels={true}
                        showScoreList={true}
                      />
                    </View>
                  ) : (
                    <View style={s.matchScoreFallback}>
                      <Text style={s.matchScoreFallbackText}>{rec.matchScore}% 综合匹配</Text>
                    </View>
                  )}

                  <Text style={s.recName}>{rec.name}</Text>
                  <Text style={s.recReason}>{rec.reason}</Text>
                  <View style={s.recItems}>
                    {rec.items.map((item, i) => (
                      <View key={i} style={s.recItemChip}>
                        <Text style={s.recItemChipText}>{item.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </>
        )}
      </Animated.View>

      <View style={s.footer}>
        <TouchableOpacity style={s.skipButton} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={s.skipButtonText}>跳过</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.completeButton}
          onPress={handleComplete}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <>
              <Text style={s.completeButtonText}>开始使用</Text>
              <Ionicons name="checkmark-circle" size={20} color={colors.surface} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  previewContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing[8],
  },
  previewIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[5],
  },
  previewTitle: {
    fontSize: DesignTokens.typography.sizes["2xl"],
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: Spacing[2],
  },
  previewSubtitle: {
    fontSize: DesignTokens.typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: Spacing[5],
  },
  previewTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[2],
    justifyContent: "center",
    marginBottom: Spacing[6],
  },
  previewTag: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
    backgroundColor: colors.primaryLight,
  },
  previewTagText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.primaryDark,
    fontWeight: "500",
  },
  previewLoader: {
    marginTop: Spacing[4],
  },
  header: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[3],
  },
  stepLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.primary,
    fontWeight: "600",
    marginBottom: Spacing[1],
  },
  title: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: Spacing[1],
  },
  subtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textTertiary,
  },
  resultsContainer: {
    flex: 1,
  },
  fetchingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fetchingText: {
    fontSize: DesignTokens.typography.sizes.md,
    color: colors.textSecondary,
    marginTop: Spacing[3],
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[3],
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    borderRadius: BorderRadius.md,
    backgroundColor: colors.surfaceSecondary,
    gap: Spacing[2],
  },
  errorBannerText: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
  },
  retryText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.primary,
    fontWeight: "600",
  },
  carousel: {
    paddingHorizontal: Spacing[5],
    gap: Spacing[4],
  },
  recCard: {
    width: 280,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    marginRight: Spacing[4],
  },
  recImageWrap: {
    position: "relative",
    marginBottom: Spacing[3],
  },
  recImagePlaceholder: {
    width: "100%",
    height: 180,
    borderRadius: BorderRadius.lg,
    backgroundColor: colors.backgroundTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  radarChartContainer: {
    alignItems: "center",
    paddingVertical: Spacing[2],
    marginBottom: Spacing[2],
  },
  matchScoreFallback: {
    alignItems: "center",
    paddingVertical: Spacing[2],
    marginBottom: Spacing[1],
  },
  matchScoreFallbackText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "700",
    color: colors.primary,
  },
  matchBadge: {
    position: "absolute",
    top: Spacing[2],
    right: Spacing[2],
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
    backgroundColor: colors.primary,
  },
  matchBadgeText: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "700",
    color: colors.surface,
  },
  recName: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: Spacing[1],
  },
  recReason: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing[3],
  },
  recItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[1],
  },
  recItemChip: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: colors.backgroundTertiary,
  },
  recItemChipText: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
    paddingBottom: Spacing[6],
    gap: Spacing[3],
  },
  skipButton: {
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[4],
  },
  skipButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textTertiary,
    fontWeight: "500",
  },
  completeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing[4],
    gap: Spacing[2],
    ...Shadows.brand,
    minHeight: 52,
  },
  completeButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.surface,
  },
});

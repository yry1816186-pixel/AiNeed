import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";
import { profileApi } from "@/src/services/api/profile.api";
import type {
  UserProfile,
  BodyAnalysisReport,
  ColorAnalysisReport,
} from "@/src/services/api/profile.api";
import type { RootStackParamList } from "@/src/types/navigation";
import { colors } from "@/src/theme/tokens/colors";
import { typography } from "@/src/theme/tokens/typography";
import { spacing } from "@/src/theme/tokens/spacing";
import { shadows } from "@/src/theme/tokens/shadows";
import { withErrorBoundary } from "@/src/shared/components/ErrorBoundary";
import { BodyTypeCard } from '../../../components/BodyTypeCard';
import { ColorSeasonCard } from '../../../components/ColorSeasonCard';
import { StyleTagsCard } from '../../../components/StyleTagsCard';
import { SharePosterPreview } from '../../../components/SharePosterPreview';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { Spacing } from '../../../design-system/theme';

type ProfileReportNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const STYLE_PERSONALITY_MAP: Record<string, Record<string, string>> = {
  hourglass: {
    spring: "优雅知性的春日精灵",
    summer: "清冷淡雅的夏日仙子",
    autumn: "温暖醇厚的秋日女神",
    winter: "冷艳高贵的冬日女王",
  },
  rectangle: {
    spring: "活力灵动的春日少女",
    summer: "清新脱俗的夏日精灵",
    autumn: "自然随性的秋日旅人",
    winter: "利落干练的冬日先锋",
  },
  triangle: {
    spring: "温柔甜美的春日玫瑰",
    summer: "恬静优雅的夏日百合",
    autumn: "沉稳内敛的秋日枫叶",
    winter: "深邃迷人的冬日星空",
  },
  inverted_triangle: {
    spring: "阳光自信的春日猎手",
    summer: "冷静从容的夏日航海者",
    autumn: "豪迈洒脱的秋日骑士",
    winter: "锋芒毕露的冬日战士",
  },
  oval: {
    spring: "亲切温暖的春日暖阳",
    summer: "温润如玉的夏夜清风",
    autumn: "包容大气的秋日丰收",
    winter: "沉稳睿智的冬日智者",
  },
};

function getStylePersonality(bodyType?: string, colorSeason?: string): string {
  if (!bodyType || !colorSeason) {
    return "探索你的专属风格";
  }
  const typeMap = STYLE_PERSONALITY_MAP[bodyType];
  if (!typeMap) {
    return "探索你的专属风格";
  }
  return typeMap[colorSeason] || "探索你的专属风格";
}

function getProfileCompletion(profile: UserProfile): number {
  const fields: (keyof UserProfile)[] = [
    "nickname",
    "gender",
    "height",
    "weight",
    "shoulder",
    "bust",
    "waist",
    "hip",
    "bodyType",
    "skinTone",
    "colorSeason",
  ];
  const filled = fields.filter((f) => profile[f] !== undefined && profile[f] !== null).length;
  return Math.round((filled / fields.length) * 100);
}

export const ProfileReportScreenComponent: React.FC = () => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const navigation = useNavigation<ProfileReportNavigationProp>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bodyAnalysis, setBodyAnalysis] = useState<BodyAnalysisReport | null>(null);
  const [colorAnalysis, setColorAnalysis] = useState<ColorAnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({
    bodyType: false,
    colorSeason: false,
    styleTags: true,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, bodyRes, colorRes] = await Promise.all([
        profileApi.getProfile(),
        profileApi.getBodyAnalysis(),
        profileApi.getColorAnalysis(),
      ]);
      if (profileRes.success && profileRes.data) {
        setProfile(profileRes.data);
      }
      if (bodyRes.success && bodyRes.data) {
        setBodyAnalysis(bodyRes.data);
      }
      if (colorRes.success && colorRes.data) {
        setColorAnalysis(colorRes.data);
      }
    } catch {
      // Error handled by error boundary
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const toggleCard = useCallback((cardKey: string) => {
    setCollapsedCards((prev) => ({ ...prev, [cardKey]: !prev[cardKey] }));
  }, []);

  const completionPercent = useMemo(() => {
    if (!profile) {
      return 0;
    }
    return getProfileCompletion(profile);
  }, [profile]);

  const stylePersonality = useMemo(() => {
    return getStylePersonality(profile?.bodyType, profile?.colorSeason);
  }, [profile?.bodyType, profile?.colorSeason]);

  const displayName = profile?.nickname || "用户";
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const isProfileIncomplete = !profile?.bodyType && !profile?.colorSeason;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityLabel="返回"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={colors.neutral[900]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>风格画像报告</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.warmPrimary} />
          <Text style={styles.loadingText}>正在生成你的风格画像...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isProfileIncomplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityLabel="返回"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={colors.neutral[900]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>风格画像报告</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="color-wand-outline" size={64} color={colors.neutral[300]} />
          <Text style={styles.emptyTitle}>画像尚未完成</Text>
          <Text style={styles.emptySubtitle}>完善你的体型和色彩信息，解锁专属风格画像报告</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate("Settings")}
            accessibilityLabel="去完善画像"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[colors.gradients.coralRose[0], colors.gradients.coralRose[1]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyButtonGradient}
            >
              <Text style={styles.emptyButtonText}>去完善画像</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityLabel="返回"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>风格画像报告</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(600).springify()}>
          <LinearGradient
            colors={[colors.gradients.coralRose[0], colors.gradients.coralRose[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <View style={styles.summaryTop}>
              <View style={styles.avatarContainer}>
                {profile?.avatar ? (
                  <Image source={{ uri: profile.avatar }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{avatarInitial}</Text>
                  </View>
                )}
              </View>
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryName}>{displayName}</Text>
                <Text style={styles.summaryPersonality}>{stylePersonality}</Text>
              </View>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${completionPercent}%` }]} />
              </View>
              <Text style={styles.progressText}>画像完成度 {completionPercent}%</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(100).springify()}>
          <BodyTypeCard
            bodyAnalysis={bodyAnalysis}
            shoulder={profile?.shoulder}
            waist={profile?.waist}
            hip={profile?.hip}
            collapsed={collapsedCards.bodyType}
            onToggle={() => toggleCard("bodyType")}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200).springify()}>
          <ColorSeasonCard
            colorAnalysis={colorAnalysis}
            collapsed={collapsedCards.colorSeason}
            onToggle={() => toggleCard("colorSeason")}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(300).springify()}>
          <StyleTagsCard
            stylePreferences={profile?.stylePreferences ?? null}
            styleRecommendations={null}
            collapsed={collapsedCards.styleTags}
            onToggle={() => toggleCard("styleTags")}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(400).springify()}>
          <SharePosterPreview
            nickname={displayName}
            avatar={profile?.avatar}
            bodyTypeName={bodyAnalysis?.bodyType?.label || ""}
            colorSeasonName={colorAnalysis?.colorSeason?.label || ""}
            styleTags={bodyAnalysis?.recommendations?.idealStyles || []}
            personalityLine={stylePersonality}
          />
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.shareButton}
          activeOpacity={0.8}
          accessibilityLabel="分享我的风格画像"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[colors.gradients.oceanDeep[0], colors.gradients.oceanDeep[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shareButtonGradient}
          >
            <Ionicons name="share-social-outline" size={20} color={colors.surface} />
            <Text style={styles.shareButtonText}>分享我的风格画像</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.layout.screenPadding,
    paddingVertical: spacing.scale[3],
    backgroundColor: colors.neutral.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
    ...shadows.presets.xs,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[900],
  },
  headerRight: {
    width: Spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.layout.screenPadding,
    paddingTop: spacing.layout.cardGap,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.scale[4],
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.neutral[500],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.layout.screenPadding,
    gap: spacing.scale[3],
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[800],
    marginTop: spacing.scale[4],
  },
  emptySubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
    textAlign: "center",
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: spacing.scale[4],
    borderRadius: spacing.borderRadius.xl,
    overflow: "hidden",
  },
  emptyButtonGradient: {
    paddingVertical: spacing.scale[3],
    paddingHorizontal: spacing.scale[8],
  },
  emptyButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.surface,
  },
  summaryCard: {
    borderRadius: spacing.borderRadius["2xl"],
    padding: spacing.layout.modalPadding,
    marginBottom: spacing.layout.cardGap,
    ...shadows.presets.lg,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.scale[4],
  },
  avatarContainer: {
    marginRight: spacing.scale[4],
  },
  avatar: {
    width: Spacing['3xl'],
    height: Spacing['3xl'],
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  avatarText: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.surface,
  },
  avatarImage: {
    width: Spacing['3xl'],
    height: Spacing['3xl'],
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  summaryInfo: {
    flex: 1,
  },
  summaryName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.surface,
    marginBottom: spacing.scale[1],
  },
  summaryPersonality: {
    fontSize: typography.fontSize.sm,
    color: "rgba(255,255,255,0.9)",
    fontWeight: typography.fontWeight.medium,
  },
  progressContainer: {
    gap: spacing.scale[2],
  },
  progressTrack: {
    height: DesignTokens.spacing['1.5'],
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.surface,
  },
  progressText: {
    fontSize: typography.fontSize.xs,
    color: "rgba(255,255,255,0.85)",
    fontWeight: typography.fontWeight.medium,
  },
  bottomSpacer: {
    height: Spacing['4xl'],
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.layout.screenPadding,
    paddingVertical: spacing.scale[4],
    backgroundColor: colors.neutral.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.neutral[200],
    ...shadows.presets.md,
  },
  shareButton: {
    borderRadius: spacing.borderRadius.xl,
    overflow: "hidden",
  },
  shareButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.scale[2],
    paddingVertical: spacing.scale[3] + 2,
  },
  shareButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.surface,
  },
}))

const ProfileReportScreen = withErrorBoundary(ProfileReportScreenComponent, {
  screenName: "ProfileReportScreen",
  maxRetries: 3,
});

export { ProfileReportScreen };
export default ProfileReportScreen;

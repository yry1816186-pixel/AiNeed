import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useAuthStore } from "../stores/index";
import { authApi, userApi } from "../services/api/auth.api";
import { ProfileCompletenessBar } from "../components/profile/ProfileCompletenessBar";
import { useProfileStore } from "../stores/profileStore";
import type { UserStats, User } from "../types/user";
import type { RootStackParamList } from "../types/navigation";
import { theme } from '../design-system/theme';

// 引入增强主题令牌
import { colors } from "../theme/tokens/colors";
import { DesignTokens } from "../theme/tokens/design-tokens";
import { typography } from "../theme/tokens/typography";
import { spacing } from "../theme/tokens/spacing";
import { shadows } from "../theme/tokens/shadows";
import { useTheme } from "../contexts/ThemeContext";
import { seasonLabels, type ColorSeason } from "../theme/tokens/season-colors";
import { useScreenTracking } from "../hooks/useAnalytics";
import { useTranslation, useI18n } from "../i18n";
import { withErrorBoundary } from "../shared/components/ErrorBoundary";
import { BrandPattern, BrandDivider } from "../components/brand/BrandMotif";

type ProfileNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ProfileScreenComponent: React.FC = () => {
  const navigation = useNavigation<ProfileNavigationProp>();
  useScreenTracking("Profile");
  const t = useTranslation();
  const { language, setLanguage, getLanguageName, supportedLanguages } = useI18n();
  const { user, logout, isVip } = useAuthStore();
  const { completeness, loadCompleteness, colorAnalysis } = useProfileStore();
  const { colorSeason, seasonAccent, setSeasonAccent } = useTheme();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 季节强调色，回退到品牌色
  const accentColor = seasonAccent?.accent ?? DesignTokens.colors.brand.terracotta;

  const fetchStats = useCallback(async () => {
    try {
      const response = await userApi.getStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch {
      // Stats fetch failed silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
    void loadCompleteness();
  }, [fetchStats, loadCompleteness]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchStats();
  }, [fetchStats]);

  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout();
      void logout();
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch {
      void logout();
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    }
  }, [logout, navigation]);

  const displayName = user?.nickname || user?.email?.split("@")[0] || "用户";
  const displayEmail = user?.email || "";
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const menuItems = [
    {
      icon: "create-outline" as const,
      label: t.profile.editProfile,
      accessibilityLabel: t.profile.editProfile,
      color: theme.colors.primary,
      onPress: () => navigation.navigate("ProfileEdit" as never),
    },
    {
      icon: "body-outline" as const,
      label: "体型分析",
      accessibilityLabel: "体型分析",
      color: theme.colors.textSecondary,
      onPress: () => navigation.navigate("BodyAnalysis" as never),
    },
    {
      icon: "color-palette-outline" as const,
      label: colorSeason ? `色彩分析 · ${seasonLabels[colorSeason]}` : "色彩分析",
      accessibilityLabel: "色彩分析",
      color: colorSeason ? accentColor : theme.colors.textSecondary,
      onPress: () => navigation.navigate("ColorAnalysis" as never),
    },
    {
      icon: "sparkles-outline" as const,
      label: "风格测试",
      accessibilityLabel: "风格测试",
      color: theme.colors.textSecondary,
      onPress: () => navigation.navigate("StyleQuiz" as never),
    },
    {
      icon: "share-outline" as const,
      label: "分享我的风格",
      accessibilityLabel: "分享我的风格",
      color: theme.colors.textSecondary,
      onPress: () => navigation.navigate("SharePoster" as never),
    },
    {
      icon: "settings-outline" as const,
      label: t.profile.settings,
      accessibilityLabel: t.profile.settings,
      color: theme.colors.textSecondary,
      onPress: () => navigation.navigate("Settings"),
    },
    {
      icon: "bag-outline" as const,
      label: t.profile.myOrders,
      accessibilityLabel: t.profile.myOrders,
      color: theme.colors.textSecondary,
      onPress: () => navigation.navigate("Orders"),
    },
    {
      icon: "shirt-outline" as const,
      label: t.wardrobe.title,
      accessibilityLabel: t.wardrobe.title,
      color: theme.colors.textSecondary,
      onPress: () => navigation.navigate("Wardrobe" as never),
    },
    {
      icon: "sparkles-outline" as const,
      label: "AI 造型师",
      accessibilityLabel: "AI 造型师",
      color: theme.colors.textSecondary,
      onPress: () => navigation.navigate("AiStylist" as never),
    },
    {
      icon: "heart-outline" as const,
      label: t.profile.myFavorites,
      accessibilityLabel: t.profile.myFavorites,
      color: theme.colors.textSecondary,
      onPress: () => navigation.navigate("Favorites" as never),
    },
    {
      icon: "color-wand-outline" as const,
      label: "私人定制",
      accessibilityLabel: "私人定制",
      color: theme.colors.purple,
      onPress: () => navigation.navigate("CustomDesign" as never),
    },
    {
      icon: "diamond-outline" as const,
      label: "会员订阅",
      accessibilityLabel: "会员订阅",
      color: theme.colors.amber,
      onPress: () => navigation.navigate("Subscription" as never),
    },
    {
      icon: "globe-outline" as const,
      label: t.profile.language,
      accessibilityLabel: t.profile.language,
      color: theme.colors.textSecondary,
      onPress: () => {
        Alert.alert(
          t.profile.language,
          "",
          supportedLanguages.map((lang) => ({
            text: `${lang.nativeName}${lang.code === language ? " ✓" : ""}`,
            onPress: () => void setLanguage(lang.code),
          })).concat([{ text: t.common.cancel, style: "cancel" as const }])
        );
      },
    },
    {
      icon: "log-out-outline" as const,
      label: t.profile.logout,
      accessibilityLabel: t.profile.logout,
      color: theme.colors.error,
      onPress: () => { void handleLogout(); },
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BrandPattern variant="weave" style={styles.headerMotif} />
        <Text style={styles.headerTitle}>{t.profile.title}</Text>
      </View>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Profile Card - 升级版（渐变背景 + 大圆角） */}
        <Animated.View entering={FadeInUp.duration(600).springify()}>
          <LinearGradient
            colors={[colors.gradients.coralRose[0], colors.gradients.coralRose[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}
          >
            <View style={styles.avatarContainer}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{avatarInitial}</Text>
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{displayName}</Text>
                <Text style={styles.profileEmail}>{displayEmail}</Text>
                {isVip && (
                  <View style={styles.memberBadge}>
                    <Ionicons name="diamond" size={12} color={DesignTokens.colors.neutral.white} />
                    <Text style={styles.memberBadgeText}>VIP会员</Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate("Settings")}
              accessibilityLabel="编辑个人资料"
              accessibilityRole="button"
            >
              <Ionicons name="create-outline" size={16} color={DesignTokens.colors.neutral.white} />
              <Text style={styles.editButtonText}>{t.profile.editProfile}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Profile Completeness Bar */}
        <BrandDivider />
        {completeness && (
          <View style={styles.completenessContainer}>
            <ProfileCompletenessBar
              percentage={completeness.percentage}
              missingFields={completeness.missingFields}
              onPress={() => navigation.navigate("ProfileEdit" as never)}
            />
          </View>
        )}

        {/* Season Color Status Card */}
        {colorSeason && seasonAccent && (
          <TouchableOpacity
            style={[styles.seasonCard, { borderLeftColor: accentColor }]}
            onPress={() => navigation.navigate("ColorAnalysis" as never)}
            activeOpacity={0.7}
            accessibilityLabel={`查看${seasonLabels[colorSeason]}色彩详情`}
            accessibilityRole="button"
          >
            <View style={styles.seasonCardHeader}>
              <View style={[styles.seasonDot, { backgroundColor: accentColor }]} />
              <Text style={styles.seasonCardTitle}>我的色彩季型</Text>
              <Ionicons name="chevron-forward-outline" size={16} color={theme.colors.textTertiary} />
            </View>
            <View style={styles.seasonCardBody}>
              <Text style={[styles.seasonCardLabel, { color: accentColor }]}>
                {seasonLabels[colorSeason]}
              </Text>
              <View style={styles.seasonColorPreview}>
                {seasonAccent.gradient.map((hex, i) => (
                  <View key={i} style={[styles.seasonColorChip, { backgroundColor: hex }]} />
                ))}
                <View style={[styles.seasonColorChip, { backgroundColor: seasonAccent.accent }]} />
                <View style={[styles.seasonColorChip, { backgroundColor: seasonAccent.accentLight }]} />
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Stats Cards */}
        {loading ? (
          <View style={styles.statsLoading}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.totalClothes ?? 0}</Text>
              <Text style={styles.statLabel}>服装数量</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.totalOutfits ?? 0}</Text>
              <Text style={styles.statLabel}>搭配数量</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {(user as User)?.createdAt
                  ? Math.max(
                      1,
                      Math.ceil(
                        (Date.now() - new Date((user as User).createdAt).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    )
                  : 0}
              </Text>
              <Text style={styles.statLabel}>使用天数</Text>
            </View>
          </View>
        )}

        {/* Menu Section */}
        <BrandDivider />
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, index === menuItems.length - 1 && styles.menuItemLast]}
              onPress={item.onPress}
              activeOpacity={0.6}
              accessibilityLabel={item.accessibilityLabel}
              accessibilityRole="button"
            >
              <Ionicons name={item.icon} size={22} color={item.color} />
              <Text style={[styles.menuText, { color: item.color }]}>{item.label}</Text>
              <Ionicons
                name="chevron-forward-outline"
                size={18}
                color={theme.colors.textTertiary}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Learning tip */}
        <View style={styles.learningTip}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.textTertiary} />
          <Text style={styles.learningTipText}>你的画像会随使用越来越精准</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[50] },
  header: {
    padding: spacing.layout.screenPadding,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    ...shadows.presets.xs,
    overflow: "hidden",
  },
  headerMotif: {
    right: -8,
    top: -8,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[900],
  },
  content: { flex: 1 },

  // ===== Profile Card（升级版 - 渐变背景）=====
  profileCard: {
    margin: spacing.layout.screenPadding,
    borderRadius: spacing.borderRadius["2xl"],
    padding: spacing.layout.modalPadding,
    ...shadows.presets.lg,
  },
  avatarContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.5)",
  },
  avatarText: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: DesignTokens.colors.neutral.white,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.5)",
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: DesignTokens.colors.neutral.white,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: typography.fontSize.sm,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  memberBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: DesignTokens.colors.neutral.white,
    marginLeft: 4,
  },
  editButton: {
    marginTop: 16,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  editButtonText: {
    color: DesignTokens.colors.neutral.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },

  // ===== Stats Cards（升级版）=====
  statsLoading: {
    paddingVertical: spacing.layout.sectionGap,
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: spacing.layout.screenPadding,
    marginBottom: spacing.layout.cardGap,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.neutral.white,
    borderRadius: spacing.borderRadius.xl,
    padding: spacing.layout.cardPadding,
    alignItems: "center",
    ...shadows.presets.sm,
  },
  statValue: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.brand.warmPrimary,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
    marginTop: 6,
  },

  // ===== Menu Section（升级版）=====
  menuSection: {
    backgroundColor: colors.neutral.white,
    marginHorizontal: spacing.layout.screenPadding,
    borderRadius: spacing.borderRadius.xl,
    overflow: "hidden",
    marginBottom: 40,
    ...shadows.presets.md,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.layout.listItemPadding,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  completenessContainer: {
    marginHorizontal: spacing.layout.screenPadding,
    backgroundColor: colors.neutral.white,
    borderRadius: spacing.borderRadius.xl,
    padding: spacing.layout.cardPadding,
    marginBottom: spacing.layout.cardGap,
    ...shadows.presets.sm,
  },
  seasonCard: {
    marginHorizontal: spacing.layout.screenPadding,
    backgroundColor: colors.neutral.white,
    borderRadius: spacing.borderRadius.xl,
    padding: spacing.layout.cardPadding,
    marginBottom: spacing.layout.cardGap,
    borderLeftWidth: 4,
    ...shadows.presets.sm,
  },
  seasonCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  seasonDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  seasonCardTitle: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[700],
  },
  seasonCardBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  seasonCardLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  seasonColorPreview: {
    flexDirection: "row",
    gap: 4,
  },
  seasonColorChip: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  learningTip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: spacing.layout.screenPadding,
    paddingVertical: spacing.layout.sectionGap,
    marginBottom: 20,
  },
  learningTipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.neutral[500],
  },
});

const ProfileScreen = withErrorBoundary(ProfileScreenComponent, {
  screenName: "ProfileScreen",
  maxRetries: 3,
  onError: (error, errorInfo, structuredError) => {
    console.error("[ProfileScreen] Error:", structuredError);
  },
  onReset: () => {
    console.log("[ProfileScreen] Error boundary reset");
  },
});

export { ProfileScreen };
export default ProfileScreen;

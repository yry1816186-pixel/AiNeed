import React, { useRef, useCallback, useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { Ionicons } from "../polyfills/expo-vector-icons";
import { LinearGradient } from "../polyfills/expo-linear-gradient";
import Share from "react-native-share";
import { theme, Colors, Spacing, BorderRadius, Shadows } from '../design-system/theme';
import { DesignTokens } from "../theme/tokens/design-tokens";
import { useProfileStore } from "../stores/profileStore";
import { useAuthStore } from "../stores/index";
import { ScreenLayout, Header } from "../shared/components/layout/ScreenLayout";
import type { RootStackParamList } from "../types/navigation";

type SharePosterNavProp = NavigationProp<RootStackParamList>;

const PLACEHOLDER_PALETTE = [DesignTokens.colors.brand.terracotta, DesignTokens.colors.semantic.warning, DesignTokens.colors.brand.camel, DesignTokens.colors.brand.sage, "DesignTokens.colors.brand.camel"]; // custom color

export const SharePosterScreen: React.FC = () => {
  const navigation = useNavigation<SharePosterNavProp>();
  const viewShotRef = useRef<View>(null);
  const { profile, colorAnalysis, loadProfile, loadColorAnalysis } = useProfileStore();
  const user = useAuthStore((s) => s.user);
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([loadProfile(), loadColorAnalysis()]);
      } catch (error) {
        // Continue with whatever data loaded
        console.error('Failed to load share data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [loadProfile, loadColorAnalysis]);

  const palette = colorAnalysis?.bestColors?.slice(0, 5) ?? PLACEHOLDER_PALETTE;

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      const styleLabel = colorAnalysis?.colorSeason?.label ?? "风格探索中";
      const paletteHex = palette.join(", ");

      // Try image capture if react-native-view-shot is available
      let shareOptions: { title: string; message: string; url?: string };
      try {
        const { captureRef } = require("react-native-view-shot");
        const uri = await captureRef(viewShotRef, { format: "png", quality: 0.9 });
        shareOptions = { title: "我的风格画像", message: `我的风格画像 - ${styleLabel}`, url: uri };
      } catch {
        // view-shot not available, share text with style info
        shareOptions = {
          title: "我的风格画像",
          message: `我在 AiNeed 上发现了我的风格画像: ${styleLabel}\n色彩: ${paletteHex}`,
        };
      }

      await Share.open(shareOptions);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (!msg.includes("cancelled") && !msg.includes("CANCEL")) {
        Alert.alert("分享失败", "请稍后重试");
      }
    } finally {
      setIsSharing(false);
    }
  }, [colorAnalysis?.colorSeason?.label, palette]);

  const displayName = profile?.nickname ?? user?.email?.split("@")[0] ?? "用户";
  const avatarInitial = displayName.charAt(0).toUpperCase();

  if (isLoading) {
    return (
      <ScreenLayout
        header={
          <Header
            title="分享海报"
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
          <Text style={styles.loadingText}>加载海报...</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      header={
        <Header
          title="分享海报"
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
      footer={
        <View style={styles.footerBar}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            disabled={isSharing}
            activeOpacity={0.8}
            accessibilityLabel="分享我的风格"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[DesignTokens.colors.brand.terracotta, DesignTokens.colors.brand.camel]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shareGradient}
            >
              {isSharing ? (
                <ActivityIndicator size="small" color={DesignTokens.colors.neutral.white} />
              ) : (
                <>
                  <Ionicons name="share-outline" size={20} color={DesignTokens.colors.neutral.white} />
                  <Text style={styles.shareButtonText}>分享我的风格</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.content}>
        {/* Poster preview card */}
        <View ref={viewShotRef} style={styles.posterCard} collapsable={false}>
          <LinearGradient
            colors={[DesignTokens.colors.brand.terracotta, DesignTokens.colors.brand.camel]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.posterGradient}
          >
            {/* User info */}
            <View style={styles.posterHeader}>
              <View style={styles.posterAvatar}>
                <Text style={styles.posterAvatarText}>{avatarInitial}</Text>
              </View>
              <Text style={styles.posterName}>{displayName}</Text>
            </View>

            {/* Style type section */}
            <View style={styles.posterSection}>
              <Text style={styles.posterSectionTitle}>我的风格画像</Text>
              <Text style={styles.posterStyleType}>
                {colorAnalysis?.colorSeason?.label ?? "风格探索中"}
              </Text>
            </View>

            {/* Color palette */}
            <View style={styles.posterSection}>
              <Text style={styles.posterSectionTitle}>我的色彩</Text>
              <View style={styles.posterPalette}>
                {palette.map((color, index) => (
                  <View key={index} style={[styles.posterColorDot, { backgroundColor: color }]} />
                ))}
              </View>
            </View>

            {/* App branding */}
            <View style={styles.posterBranding}>
              <Ionicons name="shirt-outline" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.posterBrandingText}>AiNeed - AI私人形象定制</Text>
            </View>
          </LinearGradient>
        </View>
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    alignItems: "center",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: DesignTokens.typography.sizes.md,
    color: theme.colors.textTertiary,
    marginTop: Spacing[3],
  },
  posterCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: BorderRadius["2xl"],
    overflow: "hidden",
    ...Shadows.lg,
  },
  posterGradient: {
    padding: Spacing[6],
    minHeight: 460,
  },
  posterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
    marginBottom: Spacing[6],
  },
  posterAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  posterAvatarText: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "600",
    color: DesignTokens.colors.neutral.white,
  },
  posterName: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "600",
    color: DesignTokens.colors.neutral.white,
  },
  posterSection: {
    marginBottom: Spacing[6],
  },
  posterSectionTitle: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: Spacing[2],
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  posterStyleType: {
    fontSize: DesignTokens.typography.sizes['3xl'],
    fontWeight: "600",
    color: DesignTokens.colors.neutral.white,
  },
  posterPalette: {
    flexDirection: "row",
    gap: Spacing[3],
  },
  posterColorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  posterBranding: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
    justifyContent: "center",
    marginTop: Spacing[8],
  },
  posterBrandingText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.6)",
  },
  footerBar: {
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    paddingBottom: Spacing[5],
  },
  shareButton: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    minHeight: 52,
  },
  shareGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[2],
    paddingVertical: Spacing[4],
  },
  shareButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: DesignTokens.colors.neutral.white,
  },
});

export default SharePosterScreen;

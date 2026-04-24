import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  Spacing,
  BorderRadius,
  DesignTokens,
  flatColors as colors,
} from "../../../../design-system/theme";
import { useTheme, createStyles } from "../../../../shared/contexts/ThemeContext";
import { useOnboardingStore } from "../../stores/onboardingStore";
import type { RecommendationItem } from "../../stores/onboardingStore";
import { onboardingService } from "../../services/onboardingService";
import { YiyiAvatar } from "../../../../design-system/ui/YiyiAvatar";

interface YiyiFirstOutfitStepProps {
  onComplete: () => void;
}

const useStyles = createStyles((themeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    messageRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingHorizontal: Spacing[5],
      paddingTop: Spacing[4],
      paddingBottom: Spacing[3],
      gap: Spacing[3],
    },
    yiyiBubble: {
      flex: 1,
      backgroundColor: themeColors.neutral[100],
      borderRadius: BorderRadius.xl,
      borderTopLeftRadius: 4,
      padding: Spacing[4],
    },
    yiyiMessage: {
      fontSize: DesignTokens.typography.sizes.md,
      lineHeight: 22,
      color: colors.textPrimary,
    },
    scrollContent: {
      paddingHorizontal: Spacing[4],
      paddingVertical: Spacing[2],
      gap: Spacing[4],
    },
    outfitCard: {
      width: 220,
      backgroundColor: themeColors.neutral[50],
      borderRadius: BorderRadius.xl,
      padding: Spacing[4],
      borderWidth: 2,
      borderColor: themeColors.neutral[200],
    },
    outfitCardSelected: {
      borderColor: DesignTokens.colors.brand.terracotta,
      backgroundColor: DesignTokens.colors.backgrounds.tertiary,
    },
    outfitImagePlaceholder: {
      height: 140,
      borderRadius: BorderRadius.lg,
      backgroundColor: themeColors.neutral[100],
      alignItems: "center",
      justifyContent: "center",
      marginBottom: Spacing[3],
    },
    outfitName: {
      fontSize: DesignTokens.typography.sizes.md,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: Spacing[1],
    },
    matchScore: {
      fontSize: DesignTokens.typography.sizes.sm,
      color: DesignTokens.colors.brand.terracotta,
      fontWeight: "600",
      marginBottom: Spacing[2],
    },
    reason: {
      fontSize: DesignTokens.typography.sizes.sm,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    confirmButton: {
      backgroundColor: DesignTokens.colors.brand.terracotta,
      borderRadius: BorderRadius.xl,
      paddingVertical: Spacing[4],
      marginHorizontal: Spacing[5],
      marginVertical: Spacing[4],
      alignItems: "center",
      justifyContent: "center",
      minHeight: 52,
    },
    confirmButtonDisabled: {
      opacity: 0.4,
    },
    confirmText: {
      fontSize: DesignTokens.typography.sizes.md,
      fontWeight: "600",
      color: colors.surface,
    },
    centerContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing[4],
      paddingHorizontal: Spacing[5],
    },
    loadingText: {
      fontSize: DesignTokens.typography.sizes.md,
      color: colors.textSecondary,
      marginTop: Spacing[3],
    },
    emptyText: {
      fontSize: DesignTokens.typography.sizes.md,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: Spacing[4],
    },
    skipButton: {
      paddingVertical: Spacing[3],
      paddingHorizontal: Spacing[6],
      borderRadius: BorderRadius.xl,
      borderWidth: 1,
      borderColor: themeColors.neutral[300],
    },
    skipButtonText: {
      fontSize: DesignTokens.typography.sizes.base,
      color: colors.textSecondary,
    },
    itemList: {
      marginTop: Spacing[2],
      gap: 2,
    },
    itemName: {
      fontSize: DesignTokens.typography.sizes.xs,
      color: colors.textTertiary,
    },
  })
);

export const YiyiFirstOutfitStep: React.FC<YiyiFirstOutfitStepProps> = ({ onComplete }) => {
  const { colors: themeColors } = useTheme();
  const styles = useStyles(themeColors);
  const newOnboarding = useOnboardingStore((s) => s.newOnboarding);
  const formData = useOnboardingStore((s) => s.formData);
  const setRecommendations = useOnboardingStore((s) => s.setRecommendations);

  const [outfits, setOutfits] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const loadOutfits = useCallback(async () => {
    try {
      const result = await onboardingService.generateFirstOutfits({
        primaryScenarios: newOnboarding.selectedScenes,
        styleExpression: newOnboarding.selectedStyles,
        garmentPreference: newOnboarding.garmentPreference,
        bodyType: formData.bodyType ?? undefined,
      });
      setOutfits(result);
      setRecommendations(result);
    } catch {
      setOutfits([]);
    } finally {
      setLoading(false);
    }
  }, [
    newOnboarding.selectedScenes,
    newOnboarding.selectedStyles,
    newOnboarding.garmentPreference,
    formData.bodyType,
    setRecommendations,
  ]);

  useEffect(() => {
    void loadOutfits();
  }, [loadOutfits]);

  const handleConfirm = useCallback(async () => {
    if (selectedIndex === null) return;
    setSaving(true);
    try {
      await onboardingService.saveOutfitToWardrobe(outfits[selectedIndex]);
      onComplete();
    } catch {
      // Retry once
      try {
        await onboardingService.saveOutfitToWardrobe(outfits[selectedIndex]);
        onComplete();
      } catch {
        // Skip on second failure -- don't block onboarding
        onComplete();
      }
    } finally {
      setSaving(false);
    }
  }, [selectedIndex, outfits, onComplete]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <YiyiAvatar size="lg" />
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>伊伊正在为你搭配...</Text>
      </View>
    );
  }

  if (outfits.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <YiyiAvatar size="lg" />
        <Text style={styles.emptyText}>暂时无法生成搭配，稍后再试</Text>
        <TouchableOpacity onPress={onComplete} style={styles.skipButton} activeOpacity={0.7}>
          <Text style={styles.skipButtonText}>跳过，稍后再说</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Yiyi message row */}
      <View style={styles.messageRow}>
        <YiyiAvatar size="md" />
        <View style={styles.yiyiBubble}>
          <Text style={styles.yiyiMessage}>
            基于你刚才的选择，给你搭了{outfits.length}套，看看喜欢哪个？
          </Text>
        </View>
      </View>

      {/* Outfit cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {outfits.map((outfit, i) => (
          <Animated.View key={outfit.id} entering={FadeIn.delay(i * 150)}>
            <TouchableOpacity
              style={[styles.outfitCard, selectedIndex === i && styles.outfitCardSelected]}
              onPress={() => setSelectedIndex(i)}
              activeOpacity={0.7}
            >
              <View style={styles.outfitImagePlaceholder}>
                <Text style={styles.outfitName}>{outfit.name}</Text>
              </View>
              <Text style={styles.matchScore}>匹配度 {outfit.matchScore}%</Text>
              <Text style={styles.reason} numberOfLines={2}>
                {outfit.reason}
              </Text>
              {outfit.items.length > 0 && (
                <View style={styles.itemList}>
                  {outfit.items.map((item, j) => (
                    <Text key={j} style={styles.itemName}>
                      {item.category === "tops"
                        ? "上装"
                        : item.category === "bottoms"
                        ? "下装"
                        : item.category === "shoes"
                        ? "鞋履"
                        : item.category}
                      : {item.name}
                    </Text>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>

      {/* Confirm button */}
      <TouchableOpacity
        style={[styles.confirmButton, selectedIndex === null && styles.confirmButtonDisabled]}
        onPress={handleConfirm}
        disabled={selectedIndex === null || saving}
        activeOpacity={0.7}
      >
        {saving ? (
          <ActivityIndicator size="small" color={themeColors.surface} />
        ) : (
          <Text style={styles.confirmText}>就这套了！</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

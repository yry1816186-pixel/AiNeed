import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import Animated, { SlideInRight } from "react-native-reanimated";
import {
  Spacing,
  BorderRadius,
  DesignTokens,
  flatColors as colors,
} from "../../../../design-system/theme";
import { useTheme, createStyles } from "../../../../shared/contexts/ThemeContext";
import { useOnboardingStore } from "../../stores/onboardingStore";

interface StyleExpressionStepProps {
  onNext: () => void;
}

interface StyleOption {
  id: string;
  label: string;
  subtitle: string;
}

interface OutfitOption {
  id: string;
  label: string;
  gradient: [string, string];
}

const STYLE_OPTIONS: StyleOption[] = [
  { id: "minimal_chic", label: "简约利落", subtitle: "less is more, 干净有质感" },
  { id: "gentle_elegant", label: "温柔优雅", subtitle: "柔美有女人味" },
  { id: "sporty_active", label: "活力运动", subtitle: "舒适自在有活力" },
  { id: "avant_garde", label: "前卫个性", subtitle: "敢于表达不随大流" },
  { id: "classic_refined", label: "经典知性", subtitle: "得体大方有品位" },
];

const OUTFIT_OPTIONS: OutfitOption[] = [
  { id: "casual_weekend", label: "休闲周末", gradient: ["#E8D5B7", "#C4956A"] },
  { id: "professional", label: "职场精英", gradient: ["#7B8FA2", "#5F6F7F"] },
  { id: "romantic_date", label: "浪漫约会", gradient: ["#D4917A", "#C67B5C"] },
  { id: "street_trend", label: "街头潮流", gradient: ["#2D3436", "#636E72"] },
  { id: "vacation", label: "度假风情", gradient: ["#8B9A7D", "#A3B096"] },
  { id: "sporty", label: "运动活力", gradient: ["#E17055", "#C44536"] },
];

const REQUIRED_OUTFIT_SELECTIONS = 2;

export const StyleExpressionStep: React.FC<StyleExpressionStepProps> = ({ onNext }) => {
  const selectedStyles = useOnboardingStore((s) => s.newOnboarding.selectedStyles);
  const setStyles = useOnboardingStore((s) => s.setStyles);
  const { colors: themeColors } = useTheme();
  const styles = useStyles(themeColors);

  const [selectedOutfits, setSelectedOutfits] = useState<string[]>([]);

  const selectedStyle = selectedStyles.length > 0 ? selectedStyles[0] : null;

  const handleSelectStyle = useCallback(
    (styleId: string) => {
      setStyles([styleId]);
    },
    [setStyles]
  );

  const handleToggleOutfit = useCallback(
    (outfitId: string) => {
      const isSelected = selectedOutfits.includes(outfitId);
      let newOutfits: string[];

      if (isSelected) {
        newOutfits = selectedOutfits.filter((id) => id !== outfitId);
      } else if (selectedOutfits.length < REQUIRED_OUTFIT_SELECTIONS) {
        newOutfits = [...selectedOutfits, outfitId];
      } else {
        return;
      }

      setSelectedOutfits(newOutfits);
    },
    [selectedOutfits]
  );

  const canProceed =
    selectedStyle !== null && selectedOutfits.length === REQUIRED_OUTFIT_SELECTIONS;

  return (
    <Animated.View entering={SlideInRight.duration(350)} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>你的风格</Text>
        <Text style={styles.subtitle}>让伊伊更懂你的穿搭偏好</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Style Selection Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>你的风格是...</Text>
          <View style={styles.styleList}>
            {STYLE_OPTIONS.map((option) => {
              const isSelected = selectedStyle === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.styleCard, isSelected && styles.styleCardSelected]}
                  onPress={() => handleSelectStyle(option.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.styleContent}>
                    <Text style={[styles.styleLabel, isSelected && styles.styleLabelSelected]}>
                      {option.label}
                    </Text>
                    <Text
                      style={[styles.styleSubtitle, isSelected && styles.styleSubtitleSelected]}
                    >
                      {option.subtitle}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkCircle}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Outfit Image Selection Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            这些穿搭哪个更戳你？（选 {REQUIRED_OUTFIT_SELECTIONS} 个）
          </Text>
          <View style={styles.outfitGrid}>
            {OUTFIT_OPTIONS.map((option) => {
              const isSelected = selectedOutfits.includes(option.id);
              const isDisabled =
                !isSelected && selectedOutfits.length >= REQUIRED_OUTFIT_SELECTIONS;

              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.outfitCard,
                    isSelected && styles.outfitCardSelected,
                    isDisabled && styles.outfitCardDisabled,
                  ]}
                  onPress={() => handleToggleOutfit(option.id)}
                  activeOpacity={0.7}
                  disabled={isDisabled}
                >
                  <View style={[styles.outfitGradient, { backgroundColor: option.gradient[0] }]}>
                    <View
                      style={[
                        StyleSheet.absoluteFill,
                        {
                          backgroundColor: option.gradient[1],
                          opacity: 0.4,
                        },
                      ]}
                    />
                    <Text style={styles.outfitLabel}>{option.label}</Text>
                    {isSelected && (
                      <View style={styles.outfitCheck}>
                        <Text style={styles.outfitCheckMark}>✓</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {canProceed && (
        <TouchableOpacity style={styles.nextButton} onPress={onNext} activeOpacity={0.7}>
          <Text style={styles.nextButtonText}>下一步</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const useStyles = createStyles((themeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingHorizontal: Spacing[5],
      paddingTop: Spacing[6],
      paddingBottom: Spacing[4],
    },
    title: {
      fontSize: DesignTokens.typography.sizes["2xl"],
      fontWeight: "700",
      color: colors.textPrimary,
      letterSpacing: -0.5,
      lineHeight: 34,
    },
    subtitle: {
      fontSize: DesignTokens.typography.sizes.base,
      color: colors.textSecondary,
      marginTop: Spacing[2],
      lineHeight: 22,
    },
    scrollContent: {
      paddingHorizontal: Spacing[5],
      paddingBottom: Spacing[6],
    },
    section: {
      marginBottom: Spacing[6],
    },
    sectionTitle: {
      fontSize: DesignTokens.typography.sizes.md,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: Spacing[4],
      lineHeight: 24,
    },
    styleList: {
      gap: Spacing[3],
    },
    styleCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: themeColors.neutral[50],
      borderRadius: BorderRadius.xl,
      padding: Spacing[4],
      borderWidth: 2,
      borderColor: "transparent",
    },
    styleCardSelected: {
      borderColor: DesignTokens.colors.brand.terracotta,
      backgroundColor: "rgba(198, 123, 92, 0.08)",
    },
    styleContent: {
      flex: 1,
    },
    styleLabel: {
      fontSize: DesignTokens.typography.sizes.md,
      fontWeight: "500",
      color: colors.textPrimary,
    },
    styleLabelSelected: {
      fontWeight: "600",
      color: DesignTokens.colors.brand.terracotta,
    },
    styleSubtitle: {
      fontSize: DesignTokens.typography.sizes.sm,
      color: colors.textTertiary,
      marginTop: 2,
    },
    styleSubtitleSelected: {
      color: colors.textSecondary,
    },
    checkCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: DesignTokens.colors.brand.terracotta,
      alignItems: "center",
      justifyContent: "center",
    },
    checkMark: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.surface,
    },
    outfitGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing[3],
    },
    outfitCard: {
      width: "46%",
      aspectRatio: 4 / 3,
      borderRadius: BorderRadius.lg,
      overflow: "hidden",
    },
    outfitCardSelected: {
      borderWidth: 2,
      borderColor: DesignTokens.colors.brand.terracotta,
    },
    outfitCardDisabled: {
      opacity: 0.4,
    },
    outfitGradient: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: BorderRadius.lg,
    },
    outfitLabel: {
      fontSize: DesignTokens.typography.sizes.base,
      fontWeight: "600",
      color: colors.surface,
      textShadowColor: "rgba(0,0,0,0.3)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    outfitCheck: {
      position: "absolute",
      top: Spacing[2],
      right: Spacing[2],
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: DesignTokens.colors.brand.terracotta,
      alignItems: "center",
      justifyContent: "center",
    },
    outfitCheckMark: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.surface,
    },
    nextButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: DesignTokens.colors.brand.terracotta,
      borderRadius: BorderRadius.xl,
      paddingVertical: Spacing[4],
      paddingHorizontal: Spacing[6],
      marginHorizontal: Spacing[5],
      marginBottom: Spacing[6],
      ...DesignTokens.shadows.brand,
      minHeight: 52,
    },
    nextButtonText: {
      fontSize: DesignTokens.typography.sizes.md,
      fontWeight: "600",
      color: colors.surface,
    },
  })
);

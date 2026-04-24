import React, { useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from "react-native";
import Animated, { SlideInRight } from "react-native-reanimated";
import {
  Spacing,
  BorderRadius,
  DesignTokens,
  flatColors as colors,
} from "../../../../design-system/theme";
import { useTheme, createStyles } from "../../../../shared/contexts/ThemeContext";
import { useOnboardingStore } from "../../stores/onboardingStore";
import type { OnboardingFormData, LowerBodyPref, UpperFitPref } from "../../stores/onboardingStore";

interface QuickProfileStepProps {
  formData: OnboardingFormData;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
  onNext: () => void;
}

const AGE_RANGES: OnboardingFormData["ageRange"][] = ["18-24", "25-30", "31-40", "41-50", "50+"];

const LOWER_BODY_OPTIONS: { id: LowerBodyPref; label: string }[] = [
  { id: "pants", label: "裤装为主" },
  { id: "skirts", label: "裙装为主" },
  { id: "both", label: "都可以" },
];

const UPPER_FIT_OPTIONS: { id: UpperFitPref; label: string }[] = [
  { id: "fitted", label: "修身" },
  { id: "regular", label: "合身" },
  { id: "loose", label: "宽松" },
];

export const QuickProfileStep: React.FC<QuickProfileStepProps> = ({
  formData,
  updateFormData,
  onNext,
}) => {
  const newOnboarding = useOnboardingStore((s) => s.newOnboarding);
  const setGarmentPreference = useOnboardingStore((s) => s.setGarmentPreference);
  const garmentPreference = newOnboarding.garmentPreference;
  const { colors: themeColors } = useTheme();
  const styles = useStyles(themeColors);

  const handleLowerBodyChange = useCallback(
    (value: LowerBodyPref) => {
      setGarmentPreference({ lowerBody: value });
    },
    [setGarmentPreference]
  );

  const handleUpperFitChange = useCallback(
    (value: UpperFitPref) => {
      setGarmentPreference({ upperFit: value });
    },
    [setGarmentPreference]
  );

  const canProceed =
    garmentPreference.lowerBody !== undefined && garmentPreference.upperFit !== undefined;

  return (
    <Animated.View entering={SlideInRight.duration(350)} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>快速画像</Text>
        <Text style={styles.subtitle}>让我们更好地了解你的穿搭需求</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Age Band Section */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionLabel}>年龄段</Text>
            <Text style={styles.optionalMark}>选填</Text>
          </View>
          <View style={styles.pillRow}>
            {AGE_RANGES.map((range) => {
              const isSelected = formData.ageRange === range;
              return (
                <TouchableOpacity
                  key={range}
                  style={[styles.pill, isSelected && styles.pillSelected]}
                  onPress={() => updateFormData({ ageRange: range })}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                    {range}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Height + Weight Section */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionLabel}>身高/体重</Text>
            <Text style={styles.optionalMark}>选填</Text>
          </View>
          <View style={styles.inputRow}>
            <View style={styles.inputField}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="170"
                  placeholderTextColor={colors.textTertiary}
                  value={formData.height}
                  onChangeText={(value) => updateFormData({ height: value })}
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text style={styles.inputUnit}>cm</Text>
              </View>
            </View>
            <View style={styles.inputField}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="60"
                  placeholderTextColor={colors.textTertiary}
                  value={formData.weight}
                  onChangeText={(value) => updateFormData({ weight: value })}
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text style={styles.inputUnit}>kg</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Lower Body Preference */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionLabel}>下装偏好</Text>
            <Text style={styles.requiredMark}>*</Text>
          </View>
          <View style={styles.radioRow}>
            {LOWER_BODY_OPTIONS.map((option) => {
              const isSelected = garmentPreference.lowerBody === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.radioCard, isSelected && styles.radioCardSelected]}
                  onPress={() => handleLowerBodyChange(option.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.radioLabel, isSelected && styles.radioLabelSelected]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Upper Fit Preference */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionLabel}>上身版型</Text>
            <Text style={styles.requiredMark}>*</Text>
          </View>
          <View style={styles.radioRow}>
            {UPPER_FIT_OPTIONS.map((option) => {
              const isSelected = garmentPreference.upperFit === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.radioCard, isSelected && styles.radioCardSelected]}
                  onPress={() => handleUpperFitChange(option.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.radioLabel, isSelected && styles.radioLabelSelected]}>
                    {option.label}
                  </Text>
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
      marginBottom: Spacing[5],
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: Spacing[3],
      gap: Spacing[1],
    },
    sectionLabel: {
      fontSize: DesignTokens.typography.sizes.sm,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    requiredMark: {
      fontSize: DesignTokens.typography.sizes.sm,
      color: colors.error,
    },
    optionalMark: {
      fontSize: DesignTokens.typography.sizes.sm,
      color: colors.textTertiary,
      marginLeft: Spacing[1],
    },
    pillRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing[2],
    },
    pill: {
      backgroundColor: themeColors.neutral[50],
      borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing[5],
      paddingVertical: Spacing[3],
    },
    pillSelected: {
      backgroundColor: DesignTokens.colors.brand.terracotta,
    },
    pillText: {
      fontSize: DesignTokens.typography.sizes.base,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    pillTextSelected: {
      color: colors.surface,
    },
    inputRow: {
      flexDirection: "row",
      gap: Spacing[3],
    },
    inputField: {
      flex: 1,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: themeColors.neutral[50],
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing[3],
      height: Spacing["2xl"],
      borderWidth: 1,
      borderColor: themeColors.neutral[200],
      gap: Spacing[2],
    },
    textInput: {
      flex: 1,
      fontSize: DesignTokens.typography.sizes.md,
      color: colors.textPrimary,
      padding: 0,
    },
    inputUnit: {
      fontSize: DesignTokens.typography.sizes.base,
      color: colors.textTertiary,
    },
    radioRow: {
      flexDirection: "row",
      gap: Spacing[3],
    },
    radioCard: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: themeColors.neutral[50],
      borderRadius: BorderRadius.xl,
      paddingVertical: Spacing[4],
      borderWidth: 2,
      borderColor: "transparent",
    },
    radioCardSelected: {
      borderColor: DesignTokens.colors.brand.terracotta,
      backgroundColor: "rgba(198, 123, 92, 0.08)",
    },
    radioLabel: {
      fontSize: DesignTokens.typography.sizes.base,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    radioLabelSelected: {
      fontWeight: "600",
      color: DesignTokens.colors.brand.terracotta,
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

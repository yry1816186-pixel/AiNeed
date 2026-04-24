import React, { useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CustomSlider } from "../../../shared/components/forms/CustomSlider";
import { Ionicons } from "../../../polyfills/expo-vector-icons";
import {
  Spacing,
  BorderRadius,
  Shadows,
  DesignTokens,
  flatColors as colors,
} from "../../../design-system/theme";
import {
  useOnboardingStore,
  type LowerBodyPref,
  type UpperFitPref,
} from "../stores/onboardingStore";
import type { OnboardingStackParamList } from "../navigation/OnboardingNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Step3_Preference">;

const LOWER_BODY_OPTIONS: { key: LowerBodyPref; label: string }[] = [
  { key: "pants", label: "裤装" },
  { key: "skirts", label: "裙装" },
  { key: "both", label: "都可以" },
];

const UPPER_FIT_OPTIONS: { key: UpperFitPref; label: string }[] = [
  { key: "fitted", label: "修身" },
  { key: "regular", label: "常规" },
  { key: "loose", label: "宽松" },
];

export const PreferenceStep: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { newOnboarding, setGarmentPreference, setBudgetRange } = useOnboardingStore();
  const { garmentPreference, budgetRange } = newOnboarding;

  const handleNext = useCallback(() => {
    navigation.navigate("Step4_Result");
  }, [navigation]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.stepLabel}>3/4</Text>
      </View>

      <View style={s.titleSection}>
        <Text style={s.title}>穿着偏好</Text>
        <Text style={s.subtitle}>几个简单的问题，帮伊伊更懂你</Text>
      </View>

      <ScrollView style={s.scrollView} showsVerticalScrollIndicator={false}>
        <View style={s.section}>
          <Text style={s.sectionTitle}>下装偏好</Text>
          <View style={s.optionRow}>
            {LOWER_BODY_OPTIONS.map((opt) => {
              const isActive = garmentPreference.lowerBody === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[s.optionBtn, isActive && s.optionBtnActive]}
                  onPress={() => setGarmentPreference({ lowerBody: opt.key })}
                  activeOpacity={0.7}
                >
                  <Text style={[s.optionBtnText, isActive && s.optionBtnTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>上衣版型</Text>
          <View style={s.optionRow}>
            {UPPER_FIT_OPTIONS.map((opt) => {
              const isActive = garmentPreference.upperFit === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[s.optionBtn, isActive && s.optionBtnActive]}
                  onPress={() => setGarmentPreference({ upperFit: opt.key })}
                  activeOpacity={0.7}
                >
                  <Text style={[s.optionBtnText, isActive && s.optionBtnTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>预算范围</Text>
          <View style={s.budgetDisplay}>
            <Text style={s.budgetValue}>¥{budgetRange.min}</Text>
            <Text style={s.budgetDash}>—</Text>
            <Text style={s.budgetValue}>¥{budgetRange.max}</Text>
          </View>
          <CustomSlider
            style={s.slider}
            minimumValue={200}
            maximumValue={2000}
            step={100}
            value={budgetRange.max}
            onValueChange={(val: number) => setBudgetRange({ min: budgetRange.min, max: val })}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.neutral[200]}
            thumbTintColor={colors.primary}
          />
          <View style={s.sliderLabels}>
            <Text style={s.sliderLabel}>¥200</Text>
            <Text style={s.sliderLabel}>¥2000</Text>
          </View>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={s.nextButton} onPress={handleNext} activeOpacity={0.7}>
          <Text style={s.nextButtonText}>生成推荐</Text>
          <Ionicons name="sparkles" size={18} color={colors.surface} />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[1],
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing[2],
  },
  stepLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.primary,
    fontWeight: "600",
  },
  titleSection: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[3],
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
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: Spacing[5],
    marginBottom: Spacing[6],
  },
  sectionTitle: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: Spacing[3],
  },
  optionRow: {
    flexDirection: "row",
    gap: Spacing[3],
  },
  optionBtn: {
    flex: 1,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    borderRadius: BorderRadius.lg,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionBtnText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  optionBtnTextActive: {
    color: colors.primaryDark,
    fontWeight: "600",
  },
  budgetDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  budgetValue: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "700",
    color: colors.primary,
  },
  budgetDash: {
    fontSize: DesignTokens.typography.sizes.md,
    color: colors.textTertiary,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sliderLabel: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.textTertiary,
  },
  footer: {
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
    paddingBottom: Spacing[6],
  },
  nextButton: {
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
  nextButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.surface,
  },
});

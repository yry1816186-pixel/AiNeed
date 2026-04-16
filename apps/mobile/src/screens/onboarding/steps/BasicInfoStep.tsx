import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { Ionicons } from "../../../polyfills/expo-vector-icons";
import Animated, { SlideInRight, SlideOutLeft, Layout } from "react-native-reanimated";
import { Colors, Spacing, BorderRadius } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import type { OnboardingFormData } from "../../../stores/onboardingStore";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";

interface BasicInfoStepProps {
  formData: OnboardingFormData;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
  onNext: () => void;
  onSkip?: () => void;
}

const GENDER_OPTIONS: { id: "male" | "female" | "other"; label: string; icon: string }[] = [
  { id: "male", label: "男", icon: "male-outline" },
  { id: "female", label: "女", icon: "female-outline" },
  { id: "other", label: "其他", icon: "person-outline" },
];

const AGE_RANGES: ("18-24" | "25-30" | "31-40" | "41-50" | "50+")[] = [
  "18-24",
  "25-30",
  "31-40",
  "41-50",
  "50+",
];

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  formData,
  updateFormData,
  onNext,
  onSkip,
}) => {
  const [validationAttempted, setValidationAttempted] = useState(false);

  const genderError = validationAttempted && !formData.gender;
  const ageRangeError = validationAttempted && !formData.ageRange;

  const handleUpdate = (data: Partial<OnboardingFormData>) => {
    const { colors } = useTheme();
    setValidationAttempted(true);
    updateFormData(data);
  };

  return (
    <Animated.View
      entering={SlideInRight.duration(350)}
      exiting={SlideOutLeft.duration(250)}
      layout={Layout.duration(300)}
      style={styles.stepContent}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>基本信息</Text>
        <Text style={styles.stepSubtitle}>帮助我们了解你的基本情况，提供更精准的穿搭推荐</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionLabel}>性别</Text>
            <Text style={styles.requiredMark}>*</Text>
          </View>
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((option) => {
              const isSelected = formData.gender === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.genderCard, isSelected && styles.genderCardSelected]}
                  onPress={() => handleUpdate({ gender: option.id })}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={option.icon}
                    size={24}
                    color={isSelected ? colors.surface : colors.textSecondary}
                  />
                  <Text style={[styles.genderLabel, isSelected && styles.genderLabelSelected]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {genderError && <Text style={styles.errorText}>请选择性别</Text>}
        </View>

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionLabel}>年龄段</Text>
            <Text style={styles.requiredMark}>*</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ageScrollContent}
          >
            {AGE_RANGES.map((range) => {
              const isSelected = formData.ageRange === range;
              return (
                <TouchableOpacity
                  key={range}
                  style={[styles.agePill, isSelected && styles.agePillSelected]}
                  onPress={() => handleUpdate({ ageRange: range })}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.agePillText, isSelected && styles.agePillTextSelected]}>
                    {range}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {ageRangeError && <Text style={styles.errorText}>请选择年龄段</Text>}
        </View>

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
                  onChangeText={(value) => handleUpdate({ height: value })}
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
                  placeholder="65"
                  placeholderTextColor={colors.textTertiary}
                  value={formData.weight}
                  onChangeText={(value) => handleUpdate({ weight: value })}
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text style={styles.inputUnit}>kg</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[4],
  },
  stepTitle: {
    fontSize: DesignTokens.typography.sizes['2xl'],
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  stepSubtitle: {
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
  genderRow: {
    flexDirection: "row",
    gap: Spacing[3],
  },
  genderCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing[4],
    gap: Spacing[2],
  },
  genderCardSelected: {
    backgroundColor: colors.primary,
  },
  genderLabel: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  genderLabelSelected: {
    color: colors.surface,
  },
  ageScrollContent: {
    gap: Spacing[2],
    paddingVertical: Spacing[1],
  },
  agePill: {
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
  },
  agePillSelected: {
    backgroundColor: colors.primary,
  },
  agePillText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  agePillTextSelected: {
    color: colors.surface,
  },
  errorText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.error,
    marginTop: Spacing[2],
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
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing[3],
    height: 48,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
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
});

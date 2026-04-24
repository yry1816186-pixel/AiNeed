import React, { useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from "react-native";
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
import { useOnboardingStore } from "../stores/onboardingStore";
import type { OnboardingStackParamList } from "../navigation/OnboardingNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Step2_Style">;

const STYLE_IMAGES = [
  { key: "minimal", label: "简约", uri: "https://placehold.co/200x260/E8D5C4/8B5E3C?text=简约" },
  { key: "elegant", label: "优雅", uri: "https://placehold.co/200x260/D4B896/5D3A2A?text=优雅" },
  { key: "sporty", label: "运动", uri: "https://placehold.co/200x260/B8C4AD/3E4438?text=运动" },
  { key: "edgy", label: "前卫", uri: "https://placehold.co/200x260/9B59B6/FFFFFF?text=前卫" },
  { key: "classic", label: "经典", uri: "https://placehold.co/200x260/C67B5C/FFFFFF?text=经典" },
  { key: "romantic", label: "浪漫", uri: "https://placehold.co/200x260/FDA4AF/FFFFFF?text=浪漫" },
];

export const StyleStep: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { newOnboarding, setStyles, setFormalityPreference } = useOnboardingStore();
  const selectedStyles = newOnboarding.selectedStyles;
  const formalityPreference = newOnboarding.formalityPreference;

  const toggleStyle = useCallback(
    (key: string) => {
      if (selectedStyles.includes(key)) {
        setStyles(selectedStyles.filter((s) => s !== key));
      } else if (selectedStyles.length < 2) {
        setStyles([...selectedStyles, key]);
      }
    },
    [selectedStyles, setStyles]
  );

  const handleNext = useCallback(() => {
    navigation.navigate("Step3_Preference");
  }, [navigation]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const canProceed = selectedStyles.length >= 1;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.stepLabel}>2/4</Text>
      </View>

      <View style={s.titleSection}>
        <Text style={s.title}>选2张你喜欢的</Text>
        <Text style={s.subtitle}>让我们了解你的风格偏好</Text>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.gridContainer}
        showsVerticalScrollIndicator={false}
      >
        {STYLE_IMAGES.map((style) => {
          const isSelected = selectedStyles.includes(style.key);
          return (
            <TouchableOpacity
              key={style.key}
              style={[s.imageCard, isSelected && s.imageCardSelected]}
              onPress={() => toggleStyle(style.key)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: style.uri }} style={s.image} resizeMode="cover" />
              <View style={[s.imageLabelWrap, isSelected && s.imageLabelWrapSelected]}>
                <Text style={[s.imageLabel, isSelected && s.imageLabelSelected]}>
                  {style.label}
                </Text>
              </View>
              {isSelected && (
                <View style={s.checkOverlay}>
                  <Ionicons name="checkmark-circle" size={28} color={colors.surface} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={s.sliderSection}>
        <View style={s.sliderLabels}>
          <Text style={s.sliderLabel}>正式</Text>
          <Text style={s.sliderLabel}>休闲</Text>
        </View>
        <CustomSlider
          style={s.slider}
          minimumValue={0}
          maximumValue={100}
          step={10}
          value={formalityPreference}
          onValueChange={setFormalityPreference}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.neutral[200]}
          thumbTintColor={colors.primary}
        />
      </View>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.nextButton, !canProceed && s.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!canProceed}
          activeOpacity={0.7}
        >
          <Text style={s.nextButtonText}>下一步</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.surface} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const IMAGE_CARD_W = (350 - Spacing[5] * 2 - Spacing[3] * 2) / 3;

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
  gridContainer: {
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[4],
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[3],
  },
  imageCard: {
    width: IMAGE_CARD_W,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  imageCardSelected: {
    borderColor: colors.primary,
  },
  image: {
    width: "100%",
    height: IMAGE_CARD_W * 1.3,
    backgroundColor: colors.neutral[100],
  },
  imageLabelWrap: {
    paddingVertical: Spacing[2],
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  imageLabelWrapSelected: {
    backgroundColor: colors.primaryLight,
  },
  imageLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  imageLabelSelected: {
    color: colors.primaryDark,
    fontWeight: "600",
  },
  checkOverlay: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  sliderSection: {
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing[1],
  },
  sliderLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  slider: {
    width: "100%",
    height: 40,
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
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.surface,
  },
});

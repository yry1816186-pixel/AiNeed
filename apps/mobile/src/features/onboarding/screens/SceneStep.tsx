/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
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

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Step1_Scene">;

const SCENES = [
  { key: "interview", label: "面试", icon: "briefcase-outline" as const, desc: "专业得体" },
  { key: "date", label: "约会", icon: "heart-outline" as const, desc: "浪漫迷人" },
  { key: "travel", label: "旅行", icon: "airplane-outline" as const, desc: "舒适自在" },
  { key: "commute", label: "通勤", icon: "train-outline" as const, desc: "简约利落" },
  { key: "season", label: "换季", icon: "leaf-outline" as const, desc: "应季搭配" },
  { key: "workplace", label: "职场", icon: "ribbon-outline" as const, desc: "干练自信" },
  { key: "sport", label: "运动", icon: "fitness-outline" as const, desc: "活力舒适" },
  { key: "daily", label: "日常", icon: "sunny-outline" as const, desc: "随性自然" },
];

export const SceneStep: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { newOnboarding, setScenes } = useOnboardingStore();
  const selectedScenes = newOnboarding.selectedScenes;

  const toggleScene = useCallback(
    (key: string) => {
      if (selectedScenes.includes(key)) {
        setScenes(selectedScenes.filter((s) => s !== key));
      } else if (selectedScenes.length < 2) {
        setScenes([...selectedScenes, key]);
      }
    },
    [selectedScenes, setScenes]
  );

  const handleNext = useCallback(() => {
    navigation.navigate("Step2_Style");
  }, [navigation]);

  const canProceed = selectedScenes.length >= 1;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.stepLabel}>1/4</Text>
        <Text style={s.title}>选择你的场景</Text>
        <Text style={s.subtitle}>选1-2个你最常遇到的穿搭场景</Text>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.gridContainer}
        showsVerticalScrollIndicator={false}
      >
        {SCENES.map((scene) => {
          const isSelected = selectedScenes.includes(scene.key);
          return (
            <TouchableOpacity
              key={scene.key}
              style={[s.card, isSelected && s.cardSelected]}
              onPress={() => toggleScene(scene.key)}
              activeOpacity={0.7}
            >
              <View style={[s.iconWrap, isSelected && s.iconWrapSelected]}>
                <Ionicons
                  name={scene.icon}
                  size={24}
                  color={isSelected ? colors.surface : colors.primary}
                />
              </View>
              <Text style={[s.cardLabel, isSelected && s.cardLabelSelected]}>{scene.label}</Text>
              <Text style={s.cardDesc}>{scene.desc}</Text>
              {isSelected && (
                <View style={s.checkBadge}>
                  <Ionicons name="checkmark" size={14} color={colors.surface} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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

const CARD_SIZE = (350 - Spacing[5] * 2 - Spacing[3]) / 2;

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
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
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[6],
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[3],
  },
  card: {
    width: CARD_SIZE,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[2],
  },
  iconWrapSelected: {
    backgroundColor: colors.primary,
  },
  cardLabel: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cardLabelSelected: {
    color: colors.primaryDark,
  },
  cardDesc: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.textTertiary,
  },
  checkBadge: {
    position: "absolute",
    top: Spacing[2],
    right: Spacing[2],
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
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

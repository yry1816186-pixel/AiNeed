import React, { useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import type { Icon as PhosphorIcon } from "phosphor-react-native";
import {
  Briefcase,
  Train,
  Heart,
  Airplane,
  Wine,
  Coffee,
  Barbell,
  BookOpen,
} from "phosphor-react-native";
import Animated, { SlideInRight } from "react-native-reanimated";
import {
  Spacing,
  BorderRadius,
  DesignTokens,
  flatColors as colors,
} from "../../../../design-system/theme";
import { useTheme, createStyles } from "../../../../shared/contexts/ThemeContext";
import { useOnboardingStore } from "../../stores/onboardingStore";

interface SceneSelectionStepProps {
  onNext: () => void;
}

interface SceneOption {
  id: string;
  label: string;
  Icon: PhosphorIcon;
}

const SCENES: SceneOption[] = [
  { id: "interview", label: "面试", Icon: Briefcase },
  { id: "commute", label: "通勤", Icon: Train },
  { id: "date", label: "约会", Icon: Heart },
  { id: "travel", label: "出游", Icon: Airplane },
  { id: "party", label: "聚会", Icon: Wine },
  { id: "daily", label: "日常", Icon: Coffee },
  { id: "sports", label: "运动", Icon: Barbell },
  { id: "campus", label: "校园", Icon: BookOpen },
];

const MAX_SELECTION = 3;
const MIN_SELECTION = 1;

export const SceneSelectionStep: React.FC<SceneSelectionStepProps> = ({ onNext }) => {
  const selectedScenes = useOnboardingStore((s) => s.newOnboarding.selectedScenes);
  const setScenes = useOnboardingStore((s) => s.setScenes);
  const { colors: themeColors } = useTheme();
  const styles = useStyles(themeColors);

  const handleToggleScene = useCallback(
    (sceneId: string) => {
      const isSelected = selectedScenes.includes(sceneId);
      let newScenes: string[];

      if (isSelected) {
        newScenes = selectedScenes.filter((id: string) => id !== sceneId);
      } else if (selectedScenes.length < MAX_SELECTION) {
        newScenes = [...selectedScenes, sceneId];
      } else {
        return;
      }

      setScenes(newScenes);
    },
    [selectedScenes, setScenes]
  );

  const canProceed = selectedScenes.length >= MIN_SELECTION;

  return (
    <Animated.View entering={SlideInRight.duration(350)} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>你的场景</Text>
        <Text style={styles.subtitle}>
          选择你最常需要的穿搭场景（{selectedScenes.length}/{MAX_SELECTION}）
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.grid}>
          {SCENES.map((scene) => {
            const isSelected = selectedScenes.includes(scene.id);
            const isDisabled = !isSelected && selectedScenes.length >= MAX_SELECTION;

            return (
              <TouchableOpacity
                key={scene.id}
                style={[
                  styles.card,
                  isSelected && styles.cardSelected,
                  isDisabled && styles.cardDisabled,
                ]}
                onPress={() => handleToggleScene(scene.id)}
                activeOpacity={0.7}
                disabled={isDisabled}
              >
                <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
                  <scene.Icon
                    size={24}
                    color={isSelected ? colors.surface : colors.textSecondary}
                    weight="regular"
                  />
                </View>
                <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                  {scene.label}
                </Text>
              </TouchableOpacity>
            );
          })}
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
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing[3],
    },
    card: {
      width: "46%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: themeColors.neutral[50],
      borderRadius: BorderRadius.xl,
      paddingVertical: Spacing[5],
      paddingHorizontal: Spacing[3],
      borderWidth: 2,
      borderColor: "transparent",
      ...DesignTokens.shadows.sm,
    },
    cardSelected: {
      borderColor: DesignTokens.colors.brand.terracotta,
      backgroundColor: DesignTokens.colors.backgrounds.tertiary,
    },
    cardDisabled: {
      opacity: 0.4,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: themeColors.neutral[100],
      alignItems: "center",
      justifyContent: "center",
      marginBottom: Spacing[2],
    },
    iconContainerSelected: {
      backgroundColor: DesignTokens.colors.brand.terracotta,
    },
    cardLabel: {
      fontSize: DesignTokens.typography.sizes.md,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    cardLabelSelected: {
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

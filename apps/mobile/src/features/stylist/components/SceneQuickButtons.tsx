import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { Spacing } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';


interface SceneQuickButtonsProps {
  onSceneSelect: (scene: string, message: string) => void;
  disabled?: boolean;
}

const SCENES = [
  {
    id: "commute",
    label: "Commute",
    icon: "briefcase-outline",
    message: "Help me put together a commute outfit",
  },
  { id: "date", label: "Date", icon: "heart-outline", message: "What should I wear on a date" },
  { id: "sport", label: "Sport", icon: "fitness-outline", message: "Sport outfit recommendation" },
  {
    id: "interview",
    label: "Interview",
    icon: "ribbon-outline",
    message: "I need an interview outfit",
  },
  { id: "casual", label: "Casual", icon: "sunny-outline", message: "Casual outfit for today" },
  {
    id: "travel",
    label: "Travel",
    icon: "airplane-outline",
    message: "Travel outfit recommendation",
  },
];

const SCENE_ICONS: Record<string, string> = {
  "briefcase-outline": "B",
  "heart-outline": "H",
  "fitness-outline": "S",
  "ribbon-outline": "I",
  "sunny-outline": "C",
  "airplane-outline": "T",
};

export const SceneQuickButtons: React.FC<SceneQuickButtonsProps> = ({
  onSceneSelect,
  disabled = false,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, disabled && styles.containerDisabled]}
    >
      {SCENES.map((scene) => (
        <Pressable
          key={scene.id}
          style={styles.button}
          onPress={() => onSceneSelect(scene.id, scene.message)}
          disabled={disabled}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>{SCENE_ICONS[scene.icon] ?? "?"}</Text>
          </View>
          <Text style={styles.label}>{scene.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
};

const useStyles = createStyles((colors) => ({
  container: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs, gap: Spacing.sm},
  containerDisabled: { opacity: 0.5 },
  button: {
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['2.5'],
    borderRadius: 24,
    backgroundColor: DesignTokens.colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.primary,
    marginRight: Spacing.sm,
    minWidth: 72,
  },
  iconContainer: {
    width: DesignTokens.spacing[7],
    height: DesignTokens.spacing[7],
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  iconText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  label: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.neutral[700],
    fontWeight: "500",
  },
}))

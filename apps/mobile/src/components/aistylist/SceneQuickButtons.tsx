import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { DesignTokens } from "../../theme/tokens/design-tokens";

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

const styles = StyleSheet.create({
  container: { paddingVertical: 8, paddingHorizontal: 4, gap: 8 },
  containerDisabled: { opacity: 0.5 },
  button: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: DesignTokens.colors.neutral[50],
    borderWidth: 1,
    borderColor: DesignTokens.colors.brand.terracotta,
    marginRight: 8,
    minWidth: 72,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DesignTokens.colors.brand.terracottaLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  iconText: {
    fontSize: 14,
    fontWeight: "700",
    color: DesignTokens.colors.brand.terracottaDark,
  },
  label: {
    fontSize: 12,
    color: DesignTokens.colors.neutral[700],
    fontWeight: "500",
  },
});

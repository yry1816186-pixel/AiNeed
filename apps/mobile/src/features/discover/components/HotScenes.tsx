import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

const SCENES = [
  { id: "1", name: "面试", icon: "💼" },
  { id: "2", name: "约会", icon: "💕" },
  { id: "3", name: "旅行", icon: "✈️" },
  { id: "4", name: "换季", icon: "🍂" },
  { id: "5", name: "运动", icon: "🏃" },
  { id: "6", name: "聚会", icon: "🎉" },
];

export function HotScenes() {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>热门场景</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scenesRow}
      >
        {SCENES.map((scene) => (
          <TouchableOpacity key={scene.id} style={styles.sceneChip}>
            <Text style={styles.sceneIcon}>{scene.icon}</Text>
            <Text style={styles.sceneName}>{scene.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = createStyles((colors) => ({
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  scenesRow: {
    paddingHorizontal: 12,
  },
  sceneChip: {
    width: 72,
    marginHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  sceneIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  sceneName: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },
}));

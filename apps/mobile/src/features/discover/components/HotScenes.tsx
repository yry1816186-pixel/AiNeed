import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

const SCENE_ICONS: Record<string, string> = {
  面试: "💼",
  约会: "💕",
  旅行: "✈️",
  换季: "🍂",
  运动: "🏃",
  聚会: "🎉",
  通勤: "🏢",
  街头: "🎨",
  度假: "🏖️",
  派对: "🥂",
};

interface HotScenesProps {
  scenes?: string[];
}

export function HotScenes({ scenes }: HotScenesProps) {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const displayScenes = scenes && scenes.length > 0 ? scenes : ["通勤", "约会", "运动"];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>热门场景</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scenesRow}
      >
        {displayScenes.map((sceneName, index) => (
          <TouchableOpacity key={sceneName} style={styles.sceneChip}>
            <Text style={styles.sceneIcon}>{SCENE_ICONS[sceneName] || "👗"}</Text>
            <Text style={styles.sceneName}>{sceneName}</Text>
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

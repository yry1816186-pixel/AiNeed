/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { SpringConfigs } from "../../../design-system/theme/tokens/animations";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from "react-native-reanimated";

interface ScenePillsProps {
  scenes: string[];
  selectedScene: string | null;
  onSelect: (scene: string) => void;
}

function ScenePill({
  scene,
  isSelected,
  onSelect,
}: {
  scene: string;
  isSelected: boolean;
  onSelect: (scene: string) => void;
}) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const handlePress = useCallback(() => {
    scale.value = withSequence(
      withSpring(1.1, SpringConfigs.bouncy),
      withSpring(1, SpringConfigs.bouncy)
    );
    onSelect(scene);
  }, [onSelect, scene, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (isSelected) {
    return (
      <Animated.View style={animatedStyle}>
        <Pressable onPress={handlePress} style={staticStyles.pillOuter}>
          <LinearGradient
            colors={DesignTokens.gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={staticStyles.pillGradient}
          >
            <Text style={staticStyles.pillTextSelected}>{scene}</Text>
          </LinearGradient>
          <View style={staticStyles.activeDot} />
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        style={[staticStyles.pillOuter, { backgroundColor: DesignTokens.colors.neutral[100] }]}
      >
        <Text
          style={[staticStyles.pillTextUnselected, { color: DesignTokens.colors.neutral[600] }]}
        >
          {scene}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function ScenePills({ scenes, selectedScene, onSelect }: ScenePillsProps) {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {scenes.map((scene) => (
          <ScenePill
            key={scene}
            scene={scene}
            isSelected={selectedScene === scene}
            onSelect={onSelect}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  pillOuter: {
    borderRadius: DesignTokens.borderRadius.full,
    paddingHorizontal: DesignTokens.spacing[4],
    paddingVertical: DesignTokens.spacing[2],
    marginRight: DesignTokens.spacing[2],
    alignItems: "center",
    position: "relative",
  },
  pillGradient: {
    borderRadius: DesignTokens.borderRadius.full,
    paddingHorizontal: DesignTokens.spacing[4],
    paddingVertical: DesignTokens.spacing[2],
  },
  pillTextSelected: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: DesignTokens.typography.fontWeights.semibold,
    color: DesignTokens.colors.text.inverse,
  },
  pillTextUnselected: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: DesignTokens.typography.fontWeights.medium,
  },
  activeDot: {
    position: "absolute",
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: DesignTokens.colors.brand.terracotta,
  },
});

const useStyles = createStyles((colors) => ({
  container: {
    paddingVertical: DesignTokens.spacing[2],
  },
  scrollContent: {
    paddingHorizontal: DesignTokens.spacing[4],
  },
}));

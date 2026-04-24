/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import LinearGradient from "@/src/polyfills/expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { Sun } from "phosphor-react-native";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

interface SceneData {
  title: string;
  description: string;
}

interface WeatherSceneCardProps {
  weather: WeatherData;
  scene: SceneData;
  onPress?: () => void;
}

const GRADIENT_COLORS = ["#C67B5C", "#D9A441"];
const BREATHING_DURATION = 2500;
const BREATHING_SCALE_MAX = 1.02;
const SHADOW_OPACITY_MIN = 0.1;
const SHADOW_OPACITY_MAX = 0.25;

export function WeatherSceneCard({ weather, scene, onPress }: WeatherSceneCardProps) {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(SHADOW_OPACITY_MIN);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(BREATHING_SCALE_MAX, { duration: BREATHING_DURATION }),
        withTiming(1, { duration: BREATHING_DURATION })
      ),
      -1,
      true
    );
    shadowOpacity.value = withRepeat(
      withSequence(
        withTiming(SHADOW_OPACITY_MAX, { duration: BREATHING_DURATION }),
        withTiming(SHADOW_OPACITY_MIN, { duration: BREATHING_DURATION })
      ),
      -1,
      true
    );
  }, [scale, shadowOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: shadowOpacity.value,
  }));

  const handlePress = useCallback(() => {
    onPress?.();
  }, [onPress]);

  return (
    <Pressable onPress={handlePress} accessibilityRole="button" accessibilityLabel={scene.title}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <LinearGradient
          colors={GRADIENT_COLORS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <View style={styles.weatherRow}>
            <Sun size={24} color="#FFFFFF" weight="fill" />
            <Text style={styles.weatherText}>
              {weather.temp}°C {weather.condition}
            </Text>
          </View>
          <Text style={styles.sceneTitle}>{scene.title}</Text>
          <Text style={styles.sceneDescription}>{scene.description}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const useStyles = createStyles(() => ({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: GRADIENT_COLORS[0],
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  content: {
    paddingHorizontal: DesignTokens.spacing[5],
    paddingVertical: DesignTokens.spacing[4],
  },
  weatherRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: DesignTokens.spacing[3],
  },
  weatherText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: DesignTokens.typography.fontWeights.semibold,
    color: "#FFFFFF",
    marginLeft: DesignTokens.spacing[2],
  },
  sceneTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: DesignTokens.typography.fontWeights.bold,
    color: "#FFFFFF",
    marginBottom: DesignTokens.spacing[1],
    lineHeight: DesignTokens.typography.sizes.lg * DesignTokens.typography.lineHeights.snug,
  },
  sceneDescription: {
    fontSize: DesignTokens.typography.sizes.base,
    color: "#FFFFFF",
    opacity: 0.85,
    lineHeight: DesignTokens.typography.sizes.base * DesignTokens.typography.lineHeights.normal,
  },
}));

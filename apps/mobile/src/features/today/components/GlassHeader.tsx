import React, { useEffect } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import LinearGradient from "@/src/polyfills/expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  type SharedValue,
} from "react-native-reanimated";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

interface GlassHeaderProps {
  title: string;
  subtitle?: string;
  scrollProgress?: SharedValue<number>;
}

const BLUR_INTENSITY_IOS = 60;
const BLUR_INTENSITY_ANDROID = 40;
const BREATHING_DURATION = 3000;
const BREATHING_SCALE_MAX = 1.02;

export function GlassHeader({ title, subtitle, scrollProgress }: GlassHeaderProps) {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(BREATHING_SCALE_MAX, { duration: BREATHING_DURATION }),
        withTiming(1, { duration: BREATHING_DURATION })
      ),
      -1,
      true
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scrollProgress ? interpolate(scrollProgress.value, [0, 100], [1, 0.8], "clamp") : 1,
  }));

  const blurIntensity = Platform.select({
    ios: BLUR_INTENSITY_IOS,
    android: BLUR_INTENSITY_ANDROID,
    default: BLUR_INTENSITY_IOS,
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <LinearGradient
        colors={[DesignTokens.gradients.brand[0], DesignTokens.gradients.brand[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      >
        <BlurView intensity={blurIntensity} tint="light" style={StyleSheet.absoluteFill}>
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </BlurView>
      </LinearGradient>
    </Animated.View>
  );
}

const useStyles = createStyles(() => ({
  container: {
    borderRadius: DesignTokens.borderRadius["3xl"],
    overflow: "hidden",
  },
  content: {
    paddingHorizontal: DesignTokens.spacing[5],
    paddingVertical: DesignTokens.spacing[4],
  },
  title: {
    fontSize: DesignTokens.typography.sizes["2xl"],
    fontWeight: DesignTokens.typography.fontWeights.bold,
    color: DesignTokens.colors.text.inverse,
    lineHeight: DesignTokens.typography.sizes["2xl"] * DesignTokens.typography.lineHeights.tight,
  },
  subtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.text.inverse,
    opacity: 0.8,
    marginTop: DesignTokens.spacing[1],
    lineHeight: DesignTokens.typography.sizes.base * DesignTokens.typography.lineHeights.normal,
  },
}));

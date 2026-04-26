/* eslint-disable react-hooks/rules-of-hooks */
import React, { useEffect } from "react";
import { View, Text, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useTheme, createStyles } from "../../contexts/ThemeContext";
import { BorderRadius } from "../../../design-system/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PHASE_2_START = 300;
const PHASE_3_START = 600;
const PHASE_4_BASE = 800;
const PHASE_4_DOT_DELAY = 120;
const PHASE_5_START = 2000;

export interface AnimatedSplashProps {
  onComplete?: () => void;
}

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({ onComplete }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const DOT_COLORS = [colors.primary, colors.gold, colors.warmSecondary, colors.warmPrimary.main];

  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);

  const brandOpacity = useSharedValue(0);
  const brandTranslateY = useSharedValue(20);

  const taglineOpacity = useSharedValue(0);

  const dotScales = DOT_COLORS.map(() => useSharedValue(0));
  const dotOpacities = DOT_COLORS.map(() => useSharedValue(0));

  const exitOpacity = useSharedValue(1);

  const glowScale = useSharedValue(0.8);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    logoScale.value = withSpring(1, {
      damping: 12,
      stiffness: 120,
      mass: 1,
    });
    logoOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.ease),
    });

    glowScale.value = withDelay(100, withSpring(1, { damping: 15, stiffness: 80 }));
    glowOpacity.value = withDelay(100, withTiming(0.6, { duration: 800 }));

    brandOpacity.value = withDelay(
      PHASE_2_START,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) })
    );
    brandTranslateY.value = withDelay(
      PHASE_2_START,
      withSpring(0, { damping: 15, stiffness: 120 })
    );

    taglineOpacity.value = withDelay(
      PHASE_3_START,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) })
    );

    for (let index = 0; index < DOT_COLORS.length; index++) {
      const delay = PHASE_4_BASE + index * PHASE_4_DOT_DELAY;
      dotScales[index].value = withDelay(delay, withSpring(1, { damping: 10, stiffness: 150 }));
      dotOpacities[index].value = withDelay(
        delay,
        withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) })
      );
    }

    exitOpacity.value = withDelay(
      PHASE_5_START,
      withTiming(0, {
        duration: 600,
        easing: Easing.inOut(Easing.ease),
      })
    );

    const totalDuration = PHASE_5_START + 600 + 100;
    const timer = setTimeout(() => {
      onComplete?.();
    }, totalDuration);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const brandStyle = useAnimatedStyle(() => ({
    opacity: brandOpacity.value,
    transform: [{ translateY: brandTranslateY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const exitStyle = useAnimatedStyle(() => ({
    opacity: exitOpacity.value,
  }));

  const dotStyles = DOT_COLORS.map((_, index) =>
    useAnimatedStyle(() => ({
      transform: [{ scale: dotScales[index].value }],
      opacity: dotOpacities[index].value,
    }))
  );

  return (
    <Animated.View style={[styles.container, exitStyle]}>
      <Animated.View style={[styles.glow, glowStyle]} />

      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>寻</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.brandContainer, brandStyle]}>
        <Text style={styles.brandName}>寻裳</Text>
      </Animated.View>

      <Animated.View style={[styles.taglineContainer, taglineStyle]}>
        <Text style={styles.tagline}>发现你的风格灵感</Text>
      </Animated.View>

      <View style={styles.dotsContainer}>
        {DOT_COLORS.map((color, index) => (
          <Animated.View
            key={index}
            style={[styles.dot, { backgroundColor: color }, dotStyles[index]]}
          />
        ))}
      </View>
    </Animated.View>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    borderRadius: SCREEN_WIDTH * 0.3,
    backgroundColor: colors.primaryLight,
    opacity: 0,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 60,
    elevation: 24,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius["4xl"],
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 40,
    fontWeight: "700",
    color: colors.surface,
    includeFontPadding: false,
  },
  brandContainer: {
    marginBottom: 12,
  },
  brandName: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 8,
    includeFontPadding: false,
  },
  taglineContainer: {
    marginBottom: 32,
  },
  tagline: {
    fontSize: 16,
    fontWeight: "400",
    color: colors.textPrimary,
    opacity: 0.7,
    letterSpacing: 2,
    includeFontPadding: false,
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.xs,
  },
}));

export default AnimatedSplash;

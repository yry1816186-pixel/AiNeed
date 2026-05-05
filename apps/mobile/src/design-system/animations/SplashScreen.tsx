import React, { useEffect, useCallback, useState } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Colors, DesignTokens, Spacing, BorderRadius } from "../../design-system/theme";
import { useTheme, createStyles } from "../../shared/contexts/ThemeContext";
import { SpringConfigs, Duration } from "../../design-system/theme/tokens/animations";
import { useReducedMotion } from "../../shared/hooks/useReducedMotion";
import { useFeatureFlags } from "../../shared/contexts/FeatureFlagContext";
import { FeatureFlagKeys } from "../../constants/feature-flags";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface SplashScreenProps {
  onFinish: () => void;
}

function LogoPlaceholder() {
  const { colors } = useTheme();
  return (
    <View style={localStyles.logoContainer}>
      <LinearGradient
        colors={[colors.primary[500], DesignTokens.colors.brand.camel]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={localStyles.logoGradient}
      >
        <Text style={localStyles.logoText}>XunO</Text>
      </LinearGradient>
    </View>
  );
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const { reducedMotion } = useReducedMotion();
  const featureFlags = useFeatureFlags();
  const [timedOut, setTimedOut] = useState(false);

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const textOpacity = useSharedValue(0);
  const progressWidth = useSharedValue(0);

  const splashEnabled = featureFlags.isEnabled(FeatureFlagKeys.ENABLE_SPLASH_ANIMATION);

  const finishWithCallback = useCallback(() => {
    logoOpacity.value = withTiming(0, { duration: Duration.fast }, (finished) => {
      if (finished) {
        runOnJS(onFinish)();
      }
    });
  }, [onFinish]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setTimedOut(true);
      finishWithCallback();
    }, 3000);

    return () => clearTimeout(timeout);
  }, [finishWithCallback]);

  useEffect(() => {
    if (!splashEnabled || reducedMotion) {
      setTimeout(onFinish, 100);
      return;
    }

    logoOpacity.value = withTiming(1, { duration: 600 });
    logoScale.value = withSpring(1, SpringConfigs.gentle);
    textOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    progressWidth.value = withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) });

    const timer = setTimeout(() => {
      finishWithCallback();
    }, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [splashEnabled, reducedMotion]);

  if (!splashEnabled || reducedMotion || timedOut) {
    return (
      <View style={styles.splashContainer}>
        <LinearGradient
          colors={[
            DesignTokens.colors.brand.slateDark,
            DesignTokens.colors.brand.slateDark,
            DesignTokens.colors.neutral[800],
          ]}
          style={styles.splashGradient}
        >
          <LogoPlaceholder />
          <Text style={styles.splashSubtitle}>智能穿搭助手</Text>
        </LinearGradient>
      </View>
    );
  }

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  return (
    <View style={styles.splashContainer}>
      <LinearGradient
        colors={[
          DesignTokens.colors.brand.slateDark,
          DesignTokens.colors.brand.slateDark,
          DesignTokens.colors.neutral[800],
        ]}
        style={styles.splashGradient}
      >
        <Animated.View style={[localStyles.logoWrapper, logoAnimatedStyle]}>
          <LogoPlaceholder />
        </Animated.View>

        <Animated.View style={[localStyles.textWrapper, textAnimatedStyle]}>
          <Text style={styles.splashTitle}>寻裳</Text>
          <Text style={styles.splashSubtitle}>智能穿搭助手</Text>
        </Animated.View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
          </View>
          <Text style={styles.progressText}>正在加载...</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const localStyles = StyleSheet.create({
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoGradient: {
    width: 120,
    height: 120,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 28,
    fontWeight: "900",
    color: Colors.white,
    letterSpacing: -1,
  },
  logoWrapper: {
    marginBottom: Spacing[8],
  },
  textWrapper: {
    alignItems: "center",
  },
});

const useStyles = createStyles(() => ({
  splashContainer: {
    flex: 1,
  },
  splashGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  splashTitle: {
    fontSize: DesignTokens.typography.sizes["5xl"],
    fontWeight: "900",
    color: Colors.white,
    letterSpacing: -2,
  },
  splashSubtitle: {
    fontSize: DesignTokens.typography.sizes.md,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: Spacing[2],
  },
  progressContainer: {
    position: "absolute",
    bottom: 80,
    width: SCREEN_WIDTH - 80,
    alignItems: "center",
  },
  progressBackground: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.full,
  },
  progressText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: Spacing[3],
  },
}));

export default SplashScreen;

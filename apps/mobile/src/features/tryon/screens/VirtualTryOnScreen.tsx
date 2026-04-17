import React, { useEffect } from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { flatColors as colors } from '../../../design-system/theme';
import { withErrorBoundary } from '../../../shared/components/ErrorBoundary';
import { logger } from '../../../shared/utils/logger';
import { useScreenTracking } from '../../../hooks/useAnalytics';
import { useFeatureFlags } from '../../../shared/contexts/FeatureFlagContext';
import { FeatureFlagKeys } from '../../../constants/feature-flags';
import { useTranslation } from '../../../i18n';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

const useStyles = createStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
}));

// Wrapper that provides navigation-based back action
// instead of expo-router's router.back()
const VirtualTryOnScreenComponent: React.FC = () => {
  useScreenTracking("VirtualTryOn");
  const { isEnabled } = useFeatureFlags();
  const isV2TryOn = isEnabled(FeatureFlagKeys.VIRTUAL_TRY_ON_V2);
  useTranslation();
  const { colors: themeColors } = useTheme();
  const styles = useStyles(themeColors);

  // Fade-in entrance animation
  const { reducedMotion } = useReducedMotion();
  const fadeOpacity = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (!reducedMotion) {
      fadeOpacity.value = withTiming(1, { duration: 400 });
    }
  }, [reducedMotion]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
  }));

  return (
    <GestureHandlerRootView style={styles.container}>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
        <TryOnScreenWrapper isV2TryOn={isV2TryOn} />
      </Animated.View>
    </GestureHandlerRootView>
  );
};

// Inner wrapper that patches the expo-router dependency
const TryOnScreenWrapper: React.FC<{ isV2TryOn: boolean }> = ({ isV2TryOn }) => {
  const { colors: themeColors } = useTheme();

  const LazyTryOn = React.useMemo(
    () =>
      React.lazy(() =>
        import("../components/screens/TryOnScreen").then((mod) => ({
          default: mod.TryOnScreen,
        }))
      ),
    []
  );

  return (
    <React.Suspense
      fallback={
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      }
    >
      <LazyTryOn isV2={isV2TryOn} as any />
    </React.Suspense>
  );
};

const VirtualTryOnScreen = withErrorBoundary(VirtualTryOnScreenComponent, {
  screenName: "VirtualTryOnScreen",
  maxRetries: 2,
  onError: (error, errorInfo, structuredError) => {
    logger.error("[VirtualTryOnScreen] Error:", structuredError);
  },
  onReset: () => {
    logger.log("[VirtualTryOnScreen] Error boundary reset");
  },
});

export { VirtualTryOnScreen };
export default VirtualTryOnScreen;

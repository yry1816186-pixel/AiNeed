import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, ActivityIndicator } from "react-native";

import { useTheme, createStyles } from '../shared/contexts/ThemeContext';
import { DesignTokens } from "../theme/tokens/design-tokens";
import { StyleSheet } from "react-native";
import { withErrorBoundary } from "../shared/components/ErrorBoundary";
import { logger } from "../utils/logger";
import { useScreenTracking } from "../hooks/useAnalytics";
import { useFeatureFlags } from "../contexts/FeatureFlagContext";
import { FeatureFlagKeys } from "../constants/feature-flags";
import { useTranslation } from "../i18n";

// Wrapper that provides navigation-based back action
// instead of expo-router's router.back()
const VirtualTryOnScreenComponent: React.FC = () => {
  useScreenTracking("VirtualTryOn");
  const { isEnabled } = useFeatureFlags();
  const isV2TryOn = isEnabled(FeatureFlagKeys.VIRTUAL_TRY_ON_V2);
  useTranslation();
  return (
    <GestureHandlerRootView style={styles.container}>
      <TryOnScreenWrapper isV2TryOn={isV2TryOn} />
    </GestureHandlerRootView>
  );
};

// Inner wrapper that patches the expo-router dependency
const TryOnScreenWrapper: React.FC<{ isV2TryOn: boolean }> = ({ isV2TryOn }) => {
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
    <React.Suspense fallback={<View style={{flex:1,justifyContent:'center',alignItems:'center'}}><ActivityIndicator size="large" color={theme?.colors?.primary || 'DesignTokens.colors.brand.terracotta'} /></View>}>
      <LazyTryOn isV2={isV2TryOn} />
    </React.Suspense>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});

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

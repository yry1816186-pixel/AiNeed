import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';
import { StyleSheet } from 'react-native';
import { withErrorBoundary } from '../components/ErrorBoundary';

// Wrapper that provides navigation-based back action
// instead of expo-router's router.back()
const VirtualTryOnScreenComponent: React.FC = () => {
  return (
    <GestureHandlerRootView style={styles.container}>
      <TryOnScreenWrapper />
    </GestureHandlerRootView>
  );
};

// Inner wrapper that patches the expo-router dependency
const TryOnScreenWrapper: React.FC = () => {
  // TryOnScreen uses expo-router internally but our polyfill handles it
  // We load it lazily to isolate any module resolution issues
  const LazyTryOn = React.useMemo(
    () =>
      React.lazy(() =>
        import('../components/screens/TryOnScreen').then((mod) => ({
          default: mod.TryOnScreen,
        }))
      ),
    []
  );

  return (
    <React.Suspense fallback={null}>
      <LazyTryOn />
    </React.Suspense>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
});

const VirtualTryOnScreen = withErrorBoundary(VirtualTryOnScreenComponent, {
  screenName: 'VirtualTryOnScreen',
  maxRetries: 2,
  onError: (error, errorInfo, structuredError) => {
    console.error('[VirtualTryOnScreen] Error:', structuredError);
  },
  onReset: () => {
    console.log('[VirtualTryOnScreen] Error boundary reset');
  },
});

export { VirtualTryOnScreen };
export default VirtualTryOnScreen;

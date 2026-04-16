import React, { memo, useState, useCallback } from "react";
import {
  View,
  Image,
  StyleSheet,
  ActivityIndicator,
  type ImageStyle,
  type ImageResizeMode,
  type AccessibilityProps,
} from "react-native";

import { getOptimizedImageUrl, getPlaceholder } from "../../utils/imageOptimizer";
import { DesignTokens } from "../../../design-system/theme";

export interface OptimizedImageProps extends AccessibilityProps {
  /** Source URI of the image */
  source: string;
  /** Container style (width and height should be specified) */
  style?: ImageStyle;
  /** Explicit width for URL optimization */
  width?: number;
  /** Explicit height for URL optimization */
  height?: number;
  /** Image resize mode */
  resizeMode?: ImageResizeMode;
  /** Show a tiny placeholder while loading (progressive loading) */
  placeholder?: boolean;
}

/**
 * OptimizedImage component with progressive loading support.
 *
 * - Uses getOptimizedImageUrl for proper sizing
 * - Progressive loading: tiny placeholder -> full image
 * - Memoized with React.memo for render performance
 * - Shows ActivityIndicator while loading
 */
export const OptimizedImage = memo(function OptimizedImage({
  source,
  style,
  width,
  height,
  resizeMode = "cover",
  placeholder = true,
  accessibilityLabel,
  ...accessibilityRest
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const optimizedUri = getOptimizedImageUrl(source, { width, height });
  const placeholderUri = placeholder ? getPlaceholder(source) : null;

  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setError(true);
    setLoaded(true);
  }, []);

  // Fallback on error
  if (error) {
    return (
      <View
        style={[styles.container, style]}
        accessibilityLabel={accessibilityLabel}
        {...accessibilityRest}
      >
        <View style={styles.errorContainer}>
          <ActivityIndicator size="small" color={DesignTokens.colors.text.tertiary} />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, style]}
      accessibilityLabel={accessibilityLabel}
      {...accessibilityRest}
    >
      {/* Placeholder layer - shown underneath until main image loads */}
      {placeholderUri && !loaded && (
        <Image
          source={{ uri: placeholderUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          blurRadius={10}
        />
      )}

      {/* Main optimized image */}
      <Image
        source={{ uri: optimizedUri }}
        style={[StyleSheet.absoluteFill, { opacity: loaded ? 1 : 0 }]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
      />

      {/* Loading indicator while main image is fetching */}
      {!loaded && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={DesignTokens.colors.text.secondary} />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: DesignTokens.colors.backgrounds.tertiary,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
});

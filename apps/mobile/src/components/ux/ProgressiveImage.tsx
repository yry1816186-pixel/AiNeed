import React, { useCallback, useRef, memo } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  ImageStyle,
  StyleProp,
  ViewStyle,
  ImageResizeMode,
} from 'react-native';
import { Colors, BorderRadius } from '../../theme';

interface ProgressiveImageProps {
  thumbnailSource?: { uri: string };
  source: { uri: string } | number;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  borderRadius?: number;
  resizeMode?: ImageResizeMode;
  fadeDuration?: number;
  blurRadius?: number;
  accessibilityLabel?: string;
  testID?: string;
}

export const ProgressiveImage = memo(function ProgressiveImage({
  thumbnailSource,
  source,
  style,
  containerStyle,
  borderRadius,
  resizeMode = 'cover',
  fadeDuration = 500,
  blurRadius = 10,
  accessibilityLabel,
  testID,
}: ProgressiveImageProps) {
  const thumbnailOpacity = useRef(new Animated.Value(1)).current;
  const fullImageOpacity = useRef(new Animated.Value(0)).current;

  const onLoadFull = useCallback(() => {
    Animated.parallel([
      Animated.timing(fullImageOpacity, {
        toValue: 1,
        duration: fadeDuration,
        useNativeDriver: true,
      }),
      Animated.timing(thumbnailOpacity, {
        toValue: 0,
        duration: fadeDuration,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeDuration, fullImageOpacity, thumbnailOpacity]);

  const resolvedBorderRadius = borderRadius ?? BorderRadius.lg;

  return (
    <View
      style={[styles.container, containerStyle, { borderRadius: resolvedBorderRadius }]}
      accessibilityLabel={accessibilityLabel || '图片'}
      accessibilityRole="image"
      testID={testID}
    >
      {thumbnailSource && thumbnailSource.uri ? (
        <Animated.Image
          source={thumbnailSource}
          resizeMode={resizeMode}
          blurRadius={blurRadius}
          style={[StyleSheet.absoluteFill, style, { opacity: thumbnailOpacity, borderRadius: resolvedBorderRadius }]}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder, { borderRadius: resolvedBorderRadius }]} />
      )}
      <Animated.Image
        source={source}
        resizeMode={resizeMode}
        onLoad={onLoadFull}
        style={[StyleSheet.absoluteFill, style, { opacity: fullImageOpacity, borderRadius: resolvedBorderRadius }]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: Colors.neutral[100],
  },
  placeholder: {
    backgroundColor: Colors.neutral[200],
  },
});

export default ProgressiveImage;

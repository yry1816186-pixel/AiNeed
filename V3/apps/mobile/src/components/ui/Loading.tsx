import React from 'react';
import {
  View,
  ActivityIndicator,
  Animated,
  type StyleProp,
  type ViewStyle,
  type DimensionValue,
  StyleSheet,
  Easing,
} from 'react-native';
import { colors, spacing, radius } from '../../theme';
import { Text } from './Text';

type LoadingVariant = 'fullscreen' | 'inline' | 'skeleton';

interface LoadingProps {
  variant?: LoadingVariant;
  message?: string;
  style?: StyleProp<ViewStyle>;
}

export const Loading: React.FC<LoadingProps> = ({
  variant = 'inline',
  message,
  style,
}) => {
  if (variant === 'fullscreen') {
    return (
      <View style={[styles.fullscreen, style]}>
        <ActivityIndicator size="large" color={colors.accent} />
        {message && <Text variant="body2" color={colors.textSecondary} style={styles.message}>{message}</Text>}
      </View>
    );
  }

  if (variant === 'inline') {
    return (
      <View style={[styles.inline, style]}>
        <ActivityIndicator size="small" color={colors.accent} />
        {message && <Text variant="caption" color={colors.textTertiary} style={styles.message}>{message}</Text>}
      </View>
    );
  }

  return <SkeletonLoader style={style} />;
};

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius: br = radius.sm,
  style,
}) => {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as DimensionValue,
          height,
          borderRadius: br,
          backgroundColor: colors.gray200,
          opacity,
        },
        style,
      ]}
    />
  );
};

const SkeletonLoader: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => {
  return (
    <View style={[styles.skeletonContainer, style]}>
      <Skeleton width="60%" height={20} borderRadius={radius.sm} />
      <Skeleton width="100%" height={16} borderRadius={radius.sm} />
      <Skeleton width="80%" height={16} borderRadius={radius.sm} />
      <Skeleton width="100%" height={120} borderRadius={radius.md} />
      <View style={styles.skeletonRow}>
        <Skeleton width="48%" height={160} borderRadius={radius.md} />
        <Skeleton width="48%" height={160} borderRadius={radius.md} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullscreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    zIndex: 999,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  message: {
    marginTop: spacing.xs,
  },
  skeletonContainer: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

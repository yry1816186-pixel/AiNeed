import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle, Animated, DimensionValue } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

function useShimmerAnimation(speed = 1200) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, { toValue: 1, duration: speed, useNativeDriver: true }),
        Animated.timing(animatedValue, { toValue: 0, duration: speed, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue, speed]);

  return animatedValue.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] });
}

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = spacing.borderRadius.md,
  style,
}) => {
  const opacity = useShimmerAnimation();
  return <Animated.View style={[{ width, height, borderRadius, backgroundColor: colors.neutral[200], opacity }, style]} />;
};

export interface CircleSkeletonProps {
  size?: number;
  style?: ViewStyle;
}

export const CircleSkeleton: React.FC<CircleSkeletonProps> = ({ size = 48, style }) => {
  const opacity = useShimmerAnimation();
  return <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.neutral[200], opacity }, style]} />;
};

export interface TextSkeletonProps {
  lines?: number;
  lineHeight?: number;
  lastLineWidth?: number;
  style?: ViewStyle;
}

export const TextSkeleton: React.FC<TextSkeletonProps> = ({
  lines = 3,
  lineHeight = 16,
  lastLineWidth = 60,
  style,
}) => {
  const opacity = useShimmerAnimation();
  return (
    <View style={[{ width: '100%' }, style]}>
      {Array.from({ length: lines }).map((_, index) => (
        <Animated.View
          key={index}
          style={{
            width: index === lines - 1 ? `${lastLineWidth}%` : '100%',
            height: lineHeight,
            borderRadius: spacing.borderRadius.sm,
            backgroundColor: colors.neutral[200],
            marginBottom: index < lines - 1 ? spacing.scale[2] : 0,
            opacity,
          }}
        />
      ))}
    </View>
  );
};

export interface CardSkeletonProps {
  style?: ViewStyle;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ style }) => {
  const opacity = useShimmerAnimation();
  return (
    <Animated.View style={[styles.card, { opacity }, style]}>
      <View style={[styles.cardImage, { backgroundColor: colors.neutral[100] }]} />
      <View style={styles.cardContent}>
        <View style={[styles.line, { width: '70%', backgroundColor: colors.neutral[200] }]} />
        <View style={[styles.line, { width: '50%', backgroundColor: colors.neutral[200] }]} />
        <View style={[styles.line, { width: '40%', height: 18, backgroundColor: colors.neutral[200] }]} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: colors.neutral.white, borderRadius: spacing.borderRadius.xl, overflow: 'hidden' },
  cardImage: { width: '100%', height: 180 },
  cardContent: { padding: spacing.aliases.md, gap: spacing.scale[2] },
  line: { height: 14, borderRadius: spacing.borderRadius.sm },
});

export default Skeleton;

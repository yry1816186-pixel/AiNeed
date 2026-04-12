import React, { useEffect } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { Svg, Circle } from 'react-native-svg';
import { colors, spacing } from '../../theme';
import { Text } from '../ui/Text';

interface InlineLoadingProps {
  message?: string;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

const Spinner: React.FC<{ size: number; color: string }> = ({ size, color }) => {
  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 900, easing: Easing.linear }),
      -1,
      false
    );
  }, [rotation]);

  const center = size / 2;
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashLength = circumference * 0.75;

  return (
    <Animated.View style={animatedStyle}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={2.5}
          strokeDasharray={`${dashLength} ${circumference - dashLength}`}
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
};

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  message,
  color = colors.accent,
  size = 20,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Spinner size={size} color={color} />
      {message && (
        <Text variant="caption" color={colors.textTertiary} style={styles.message}>
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  message: {
    marginTop: 0,
  },
});

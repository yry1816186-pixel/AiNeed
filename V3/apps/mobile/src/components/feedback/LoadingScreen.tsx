import React, { useEffect } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Svg, Path } from 'react-native-svg';
import { colors, spacing } from '../../theme';
import { Text } from '../ui/Text';

interface LoadingScreenProps {
  message?: string;
  style?: StyleProp<ViewStyle>;
}

const LogoIcon: React.FC = () => (
  <Svg width={64} height={64} viewBox="0 0 64 64" fill="none">
    <Path
      d="M32 4L58 32L32 60L6 32L32 4Z"
      stroke={colors.accent}
      strokeWidth={2.5}
      strokeLinejoin="round"
    />
    <Path
      d="M32 16L46 32L32 48L18 32L32 16Z"
      fill={colors.accent}
      opacity={0.2}
    />
    <Path
      d="M32 24L39 32L32 40L25 32L32 24Z"
      fill={colors.accent}
    />
  </Svg>
);

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = '加载中...',
  style,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [scale]);

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={animatedStyle}>
        <LogoIcon />
      </Animated.View>
      <Text variant="body2" color={colors.textTertiary} style={styles.message}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  message: {
    marginTop: spacing.xl,
  },
});

import React, { useEffect } from 'react';
import { type StyleProp, type ViewStyle, type ViewProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

interface FadeInViewProps extends Omit<ViewProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  duration?: number;
  delay?: number;
  children: React.ReactNode;
}

export const FadeInView: React.FC<FadeInViewProps> = ({
  style,
  duration = 300,
  delay = 0,
  children,
  ...rest
}) => {
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  useEffect(() => {
    opacity.value = delay > 0 ? withDelay(delay, withTiming(1, { duration })) : withTiming(1, { duration });
  }, [opacity, duration, delay]);

  return (
    <Animated.View style={[animatedStyle, style]} {...rest}>
      {children}
    </Animated.View>
  );
};

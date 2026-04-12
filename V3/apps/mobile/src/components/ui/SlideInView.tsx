import React, { useEffect } from 'react';
import { type StyleProp, type ViewStyle, type ViewProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

type SlideDirection = 'top' | 'bottom' | 'left' | 'right';

interface SlideInViewProps extends Omit<ViewProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  direction?: SlideDirection;
  distance?: number;
  duration?: number;
  delay?: number;
  children: React.ReactNode;
}

const getInitialOffset = (
  direction: SlideDirection,
  distance: number,
): { translateX: number; translateY: number } => {
  switch (direction) {
    case 'top':
      return { translateX: 0, translateY: -distance };
    case 'bottom':
      return { translateX: 0, translateY: distance };
    case 'left':
      return { translateX: -distance, translateY: 0 };
    case 'right':
      return { translateX: distance, translateY: 0 };
  }
};

export const SlideInView: React.FC<SlideInViewProps> = ({
  style,
  direction = 'bottom',
  distance = 30,
  duration = 300,
  delay = 0,
  children,
  ...rest
}) => {
  const initial = getInitialOffset(direction, distance);
  const translateX = useSharedValue(initial.translateX);
  const translateY = useSharedValue(initial.translateY);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  useEffect(() => {
    const timing = (toValue: number) =>
      delay > 0 ? withDelay(delay, withTiming(toValue, { duration })) : withTiming(toValue, { duration });
    translateX.value = timing(0);
    translateY.value = timing(0);
    opacity.value = timing(1);
  }, [translateX, translateY, opacity, duration, delay]);

  return (
    <Animated.View style={[animatedStyle, style]} {...rest}>
      {children}
    </Animated.View>
  );
};

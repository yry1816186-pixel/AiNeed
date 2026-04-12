import React, { useCallback } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

interface ScalePressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  children: React.ReactNode;
}

export const ScalePressable: React.FC<ScalePressableProps> = ({
  style,
  scaleTo = 1.2,
  children,
  onPress,
  ...rest
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(
    (e: import('react-native').GestureResponderEvent) => {
      scale.value = withSequence(
        withTiming(scaleTo, { duration: 100 }),
        withSpring(1, { damping: 12, stiffness: 180 }),
      );
      onPress?.(e);
    },
    [scale, scaleTo, onPress],
  );

  return (
    <Pressable style={style} onPress={handlePress} {...rest}>
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

import React, { useCallback, useRef, useState } from "react";
import {
  TouchableOpacity,
  TouchableOpacityProps,
  GestureResponderEvent,
  StyleSheet,
  ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { useTheme } from "../../contexts/ThemeContext";

const MAX_RIPPLES = 3;
const RIPPLE_SIZE = 200;

interface RippleData {
  id: number;
  x: number;
  y: number;
}

export interface RippleButtonProps extends Omit<TouchableOpacityProps, "onPress"> {
  onPress?: (event: GestureResponderEvent) => void;
  rippleColor?: string;
  disabled?: boolean;
  style?: ViewStyle;
  children: React.ReactNode;
}

interface RippleCircleProps {
  x: number;
  y: number;
  color: string;
  onDone: () => void;
}

const RippleCircle: React.FC<RippleCircleProps> = ({ x, y, color, onDone }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0.2);

  scale.value = withTiming(1, {
    duration: 400,
    easing: Easing.out(Easing.ease),
  });
  opacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }, (finished) => {
    if (finished) {
      runOnJS(onDone)();
    }
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.ripple,
        {
          backgroundColor: color,
          left: x - RIPPLE_SIZE / 2,
          top: y - RIPPLE_SIZE / 2,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    />
  );
};

const rippleCounter = 0;

export const RippleButton: React.FC<RippleButtonProps> = ({
  onPress,
  rippleColor,
  disabled = false,
  style,
  children,
  ...touchableProps
}) => {
  const { colors } = useTheme();
  const resolvedRippleColor = rippleColor ?? colors.primary;
  const [ripples, setRipples] = useState<RippleData[]>([]);
  const buttonScale = useSharedValue(1);
  const counterRef = useRef(rippleCounter);

  const removeRipple = useCallback((id: number) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handlePressIn = useCallback(() => {
    buttonScale.value = withSpring(0.97, {
      damping: 15,
      stiffness: 400,
      mass: 0.5,
    });
  }, [buttonScale]);

  const handlePressOut = useCallback(() => {
    buttonScale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
      mass: 0.5,
    });
  }, [buttonScale]);

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      const { locationX, locationY } = event.nativeEvent;
      const id = ++counterRef.current;

      setRipples((prev) => {
        const next = [...prev, { id, x: locationX, y: locationY }];
        return next.slice(-MAX_RIPPLES);
      });

      onPress?.(event);
    },
    [onPress]
  );

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <Animated.View style={[animatedButtonStyle, style]}>
      <TouchableOpacity
        {...touchableProps}
        activeOpacity={0.9}
        onPressIn={disabled ? undefined : handlePressIn}
        onPressOut={disabled ? undefined : handlePressOut}
        onPress={disabled ? undefined : handlePress}
        disabled={disabled}
        style={styles.touchable}
      >
        {children}
        {ripples.map((ripple) => (
          <RippleCircle
            key={ripple.id}
            x={ripple.x}
            y={ripple.y}
            color={resolvedRippleColor}
            onDone={() => removeRipple(ripple.id)}
          />
        ))}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  touchable: {
    overflow: "hidden",
    position: "relative",
  },
  ripple: {
    position: "absolute",
    width: RIPPLE_SIZE,
    height: RIPPLE_SIZE,
    borderRadius: RIPPLE_SIZE / 2,
    pointerEvents: "none",
  },
});

export default RippleButton;

import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useTheme } from "../../contexts/ThemeContext";

const INDICATOR_WIDTH = 32;
const INDICATOR_HEIGHT = 3;

export interface TabBarIndicatorProps {
  activeIndex: number;
  tabCount: number;
  tabWidth: number;
  color?: string;
}

export const TabBarIndicator: React.FC<TabBarIndicatorProps> = ({
  activeIndex,
  tabCount,
  tabWidth,
  color,
}) => {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.primary;
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const calculateTarget = (index: number): number => {
    "worklet";
    return index * tabWidth + (tabWidth - INDICATOR_WIDTH) / 2;
  };

  useEffect(() => {
    const target = calculateTarget(activeIndex);
    translateX.value = withSpring(target, {
      damping: 20,
      stiffness: 200,
      mass: 1,
    });

    opacity.value = withSpring(0.6, { damping: 20, stiffness: 300 }, (finished) => {
      if (finished) {
        opacity.value = withSpring(1, { damping: 20, stiffness: 200 });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, tabWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.indicator,
        { backgroundColor: resolvedColor, width: INDICATOR_WIDTH },
        animatedStyle,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  indicator: {
    height: INDICATOR_HEIGHT,
    borderRadius: INDICATOR_HEIGHT / 2,
    position: "absolute",
    bottom: 0,
  },
});

export default TabBarIndicator;

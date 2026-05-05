import React from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from "react-native-reanimated";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { SpringConfigs, Duration } from "../../design-system/theme/tokens/animations";

interface AiRevealAnimationProps {
  children: React.ReactNode;
  staggerDelay?: number;
}

function StaggerChild({
  index,
  staggerDelay,
  totalChildren,
  reducedMotion,
  children,
}: {
  index: number;
  staggerDelay: number;
  totalChildren: number;
  reducedMotion: boolean;
  children: React.ReactNode;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(reducedMotion ? 1 : 0.8);

  React.useEffect(() => {
    const delay = index * staggerDelay;
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: Duration.slow })
    );
    scale.value = withDelay(
      delay,
      withSpring(1, SpringConfigs.gentle)
    );
  }, [index, staggerDelay, opacity, scale, reducedMotion]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

export const AiRevealAnimation: React.FC<AiRevealAnimationProps> = ({
  children,
  staggerDelay = 100,
}) => {
  const reducedMotion = useReducedMotion();
  const childArray = React.Children.toArray(children);
  const totalChildren = childArray.length;

  return (
    <View style={styles.container}>
      {childArray.map((child, index) => (
        <StaggerChild
          key={index}
          index={index}
          staggerDelay={staggerDelay}
          totalChildren={totalChildren}
          reducedMotion={reducedMotion}
        >
          {child}
        </StaggerChild>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
});

export default AiRevealAnimation;

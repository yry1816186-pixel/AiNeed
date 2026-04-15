import React, { useRef, useEffect } from "react";
import {
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  ViewStyle,
  TextStyle,
  DimensionValue,
  NativeSyntheticEvent,
  GestureResponderEvent,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Extrapolate,
  Easing,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import { Colors, Spacing, BorderRadius } from '../design-system/theme';
import { DesignTokens } from "../../theme/tokens/design-tokens";
import type { ScrollEvent } from "../../types/events";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);
const AnimatedText = AnimatedReanimated.createAnimatedComponent(Text);

export interface LiquidGlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  tint?: "light" | "dark" | "extraLight";
  onPress?: () => void;
  enableGlow?: boolean;
  glowColor?: string;
}

export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  children,
  style,
  intensity = 40,
  tint = "light",
  onPress,
  enableGlow = true,
  glowColor = Colors.primary[500],
}) => {
  const scale = useSharedValue(1);
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const glowValue = useSharedValue(0);

  useEffect(() => {
    if (enableGlow) {
      glowValue.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [enableGlow]);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      rotateX.value = interpolate(event.translationY, [-50, 0, 50], [5, 0, -5], Extrapolate.CLAMP);
      rotateY.value = interpolate(event.translationX, [-50, 0, 50], [-5, 0, 5], Extrapolate.CLAMP);
    })
    .onEnd(() => {
      rotateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      rotateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
      { scale: scale.value },
    ],
    shadowColor: glowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: enableGlow ? interpolate(glowValue.value, [0, 1], [0.1, 0.3]) : 0,
    shadowRadius: enableGlow ? interpolate(glowValue.value, [0, 1], [15, 30]) : 0,
    elevation: enableGlow ? interpolate(glowValue.value, [0, 1], [8, 16]) : 4,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <GestureDetector gesture={gesture}>
      <AnimatedView style={[styles.liquidGlassCard, animatedStyle, style]}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}
          style={styles.liquidGlassPressable}
        >
          <BlurView intensity={intensity} tint={tint} style={styles.liquidGlassBlur}>
            <View style={styles.liquidGlassContent}>{children}</View>
          </BlurView>
          <View style={styles.liquidGlassBorder} pointerEvents="none" />
        </Pressable>
      </AnimatedView>
    </GestureDetector>
  );
};

export interface MagneticButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "gradient";
  size?: "sm" | "md" | "lg" | "xl";
  icon?: React.ReactNode;
  style?: ViewStyle;
  disabled?: boolean;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  title,
  onPress,
  variant = "gradient",
  size = "lg",
  icon,
  style,
  disabled = false,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const glowIntensity = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      const maxDistance = 20;
      translateX.value = Math.max(-maxDistance, Math.min(maxDistance, event.translationX * 0.3));
      translateY.value = Math.max(-maxDistance, Math.min(maxDistance, event.translationY * 0.3));
    })
    .onEnd(() => {
      translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: interpolate(glowIntensity.value, [0, 1], [0.2, 0.5]),
    shadowRadius: interpolate(glowIntensity.value, [0, 1], [10, 25]),
    elevation: interpolate(glowIntensity.value, [0, 1], [5, 15]),
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.94, { damping: 15, stiffness: 300 });
    glowIntensity.value = withTiming(1, { duration: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    glowIntensity.value = withTiming(0, { duration: 150 });
  };

  const sizeStyles = {
    sm: { height: 36, paddingHorizontal: 16, fontSize: 13 },
    md: { height: 44, paddingHorizontal: 20, fontSize: 14 },
    lg: { height: 52, paddingHorizontal: 28, fontSize: 16 },
    xl: { height: 60, paddingHorizontal: 36, fontSize: 18 },
  };

  const sizeStyle = sizeStyles[size];

  if (variant === "gradient") {
    return (
      <GestureDetector gesture={gesture}>
        <AnimatedView style={[animatedStyle, style]}>
          <Pressable
            onPressIn={disabled ? undefined : handlePressIn}
            onPressOut={disabled ? undefined : handlePressOut}
            onPress={disabled ? undefined : onPress}
          >
            <LinearGradient
              colors={disabled ? [DesignTokens.colors.neutral[300], DesignTokens.colors.neutral[300]] : [DesignTokens.colors.brand.terracotta, DesignTokens.colors.brand.terracottaDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.magneticButtonGradient,
                {
                  height: sizeStyle.height,
                  paddingHorizontal: sizeStyle.paddingHorizontal,
                },
              ]}
            >
              {icon}
              <Text style={[styles.magneticButtonText, { fontSize: sizeStyle.fontSize }]}>
                {title}
              </Text>
            </LinearGradient>
          </Pressable>
        </AnimatedView>
      </GestureDetector>
    );
  }

  return (
    <GestureDetector gesture={gesture}>
      <AnimatedView
        style={[
          styles.magneticButton,
          animatedStyle,
          {
            height: sizeStyle.height,
            paddingHorizontal: sizeStyle.paddingHorizontal,
          },
          disabled && styles.magneticButtonDisabled,
          style,
        ]}
      >
        <Pressable
          onPressIn={disabled ? undefined : handlePressIn}
          onPressOut={disabled ? undefined : handlePressOut}
          onPress={disabled ? undefined : onPress}
          style={styles.magneticButtonPressable}
        >
          {icon}
          <Text style={[styles.magneticButtonText, { fontSize: sizeStyle.fontSize }]}>{title}</Text>
        </Pressable>
      </AnimatedView>
    </GestureDetector>
  );
};

export interface ParallaxScrollViewProps {
  children: React.ReactNode;
  headerComponent?: React.ReactNode;
  headerHeight?: number;
  onScroll?: (event: NativeSyntheticEvent<ScrollEvent["nativeEvent"]>) => void;
}

export const ParallaxScrollView: React.FC<ParallaxScrollViewProps> = ({
  children,
  headerComponent,
  headerHeight = 300,
}) => {
  const scrollY = useSharedValue(0);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: scrollY.value * 0.5 },
      {
        scale: interpolate(scrollY.value, [-100, 0], [1.2, 1], Extrapolate.CLAMP),
      },
    ],
  }));

  const headerOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, headerHeight * 0.5], [1, 0], Extrapolate.CLAMP),
  }));

  return (
    <View style={styles.parallaxContainer}>
      <AnimatedView style={[styles.parallaxHeader, { height: headerHeight }, headerAnimatedStyle]}>
        {headerComponent}
        <AnimatedView style={[styles.parallaxHeaderOverlay, headerOpacityStyle]}>
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.8)"]}
            style={styles.parallaxHeaderGradient}
          />
        </AnimatedView>
      </AnimatedView>
      <AnimatedReanimated.ScrollView
        onScroll={useAnimatedScrollHandler({
          onScroll: (event: { contentOffset: { y: number } }) => {
            "worklet";
            scrollY.value = event.contentOffset.y;
          },
        })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: headerHeight }}
      >
        {children}
      </AnimatedReanimated.ScrollView>
    </View>
  );
};

export interface FloatingElementProps {
  children: React.ReactNode;
  amplitude?: number;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
}

export const FloatingElement: React.FC<FloatingElementProps> = ({
  children,
  amplitude = 10,
  duration = 3000,
  delay = 0,
  style,
}) => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-amplitude, {
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, {
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        true
      )
    );
  }, [amplitude, duration, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return <AnimatedView style={[animatedStyle, style]}>{children}</AnimatedView>;
};

export interface GlowTextProps {
  text: string;
  style?: TextStyle;
  glowColor?: string;
  animated?: boolean;
}

export const GlowText: React.FC<GlowTextProps> = ({
  text,
  style,
  glowColor = Colors.primary[500],
  animated = true,
}) => {
  const glowValue = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      glowValue.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [animated]);

  const animatedStyle = useAnimatedStyle(() => ({
    textShadowColor: glowColor,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: animated ? interpolate(glowValue.value, [0, 1], [5, 20]) : 10,
  }));

  return <AnimatedText style={[animatedStyle, style]}>{text}</AnimatedText>;
};

export interface ParticleEffectProps {
  count?: number;
  color?: string;
  size?: number;
  style?: ViewStyle;
}

interface ParticleDotProps {
  color: string;
  size: number;
}

const ParticleDot: React.FC<ParticleDotProps> = ({ color, size }) => {
  const initialX = useRef(Math.random() * SCREEN_WIDTH).current;
  const initialScale = useRef(Math.random() * 0.5 + 0.5).current;
  const initialOpacity = useRef(Math.random() * 0.5 + 0.2).current;
  const fallDuration = useRef(3000 + Math.random() * 2000).current;

  const y = useSharedValue(Math.random() * SCREEN_HEIGHT);
  const opacity = useSharedValue(initialOpacity);

  useEffect(() => {
    y.value = withRepeat(withTiming(-50, { duration: fallDuration }), -1, false);
    opacity.value = withRepeat(
      withSequence(withTiming(0.8, { duration: 1500 }), withTiming(0.2, { duration: 1500 })),
      -1,
      true
    );
  }, [fallDuration, opacity, y]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: initialX }, { translateY: y.value }, { scale: initialScale }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedView
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
};

export const ParticleEffect: React.FC<ParticleEffectProps> = ({
  count = 20,
  color = Colors.primary[400],
  size = 4,
  style,
}) => {
  return (
    <View style={[styles.particleContainer, style]}>
      {Array.from({ length: count }, (_, i) => (
        <ParticleDot key={i} color={color} size={size} />
      ))}
    </View>
  );
};

export interface RippleEffectProps {
  children: React.ReactNode;
  onPress?: () => void;
  rippleColor?: string;
  style?: ViewStyle;
}

export const RippleEffect: React.FC<RippleEffectProps> = ({
  children,
  onPress,
  rippleColor = "rgba(198, 123, 92, 0.3)",
  style,
}) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0.5);
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  const handlePress = (event: GestureResponderEvent) => {
    x.value = event.nativeEvent.locationX;
    y.value = event.nativeEvent.locationY;
    scale.value = 0;
    opacity.value = 0.5;
    scale.value = withTiming(4, { duration: 500 });
    opacity.value = withTiming(0, { duration: 500 });
    onPress?.();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
    left: x.value - 50,
    top: y.value - 50,
  }));

  return (
    <Pressable onPress={handlePress} style={[styles.rippleContainer, style]}>
      {children}
      <AnimatedView
        style={[styles.ripple, { backgroundColor: rippleColor }, animatedStyle]}
        pointerEvents="none"
      />
    </Pressable>
  );
};

export interface SkeletonLoaderProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const shimmerPosition = useSharedValue(-1);

  useEffect(() => {
    shimmerPosition.value = withRepeat(
      withTiming(2, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: shimmerPosition.value * (typeof width === "number" ? width : SCREEN_WIDTH),
      },
    ],
  }));

  return (
    <View
      style={[styles.skeleton, { width: width as DimensionValue, height, borderRadius }, style]}
    >
      <AnimatedView style={[styles.skeletonShimmer, shimmerStyle]} />
    </View>
  );
};

export interface StaggeredListProps {
  items: React.ReactNode[];
  staggerDelay?: number;
  style?: ViewStyle;
}

interface StaggeredListItemProps {
  item: React.ReactNode;
  index: number;
  staggerDelay: number;
}

const StaggeredListItem: React.FC<StaggeredListItemProps> = ({ item, index, staggerDelay }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    opacity.value = withDelay(index * staggerDelay, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(
      index * staggerDelay,
      withSpring(0, { damping: 15, stiffness: 100 })
    );
    scale.value = withDelay(index * staggerDelay, withSpring(1, { damping: 15, stiffness: 100 }));
  }, [index, opacity, scale, staggerDelay, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return <AnimatedView style={animatedStyle}>{item}</AnimatedView>;
};

export const StaggeredList: React.FC<StaggeredListProps> = ({
  items,
  staggerDelay = 100,
  style,
}) => {
  return (
    <View style={style}>
      {items.map((item, index) => (
        <StaggeredListItem key={index} item={item} index={index} staggerDelay={staggerDelay} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  liquidGlassCard: {
    borderRadius: BorderRadius["3xl"],
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  liquidGlassPressable: {
    flex: 1,
  },
  liquidGlassBlur: {
    flex: 1,
  },
  liquidGlassContent: {
    padding: Spacing[5],
  },
  liquidGlassBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius["3xl"],
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  magneticButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  magneticButtonDisabled: {
    backgroundColor: Colors.neutral[300],
  },
  magneticButtonPressable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[2],
  },
  magneticButtonGradient: {
    borderRadius: BorderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing[2],
  },
  magneticButtonText: {
    color: Colors.white,
    fontWeight: "700",
  },
  parallaxContainer: {
    flex: 1,
  },
  parallaxHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  parallaxHeaderOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  parallaxHeaderGradient: {
    flex: 1,
  },
  particleContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    pointerEvents: "none",
  },
  particle: {
    position: "absolute",
  },
  rippleContainer: {
    overflow: "hidden",
    position: "relative",
  },
  ripple: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  skeleton: {
    backgroundColor: Colors.neutral[200],
    overflow: "hidden",
  },
  skeletonShimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
});

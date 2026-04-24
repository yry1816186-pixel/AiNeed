import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";

import * as Haptics from "@/src/polyfills/expo-haptics";

import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";

import { DesignTokens } from "../../../../design-system/theme/tokens/design-tokens";

import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { flatColors as colors } from "../../../../design-system/theme";
import { createStyles } from "../../../../shared/contexts/ThemeContext";

const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);

const springConfig = {
  damping: 15,
  stiffness: 200,
  mass: 0.5,
};

const bounceConfig = {
  damping: 8,
  stiffness: 400,
  mass: 0.5,
};

export interface LikeButtonProps {
  isLiked: boolean;
  likeCount: number;
  onLikePress: () => void;
  size?: "small" | "medium" | "large";
  style?: ViewStyle;
}

export const AnimatedLikeButton: React.FC<LikeButtonProps> = ({
  isLiked,
  likeCount,
  onLikePress,
  size = "medium",
  style,
}) => {
  const styles = useStyles(colors);
  const scale = useSharedValue(1);
  const heartScale = useSharedValue(1);
  const particleScale = useSharedValue(0);
  const particleOpacity = useSharedValue(0);
  const particleY = useSharedValue(0);

  const sizeConfig = {
    small: { iconSize: 20, fontSize: DesignTokens.typography.sizes.sm },
    medium: { iconSize: 28, fontSize: DesignTokens.typography.sizes.base },
    large: { iconSize: 36, fontSize: DesignTokens.typography.sizes.md },
  };

  const config = sizeConfig[size];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!isLiked) {
      scale.value = withSpring(0.9, springConfig);
      heartScale.value = withSequence(withSpring(1.3, bounceConfig), withSpring(1, springConfig));
      particleScale.value = withSpring(1.5, bounceConfig);
      particleOpacity.value = withTiming(1, { duration: 300 });
      particleY.value = withTiming(-30, { duration: 400 });

      setTimeout(() => {
        scale.value = withSpring(1, springConfig);
        particleOpacity.value = withTiming(0, { duration: 200 });
        particleScale.value = withTiming(0, { duration: 200 });
      }, 400);
    } else {
      scale.value = withSpring(0.9, springConfig);
      setTimeout(() => {
        scale.value = withSpring(1, springConfig);
      }, 100);
    }

    onLikePress();
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const particleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: particleScale.value }, { translateY: particleY.value }],
    opacity: particleOpacity.value,
  }));

  return (
    <TouchableOpacity style={[styles.likeButton, style]} onPress={handlePress} activeOpacity={0.9}>
      <AnimatedView style={buttonAnimatedStyle}>
        <Ionicons
          name={isLiked ? "heart" : "heart-outline"}
          size={config.iconSize}
          color={isLiked ? "colors.error" : colors.neutral[400]}
        />
        {isLiked && (
          <AnimatedView style={[StyleSheet.absoluteFill, heartAnimatedStyle]}>
            <Ionicons name="heart" size={config.iconSize} color="colors.error" />
          </AnimatedView>
        )}
      </AnimatedView>

      {isLiked && (
        <AnimatedView style={[styles.particlesContainer, particleAnimatedStyle]}>
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <View
                key={i}
                style={[
                  styles.particle,
                  {
                    transform: [{ rotate: `${i * 60}deg` }],
                  },
                ]}
              >
                <View style={styles.particleDot} />
              </View>
            ))}
        </AnimatedView>
      )}

      {likeCount > 0 && (
        <Text style={[styles.likeCount, { fontSize: config.fontSize }]}>{likeCount}</Text>
      )}
    </TouchableOpacity>
  );
};

const useStyles = createStyles((colors) => ({
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  likeCount: {
    marginLeft: 4,
    color: colors.neutral[600],
  },
  particlesContainer: {
    position: "absolute",
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  particle: {
    position: "absolute",
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  particleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "colors.error",
  },
}));

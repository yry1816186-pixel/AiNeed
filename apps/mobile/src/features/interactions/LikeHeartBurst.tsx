import React, { useCallback, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  cancelAnimation,
  runOnJS,
} from "react-native-reanimated";
import { Duration } from "../../design-system/theme/tokens/animations";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface HeartParticle {
  id: number;
  angle: number;
  distance: number;
}

const PARTICLE_COUNT = 6;
const PARTICLE_DURATION = Duration.slowest;
const BURST_SCALE_DURATION = 400;

function createParticles(): HeartParticle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    angle: (i * 360) / PARTICLE_COUNT,
    distance: 45 + Math.random() * 20,
  }));
}

interface LikeHeartBurstProps {
  visible: boolean;
  onComplete?: () => void;
}

export const LikeHeartBurst: React.FC<LikeHeartBurstProps> = ({
  visible,
  onComplete,
}) => {
  const reducedMotion = useReducedMotion();
  const centerScale = useSharedValue(0);
  const particleOpacities = [...Array(PARTICLE_COUNT)].map(() => useSharedValue(0));
  const particles = React.useMemo(() => createParticles(), []);

  const triggerComplete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    if (!visible) return;

    centerScale.value = withSequence(
      withTiming(0.3, { duration: 50 }),
      withTiming(1.2, { duration: BURST_SCALE_DURATION / 2 }),
      withTiming(1.0, { duration: BURST_SCALE_DURATION }, (finished) => {
        if (finished) runOnJS(triggerComplete)();
      })
    );

    particles.forEach((_, i) => {
      particleOpacities[i].value = withDelay(
        BURST_SCALE_DURATION / 2 + i * 40,
        withTiming(0, { duration: PARTICLE_DURATION })
      );
    });

    // Set initial opacities to 1 for particles
    particles.forEach((_, i) => {
      particleOpacities[i].value = 1;
    });

    return () => {
      cancelAnimation(centerScale);
      particles.forEach((_, i) => cancelAnimation(particleOpacities[i]));
    };
  }, [visible, centerScale, particles, particleOpacities, triggerComplete]);

  if (!visible) return null;

  const centerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: centerScale.value }],
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Center heart */}
      <Animated.View style={[styles.centerHeart, centerAnimStyle]}>
        <Text style={styles.centerHeartText}>{"❤️"}</Text>
      </Animated.View>

      {/* Particles: reduced motion = skip particles */}
      {!reducedMotion &&
        particles.map((p) => {
          const rad = (p.angle * Math.PI) / 180;
          const tx = Math.cos(rad) * p.distance;
          const ty = Math.sin(rad) * p.distance;

          const particleAnimStyle = useAnimatedStyle(() => ({
            opacity: particleOpacities[p.id].value,
            transform: [
              { translateX: tx * (1 - particleOpacities[p.id].value * 0.3) },
              { translateY: ty * (1 - particleOpacities[p.id].value * 0.3) },
            ],
          }));

          return (
            <Animated.View
              key={p.id}
              style={[styles.particle, particleAnimStyle]}
            >
              <Text style={styles.particleText}>{"❤️"}</Text>
            </Animated.View>
          );
        })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  centerHeart: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  centerHeartText: {
    fontSize: 48,
  },
  particle: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  particleText: {
    fontSize: 16,
  },
});

export default LikeHeartBurst;

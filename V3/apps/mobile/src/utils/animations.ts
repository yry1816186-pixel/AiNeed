import {
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  withDelay,
  type WithTimingConfig,
  type WithSpringConfig,
} from 'react-native-reanimated';

export const fadeIn = (duration?: number): number =>
  withTiming(1, { duration: duration ?? 300 });

export const fadeOut = (duration?: number): number =>
  withTiming(0, { duration: duration ?? 200 });

export const pressScale = (pressed: boolean): number =>
  withSpring(pressed ? 0.95 : 1, { damping: 15 });

export const slideUp = (distance: number, duration?: number): number =>
  withTiming(0, { duration: duration ?? 300 });

export const bounce = (): number =>
  withSequence(withTiming(1.2, { duration: 100 }), withSpring(1));

export const breathe = (): number =>
  withRepeat(withTiming(1.02, { duration: 1000 }), -1, true);

export const shake = (): number =>
  withSequence(
    withTiming(-10, { duration: 50 }),
    withTiming(10, { duration: 50 }),
    withTiming(-5, { duration: 50 }),
    withTiming(0, { duration: 50 }),
  );

export const pageEnter = {
  opacity: fadeIn(),
  translateY: slideUp(20),
};

export const pageExit = {
  opacity: fadeOut(150),
};

export const staggerEnter = (index: number) => ({
  opacity: withDelay(index * 50, withTiming(1, { duration: 300 })),
  translateY: withDelay(index * 50, withTiming(0, { duration: 300 })),
});

export const springConfigs: Record<string, WithSpringConfig> = {
  gentle: { damping: 20, stiffness: 100 },
  bouncy: { damping: 12, stiffness: 180 },
  stiff: { damping: 30, stiffness: 300 },
};

export const timingConfigs: Record<string, WithTimingConfig> = {
  fast: { duration: 150 },
  normal: { duration: 300 },
  slow: { duration: 500 },
};

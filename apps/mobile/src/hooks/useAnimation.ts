import { useRef, useEffect, useCallback } from "react";
import { Animated, Easing, EasingFunction } from "react-native";
import { SpringConfigs, Duration } from '../design-system/theme/tokens/animations';

export function useAnimation(initialValue = 0) {
  const anim = useRef(new Animated.Value(initialValue)).current;

  const animate = useCallback(
    (
      toValue: number,
      config?: { duration?: number; useNativeDriver?: boolean; easing?: EasingFunction }
    ) => {
      return Animated.timing(anim, {
        toValue,
        duration: config?.duration ?? Duration.normal,
        useNativeDriver: config?.useNativeDriver ?? true,
        easing: config?.easing ?? Easing.out(Easing.cubic),
      });
    },
    [anim]
  );

  const spring = useCallback(
    (toValue: number, config?: Partial<typeof SpringConfigs.default>) => {
      return Animated.spring(anim, {
        toValue,
        useNativeDriver: true,
        ...SpringConfigs.default,
        ...config,
      });
    },
    [anim]
  );

  return { anim, animate, spring };
}

export function useFadeAnimation(initialVisible = false) {
  const opacity = useRef(new Animated.Value(initialVisible ? 1 : 0)).current;
  const scale = useRef(new Animated.Value(initialVisible ? 1 : 0.95)).current;
  const isVisibleRef = useRef(initialVisible);

  const show = useCallback(() => {
    isVisibleRef.current = true;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: Duration.normal,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        ...SpringConfigs.gentle,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  const hide = useCallback(() => {
    isVisibleRef.current = false;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: Duration.fast,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.95,
        duration: Duration.fast,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  const toggle = useCallback(() => {
    if (isVisibleRef.current) {
      hide();
    } else {
      show();
    }
  }, [show, hide]);

  return { opacity, scale, show, hide, toggle };
}

export function useScaleAnimation(triggerOnMount = false) {
  const scale = useRef(new Animated.Value(triggerOnMount ? 0 : 1)).current;

  const scaleIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      ...SpringConfigs.bouncy,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const scaleOut = useCallback(() => {
    Animated.timing(scale, {
      toValue: 0,
      duration: Duration.fast,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const pulse = useCallback(() => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.1,
        ...SpringConfigs.bouncy,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        ...SpringConfigs.gentle,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale]);

  useEffect(() => {
    if (triggerOnMount) {
      scaleIn();
    }
  }, [triggerOnMount, scaleIn]);

  return { scale, scaleIn, scaleOut, pulse };
}

export function useSlideAnimation(
  direction: "up" | "down" | "left" | "right" = "up",
  distance = 100
) {
  const translateValue = direction === "up" || direction === "down" ? "translateY" : "translateX";
  const offset = direction === "down" || direction === "right" ? distance : -distance;

  const translate = useRef(new Animated.Value(offset)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const slideIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(translate, {
        toValue: 0,
        ...SpringConfigs.gentle,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: Duration.normal,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translate, opacity]);

  const slideOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(translate, {
        toValue: offset,
        duration: Duration.fast,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: Duration.fast,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translate, opacity, offset]);

  return {
    translate,
    opacity,
    slideIn,
    slideOut,
    transform: [{ [translateValue]: translate }],
  };
}

export function useStaggerAnimation(itemCount: number, staggerDelay = 50) {
  const animations = useRef(
    Array.from({ length: itemCount }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
    }))
  ).current;

  const start = useCallback(() => {
    const animatedItems = animations.map((anim, index) =>
      Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: Duration.normal,
          delay: index * staggerDelay,
          useNativeDriver: true,
        }),
        Animated.spring(anim.translateY, {
          toValue: 0,
          delay: index * staggerDelay,
          ...SpringConfigs.gentle,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.stagger(staggerDelay, animatedItems).start();
  }, [animations, staggerDelay]);

  const reset = useCallback(() => {
    animations.forEach((anim) => {
      anim.opacity.setValue(0);
      anim.translateY.setValue(20);
    });
  }, [animations]);

  return { animations, start, reset };
}

export function useMountAnimation() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: Duration.normal,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        ...SpringConfigs.snappy,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        ...SpringConfigs.gentle,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return { opacity, scale, translateY };
}

export function useShakeAnimation() {
  const shake = useRef(new Animated.Value(0)).current;

  const trigger = useCallback(() => {
    Animated.sequence([
      Animated.timing(shake, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shake]);

  return { shake, trigger, transform: [{ translateX: shake }] };
}

export function usePulseAnimation(active = true, interval = 2000) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.05,
            duration: interval / 2,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.8,
            duration: interval / 2,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: interval / 2,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: interval / 2,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [active, interval, scale, opacity]);

  return { scale, opacity };
}

export function usePressAnimation() {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.95,
      ...SpringConfigs.snappy,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      ...SpringConfigs.bouncy,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return { scale, onPressIn, onPressOut };
}

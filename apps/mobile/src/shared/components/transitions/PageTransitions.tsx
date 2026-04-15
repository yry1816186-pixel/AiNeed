import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  createContext,
  useContext,
  ReactNode,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  Modal,
  TouchableOpacity,
  Image,
  Animated,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
} from "react-native";

import * as Haptics from "@/src/polyfills/expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  interpolate,
  Extrapolate,
  Easing,
  runOnJS,
  SharedValue,
  useDerivedValue,
  cancelAnimation,
  withDecay,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import { Colors } from '../design-system/theme';
import { DesignTokens } from "../../theme/tokens/design-tokens";
import { useReducedMotion } from "../../hooks/useReducedMotion";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);
const _AnimatedImage = AnimatedReanimated.createAnimatedComponent(Image);

const springConfig = {
  damping: 20,
  stiffness: 200,
  mass: 0.8,
};

const transitionSpringConfig = {
  damping: 25,
  stiffness: 180,
  mass: 1,
};

type TransitionType =
  | "fade"
  | "slide"
  | "scale"
  | "flip"
  | "sharedElement"
  | "modal"
  | "bottomSheet";

interface TransitionContextValue {
  currentTransition: SharedValue<number>;
  transitionType: TransitionType;
  startTransition: (type: TransitionType, callback?: () => void) => void;
  endTransition: (callback?: () => void) => void;
}

const TransitionContext = createContext<TransitionContextValue | null>(null);

export const useTransition = () => {
  const context = useContext(TransitionContext);
  if (!context) {
    throw new Error("useTransition must be used within TransitionProvider");
  }
  return context;
};

export interface TransitionProviderProps {
  children: ReactNode;
}

export const TransitionProvider: React.FC<TransitionProviderProps> = ({ children }) => {
  const currentTransition = useSharedValue(0);
  const [transitionType, setTransitionType] = useState<TransitionType>("fade");

  const startTransition = useCallback((type: TransitionType, callback?: () => void) => {
    setTransitionType(type);
    currentTransition.value = withTiming(
      1,
      { duration: 300, easing: Easing.out(Easing.ease) },
      () => {
        if (callback) {
          runOnJS(callback)();
        }
      }
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const endTransition = useCallback((callback?: () => void) => {
    currentTransition.value = withTiming(
      0,
      { duration: 250, easing: Easing.in(Easing.ease) },
      () => {
        if (callback) {
          runOnJS(callback)();
        }
      }
    );
  }, []);

  return (
    <TransitionContext.Provider
      value={{
        currentTransition,
        transitionType,
        startTransition,
        endTransition,
      }}
    >
      {children}
    </TransitionContext.Provider>
  );
};

export interface SharedElementTransitionProps {
  children: React.ReactNode;
  sharedId: string;
  style?: StyleProp<ViewStyle>;
  isActive?: boolean;
}

/** 元素测量数据 */
interface ElementMeasurements {
  x: number;
  y: number;
  width: number;
  height: number;
  pageX: number;
  pageY: number;
}

interface SharedElementContextValue {
  registerElement: (
    id: string,
    ref: React.RefObject<View>,
    measurements: ElementMeasurements
  ) => void;
  unregisterElement: (id: string) => void;
  activeTransition: SharedValue<{ fromId: string; toId: string } | null>;
}

const SharedElementContext = createContext<SharedElementContextValue | null>(null);

export const useSharedElement = () => {
  const context = useContext(SharedElementContext);
  return context;
};

export const SharedElement: React.FC<SharedElementTransitionProps> = ({
  children,
  sharedId,
  style,
  _isActive = false,
}) => {
  const elementRef = useRef<View>(null);
  const context = useSharedElement();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const onLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      if (context && elementRef.current) {
        elementRef.current.measure((x, y, width, height, pageX, pageY) => {
          context.registerElement(sharedId, elementRef, {
            x,
            y,
            width,
            height,
            pageX,
            pageY,
          });
        });
      }
    },
    [sharedId, context]
  );

  useEffect(() => {
    return () => {
      if (context) {
        context.unregisterElement(sharedId);
      }
    };
  }, [sharedId, context]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedView ref={elementRef} style={[style, animatedStyle]} onLayout={onLayout}>
      {children}
    </AnimatedView>
  );
};

export interface FadeTransitionProps {
  children: React.ReactNode;
  visible: boolean;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

export const FadeTransition: React.FC<FadeTransitionProps> = ({
  children,
  visible,
  duration = 300,
  style,
}) => {
  const opacity = useSharedValue(visible ? 1 : 0);
  const scale = useSharedValue(visible ? 1 : 0.95);
  const { reducedMotion } = useReducedMotion();

  useEffect(() => {
    if (visible) {
      if (reducedMotion) {
        opacity.value = withTiming(1, { duration: 0 });
        scale.value = withTiming(1, { duration: 0 });
      } else {
        opacity.value = withTiming(1, {
          duration,
          easing: Easing.out(Easing.ease),
        });
        scale.value = withSpring(1, springConfig);
      }
    } else {
      if (reducedMotion) {
        opacity.value = withTiming(0, { duration: 0 });
        scale.value = withTiming(0.95, { duration: 0 });
      } else {
        opacity.value = withTiming(0, {
          duration: duration * 0.7,
          easing: Easing.in(Easing.ease),
        });
        scale.value = withTiming(0.95, { duration: duration * 0.7 });
      }
    }
  }, [visible, duration, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return <AnimatedView style={[style, animatedStyle]}>{children}</AnimatedView>;
};

export interface SlideTransitionProps {
  children: React.ReactNode;
  visible: boolean;
  direction?: "left" | "right" | "up" | "down";
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

export const SlideTransition: React.FC<SlideTransitionProps> = ({
  children,
  visible,
  direction = "right",
  duration = 350,
  style,
}) => {
  const translateValue = useSharedValue(visible ? 0 : SCREEN_WIDTH);
  const opacity = useSharedValue(visible ? 1 : 0);
  const { reducedMotion } = useReducedMotion();

  const getInitialValue = () => {
    switch (direction) {
      case "left":
        return -SCREEN_WIDTH;
      case "right":
        return SCREEN_WIDTH;
      case "up":
        return -SCREEN_HEIGHT;
      case "down":
        return SCREEN_HEIGHT;
      default:
        return SCREEN_WIDTH;
    }
  };

  useEffect(() => {
    if (visible) {
      if (reducedMotion) {
        opacity.value = withTiming(1, { duration: 0 });
        translateValue.value = withTiming(0, { duration: 0 });
      } else {
        translateValue.value = withSpring(0, transitionSpringConfig);
        opacity.value = withTiming(1, { duration: duration * 0.5 });
      }
    } else {
      if (reducedMotion) {
        opacity.value = withTiming(0, { duration: 0 });
        translateValue.value = withTiming(getInitialValue(), { duration: 0 });
      } else {
        translateValue.value = withTiming(getInitialValue(), {
          duration,
          easing: Easing.in(Easing.ease),
        });
        opacity.value = withTiming(0, { duration: duration * 0.3 });
      }
    }
  }, [visible, direction, duration, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    "worklet";
    const transformKey =
      direction === "left" || direction === "right" ? "translateX" : "translateY";
    const transform: { translateX?: number; translateY?: number } = {};
    if (transformKey === "translateX") {
      transform.translateX = translateValue.value;
    } else {
      transform.translateY = translateValue.value;
    }
    return {
      opacity: opacity.value,
      transform: [transform as { translateX: number } | { translateY: number }],
    };
  });

  return <AnimatedView style={[style, animatedStyle]}>{children}</AnimatedView>;
};

export interface ScaleTransitionProps {
  children: React.ReactNode;
  visible: boolean;
  fromScale?: number;
  toScale?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

export const ScaleTransition: React.FC<ScaleTransitionProps> = ({
  children,
  visible,
  fromScale = 0.8,
  toScale = 1,
  duration = 300,
  style,
}) => {
  const scale = useSharedValue(visible ? toScale : fromScale);
  const opacity = useSharedValue(visible ? 1 : 0);
  const { reducedMotion } = useReducedMotion();

  useEffect(() => {
    if (visible) {
      if (reducedMotion) {
        opacity.value = withTiming(1, { duration: 0 });
        scale.value = withTiming(toScale, { duration: 0 });
      } else {
        scale.value = withSpring(toScale, springConfig);
        opacity.value = withTiming(1, { duration: duration * 0.6 });
      }
    } else {
      if (reducedMotion) {
        opacity.value = withTiming(0, { duration: 0 });
        scale.value = withTiming(fromScale, { duration: 0 });
      } else {
        scale.value = withTiming(fromScale, {
          duration,
          easing: Easing.in(Easing.ease),
        });
        opacity.value = withTiming(0, { duration: duration * 0.4 });
      }
    }
  }, [visible, fromScale, toScale, duration, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <AnimatedView style={[style, animatedStyle]}>{children}</AnimatedView>;
};

export interface FlipTransitionProps {
  children: React.ReactNode;
  visible: boolean;
  direction?: "horizontal" | "vertical";
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

export const FlipTransition: React.FC<FlipTransitionProps> = ({
  children,
  visible,
  direction = "horizontal",
  duration = 500,
  style,
}) => {
  const rotateValue = useSharedValue(visible ? 0 : 180);
  const opacity = useSharedValue(visible ? 1 : 0);
  const { reducedMotion } = useReducedMotion();

  useEffect(() => {
    if (visible) {
      if (reducedMotion) {
        opacity.value = withTiming(1, { duration: 0 });
        rotateValue.value = withTiming(0, { duration: 0 });
      } else {
        rotateValue.value = withSpring(0, { damping: 15, stiffness: 100 });
        opacity.value = withTiming(1, { duration: duration * 0.3 });
      }
    } else {
      if (reducedMotion) {
        opacity.value = withTiming(0, { duration: 0 });
        rotateValue.value = withTiming(180, { duration: 0 });
      } else {
        rotateValue.value = withTiming(180, {
          duration,
          easing: Easing.inOut(Easing.ease),
        });
        opacity.value = withTiming(0, { duration: duration * 0.2 });
      }
    }
  }, [visible, direction, duration, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { perspective: 1000 },
      direction === "horizontal"
        ? { rotateY: `${rotateValue.value}deg` }
        : { rotateX: `${rotateValue.value}deg` },
    ],
  }));

  return <AnimatedView style={[style, animatedStyle]}>{children}</AnimatedView>;
};

export interface ModalTransitionProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  backdropOpacity?: number;
  enableGestureClose?: boolean;
  snapPoints?: number[];
}

export const ModalTransition: React.FC<ModalTransitionProps> = ({
  visible,
  onClose,
  children,
  style,
  backdropOpacity = 0.5,
  enableGestureClose = true,
  snapPoints = [0.9, 0.5, 0],
}) => {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdrop = useSharedValue(0);
  const modalScale = useSharedValue(0.9);
  const { reducedMotion, reducedMotionSV } = useReducedMotion();

  useEffect(() => {
    if (visible) {
      if (reducedMotion) {
        translateY.value = withTiming(SCREEN_HEIGHT * (1 - snapPoints[0]), { duration: 0 });
        backdrop.value = withTiming(backdropOpacity, { duration: 0 });
        modalScale.value = withTiming(1, { duration: 0 });
      } else {
        translateY.value = withSpring(SCREEN_HEIGHT * (1 - snapPoints[0]), transitionSpringConfig);
        backdrop.value = withTiming(backdropOpacity, { duration: 300 });
        modalScale.value = withSpring(1, springConfig);
      }
    } else {
      if (reducedMotion) {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 0 });
        backdrop.value = withTiming(0, { duration: 0 });
        modalScale.value = withTiming(0.9, { duration: 0 });
      } else {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
        backdrop.value = withTiming(0, { duration: 200 });
        modalScale.value = withTiming(0.9, { duration: 200 });
      }
    }
  }, [visible, snapPoints, backdropOpacity, reducedMotion]);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      if (enableGestureClose && event.translationY > 0) {
        translateY.value = SCREEN_HEIGHT * (1 - snapPoints[0]) + event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 500) {
        if (reducedMotionSV.value) {
          translateY.value = withTiming(SCREEN_HEIGHT, { duration: 0 });
          backdrop.value = withTiming(0, { duration: 0 });
        } else {
          translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 });
          backdrop.value = withTiming(0, { duration: 150 });
        }
        runOnJS(onClose)();
      } else {
        if (reducedMotionSV.value) {
          translateY.value = withTiming(SCREEN_HEIGHT * (1 - snapPoints[0]), { duration: 0 });
        } else {
          translateY.value = withSpring(
            SCREEN_HEIGHT * (1 - snapPoints[0]),
            transitionSpringConfig
          );
        }
      }
    });

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: modalScale.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));

  const handleBackdropPress = () => {
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
    backdrop.value = withTiming(0, { duration: 200 });
    setTimeout(onClose, 200);
  };

  if (!visible && translateY.value === SCREEN_HEIGHT) {
    return null;
  }

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleBackdropPress}>
          <AnimatedView style={[styles.backdropFill, backdropAnimatedStyle]} />
        </TouchableOpacity>
        <GestureDetector gesture={gesture}>
          <AnimatedView style={[styles.modalContent, style, modalAnimatedStyle]}>
            <View style={styles.modalHandle} />
            {children}
          </AnimatedView>
        </GestureDetector>
      </View>
    </Modal>
  );
};

export interface BottomSheetTransitionProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[];
  initialSnap?: number;
  enablePanDownToClose?: boolean;
  style?: StyleProp<ViewStyle>;
  backdropComponent?: React.ReactNode;
  handleComponent?: React.ReactNode;
}

export const BottomSheetTransition: React.FC<BottomSheetTransitionProps> = ({
  visible,
  onClose,
  children,
  snapPoints = [0.9, 0.5, 0.25],
  initialSnap = 0,
  enablePanDownToClose = true,
  style,
  backdropComponent,
  handleComponent,
}) => {
  const animatedPosition = useSharedValue(1);
  const _currentPosition = useSharedValue(snapPoints[initialSnap]);
  const backdropOpacity = useSharedValue(0);
  const { reducedMotion, reducedMotionSV } = useReducedMotion();

  const snapPointPositions = snapPoints.map((p) => SCREEN_HEIGHT * (1 - p));

  useEffect(() => {
    if (visible) {
      if (reducedMotion) {
        animatedPosition.value = withTiming(snapPointPositions[initialSnap], { duration: 0 });
        backdropOpacity.value = withTiming(0.5, { duration: 0 });
      } else {
        animatedPosition.value = withSpring(
          snapPointPositions[initialSnap],
          transitionSpringConfig
        );
        backdropOpacity.value = withTiming(0.5, { duration: 300 });
      }
    } else {
      if (reducedMotion) {
        animatedPosition.value = withTiming(SCREEN_HEIGHT, { duration: 0 });
        backdropOpacity.value = withTiming(0, { duration: 0 });
      } else {
        animatedPosition.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
        backdropOpacity.value = withTiming(0, { duration: 200 });
      }
    }
  }, [visible, initialSnap, reducedMotion]);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      animatedPosition.value = Math.max(
        snapPointPositions[snapPointPositions.length - 1],
        Math.min(snapPointPositions[0] + 50, snapPointPositions[initialSnap] + event.translationY)
      );
    })
    .onEnd((event) => {
      const velocity = event.velocityY;
      const position = animatedPosition.value;

      if (enablePanDownToClose && (position > snapPointPositions[0] + 100 || velocity > 500)) {
        if (reducedMotionSV.value) {
          animatedPosition.value = withTiming(SCREEN_HEIGHT, { duration: 0 });
          backdropOpacity.value = withTiming(0, { duration: 0 });
        } else {
          animatedPosition.value = withTiming(SCREEN_HEIGHT, { duration: 200 });
          backdropOpacity.value = withTiming(0, { duration: 150 });
        }
        runOnJS(onClose)();
        return;
      }

      let closestSnap = snapPointPositions[0];
      let minDistance = Math.abs(position - snapPointPositions[0]);

      snapPointPositions.forEach((snapPoint) => {
        const distance = Math.abs(position - snapPoint);
        if (distance < minDistance) {
          minDistance = distance;
          closestSnap = snapPoint;
        }
      });

      if (reducedMotionSV.value) {
        animatedPosition.value = withTiming(closestSnap, { duration: 0 });
      } else {
        animatedPosition.value = withSpring(closestSnap, transitionSpringConfig);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: animatedPosition.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const defaultHandle = (
    <View style={styles.sheetHandleContainer}>
      <View style={styles.sheetHandle} />
    </View>
  );

  if (!visible) {
    return null;
  }

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.sheetContainer}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onClose}>
          <AnimatedView style={[styles.sheetBackdropFill, backdropAnimatedStyle]} />
        </TouchableOpacity>
        <GestureDetector gesture={gesture}>
          <AnimatedView style={[styles.sheetContent, style, animatedStyle]}>
            {handleComponent || defaultHandle}
            {children}
          </AnimatedView>
        </GestureDetector>
      </View>
    </Modal>
  );
};

export interface PageTransitionProps {
  children: React.ReactNode;
  from?: TransitionType;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  from = "slide",
  duration = 350,
  style,
}) => {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(from === "slide" ? SCREEN_WIDTH * 0.1 : 0);
  const scale = useSharedValue(from === "scale" ? 0.95 : 1);
  const rotateY = useSharedValue(from === "flip" ? 15 : 0);
  const { reducedMotion } = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = withTiming(1, { duration: 0 });
      translateX.value = withTiming(0, { duration: 0 });
      scale.value = withTiming(1, { duration: 0 });
      rotateY.value = withTiming(0, { duration: 0 });
    } else {
      opacity.value = withTiming(1, {
        duration,
        easing: Easing.out(Easing.ease),
      });
      translateX.value = withSpring(0, springConfig);
      scale.value = withSpring(1, springConfig);
      rotateY.value = withSpring(0, springConfig);
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
      { perspective: 1000 },
      { rotateY: `${rotateY.value}deg` },
    ],
  }));

  return <AnimatedView style={[style, animatedStyle]}>{children}</AnimatedView>;
};

export interface StaggerTransitionProps {
  children: React.ReactNode[];
  visible: boolean;
  staggerDelay?: number;
  direction?: "up" | "down" | "left" | "right";
  style?: StyleProp<ViewStyle>;
}

interface StaggerTransitionItemProps {
  child: React.ReactNode;
  visible: boolean;
  index: number;
  staggerDelay: number;
  direction: "up" | "down" | "left" | "right";
}

const StaggerTransitionItem: React.FC<StaggerTransitionItemProps> = ({
  child,
  visible,
  index,
  staggerDelay,
  direction,
}) => {
  const translateValue = useSharedValue(visible ? 0 : 30);
  const opacity = useSharedValue(visible ? 1 : 0);
  const { reducedMotion } = useReducedMotion();

  useEffect(() => {
    if (visible) {
      if (reducedMotion) {
        translateValue.value = withDelay(index * staggerDelay, withTiming(0, { duration: 0 }));
        opacity.value = withDelay(index * staggerDelay, withTiming(1, { duration: 0 }));
      } else {
        translateValue.value = withDelay(index * staggerDelay, withSpring(0, springConfig));
        opacity.value = withDelay(index * staggerDelay, withTiming(1, { duration: 200 }));
      }
      return;
    }

    if (reducedMotion) {
      translateValue.value = withDelay(index * staggerDelay * 0.5, withTiming(30, { duration: 0 }));
      opacity.value = withDelay(index * staggerDelay * 0.5, withTiming(0, { duration: 0 }));
    } else {
      translateValue.value = withDelay(
        index * staggerDelay * 0.5,
        withTiming(30, { duration: 150 })
      );
      opacity.value = withDelay(index * staggerDelay * 0.5, withTiming(0, { duration: 150 }));
    }
  }, [direction, index, opacity, staggerDelay, translateValue, visible, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    "worklet";
    const transformKey = direction === "up" || direction === "down" ? "translateY" : "translateX";
    const multiplier = direction === "up" || direction === "left" ? -1 : 1;
    const transform: { translateX?: number; translateY?: number } = {};

    if (transformKey === "translateX") {
      transform.translateX = translateValue.value * multiplier;
    } else {
      transform.translateY = translateValue.value * multiplier;
    }

    return {
      opacity: opacity.value,
      transform: [transform as { translateX: number } | { translateY: number }],
    };
  });

  return <AnimatedView style={animatedStyle}>{child}</AnimatedView>;
};

export const StaggerTransition: React.FC<StaggerTransitionProps> = ({
  children,
  visible,
  staggerDelay = 80,
  direction = "up",
  style,
}) => {
  const childArray = React.Children.toArray(children);

  return (
    <View style={style}>
      {childArray.map((child, index) => (
        <StaggerTransitionItem
          key={index}
          child={child}
          visible={visible}
          index={index}
          staggerDelay={staggerDelay}
          direction={direction}
        />
      ))}
    </View>
  );
};

export interface CrossFadeTransitionProps {
  from: React.ReactNode;
  to: React.ReactNode;
  progress: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

export const CrossFadeTransition: React.FC<CrossFadeTransitionProps> = ({
  from,
  to,
  progress,
  duration = 300,
  style,
}) => {
  const fromOpacity = useSharedValue(1 - progress);
  const toOpacity = useSharedValue(progress);
  const fromScale = useSharedValue(1 - progress * 0.05);
  const toScale = useSharedValue(0.95 + progress * 0.05);

  useEffect(() => {
    fromOpacity.value = withTiming(1 - progress, { duration });
    toOpacity.value = withTiming(progress, { duration });
    fromScale.value = withTiming(1 - progress * 0.05, { duration });
    toScale.value = withTiming(0.95 + progress * 0.05, { duration });
  }, [progress, duration]);

  const fromAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fromOpacity.value,
    transform: [{ scale: fromScale.value }],
  }));

  const toAnimatedStyle = useAnimatedStyle(() => ({
    opacity: toOpacity.value,
    transform: [{ scale: toScale.value }],
  }));

  return (
    <View style={[styles.crossFadeContainer, style]}>
      <AnimatedView style={[StyleSheet.absoluteFill, fromAnimatedStyle]}>{from}</AnimatedView>
      <AnimatedView style={[StyleSheet.absoluteFill, toAnimatedStyle]}>{to}</AnimatedView>
    </View>
  );
};

export interface HeroTransitionProps {
  children: React.ReactNode;
  sourceImage?: string;
  sourceStyle?: StyleProp<ViewStyle>;
  targetStyle?: StyleProp<ViewStyle>;
  visible: boolean;
  duration?: number;
}

export const HeroTransition: React.FC<HeroTransitionProps> = ({
  children,
  sourceImage,
  sourceStyle,
  targetStyle,
  visible,
  duration = 400,
}) => {
  const scale = useSharedValue(visible ? 1 : 0.5);
  const opacity = useSharedValue(visible ? 1 : 0);
  const borderRadius = useSharedValue(visible ? 0 : 20);
  const { reducedMotion } = useReducedMotion();

  useEffect(() => {
    if (visible) {
      if (reducedMotion) {
        scale.value = withTiming(1, { duration: 0 });
        opacity.value = withTiming(1, { duration: 0 });
        borderRadius.value = withTiming(0, { duration: 0 });
      } else {
        scale.value = withSpring(1, transitionSpringConfig);
        opacity.value = withTiming(1, { duration: duration * 0.5 });
        borderRadius.value = withTiming(0, { duration });
      }
    } else {
      if (reducedMotion) {
        scale.value = withTiming(0.5, { duration: 0 });
        opacity.value = withTiming(0, { duration: 0 });
        borderRadius.value = withTiming(20, { duration: 0 });
      } else {
        scale.value = withTiming(0.5, {
          duration,
          easing: Easing.in(Easing.ease),
        });
        opacity.value = withTiming(0, { duration: duration * 0.3 });
        borderRadius.value = withTiming(20, { duration });
      }
    }
  }, [visible, duration, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
    borderRadius: borderRadius.value,
  }));

  return <AnimatedView style={[styles.heroContainer, animatedStyle]}>{children}</AnimatedView>;
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DesignTokens.colors.neutral[900],
  },
  modalContent: {
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: SCREEN_HEIGHT * 0.3,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  modalHandle: {
    width: 36,
    height: 5,
    backgroundColor: Colors.neutral[300],
    borderRadius: 2.5,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  sheetContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetBackdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DesignTokens.colors.neutral[900],
  },
  sheetContent: {
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  sheetHandleContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  sheetHandle: {
    width: 36,
    height: 5,
    backgroundColor: Colors.neutral[300],
    borderRadius: 2.5,
  },
  crossFadeContainer: {
    position: "relative",
  },
  heroContainer: {
    overflow: "hidden",
  },
});

export default {
  TransitionProvider,
  useTransition,
  SharedElement,
  FadeTransition,
  SlideTransition,
  ScaleTransition,
  FlipTransition,
  ModalTransition,
  BottomSheetTransition,
  PageTransition,
  StaggerTransition,
  CrossFadeTransition,
  HeroTransition,
};

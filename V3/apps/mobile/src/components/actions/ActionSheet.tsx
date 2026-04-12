import React, { useEffect, useCallback } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { colors, spacing, radius, shadows } from '../../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.52;
const DISMISS_THRESHOLD = 80;
const ANIMATION_DURATION = 300;

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const ActionSheet: React.FC<ActionSheetProps> = React.memo(
  ({ visible, onClose, children }) => {
    const translateY = useSharedValue(SHEET_MAX_HEIGHT);
    const backdropOpacity = useSharedValue(0);
    const sheetHeight = useSharedValue(SHEET_MAX_HEIGHT);

    const showSheet = useCallback(() => {
      translateY.value = withSpring(0, {
        damping: 22,
        stiffness: 180,
        mass: 0.8,
      });
      backdropOpacity.value = withTiming(0.4, { duration: ANIMATION_DURATION });
    }, [translateY, backdropOpacity]);

    const hideSheet = useCallback(() => {
      translateY.value = withTiming(sheetHeight.value, {
        duration: ANIMATION_DURATION,
      });
      backdropOpacity.value = withTiming(0, { duration: ANIMATION_DURATION });
    }, [translateY, backdropOpacity, sheetHeight]);

    useEffect(() => {
      if (visible) {
        showSheet();
      } else {
        hideSheet();
      }
    }, [visible, showSheet, hideSheet]);

    const handleLayout = useCallback(
      (event: LayoutChangeEvent) => {
        const { height: measuredHeight } = event.nativeEvent.layout;
        sheetHeight.value = measuredHeight;
        if (!visible) {
          translateY.value = measuredHeight;
        }
      },
      [visible, sheetHeight, translateY],
    );

    const panGesture = Gesture.Pan()
      .activeOffsetY(10)
      .failOffsetX([-20, 20])
      .onUpdate((event) => {
        if (event.translationY > 0) {
          translateY.value = event.translationY;
          backdropOpacity.value = interpolate(
            event.translationY,
            [0, sheetHeight.value],
            [0.4, 0],
            Extrapolation.CLAMP,
          );
        }
      })
      .onEnd((event) => {
        if (event.translationY > DISMISS_THRESHOLD || event.velocityY > 500) {
          runOnJS(onClose)();
        } else {
          translateY.value = withSpring(0, {
            damping: 22,
            stiffness: 180,
            mass: 0.8,
          });
          backdropOpacity.value = withTiming(0.4, { duration: 200 });
        }
      });

    const backdropAnimatedStyle = useAnimatedStyle(() => ({
      opacity: backdropOpacity.value,
    }));

    const sheetAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

    return (
      <GestureHandlerRootView style={styles.root} pointerEvents={visible ? 'auto' : 'none'}>
        <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[styles.sheet, sheetAnimatedStyle]}
            onLayout={handleLayout}
          >
            <View style={styles.handleBar} />
            {children}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    );
  },
);

ActionSheet.displayName = 'ActionSheet';

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.black,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    ...shadows.modal,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray300,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
});

import React, { useEffect } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Svg, Path, Circle } from 'react-native-svg';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text } from '../ui/Text';
import { useToastStore, type ToastType } from '../../stores/toast.store';

interface ToastProps {
  style?: StyleProp<ViewStyle>;
}

const typeColors: Record<ToastType, string> = {
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  info: colors.info,
};

const SuccessIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Circle cx={10} cy={10} r={9} fill={colors.success} />
    <Path
      d="M6 10L9 13L14 7"
      stroke={colors.white}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const WarningIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Circle cx={10} cy={10} r={9} fill={colors.warning} />
    <Path d="M10 6V11" stroke={colors.white} strokeWidth={2} strokeLinecap="round" />
    <Circle cx={10} cy={14} r={1} fill={colors.white} />
  </Svg>
);

const ErrorIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Circle cx={10} cy={10} r={9} fill={colors.error} />
    <Path
      d="M7 7L13 13M13 7L7 13"
      stroke={colors.white}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const InfoIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Circle cx={10} cy={10} r={9} fill={colors.info} />
    <Path d="M10 6.5V6.51" stroke={colors.white} strokeWidth={2} strokeLinecap="round" />
    <Path d="M10 9.5V14" stroke={colors.white} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const typeIcons: Record<ToastType, React.FC> = {
  success: SuccessIcon,
  warning: WarningIcon,
  error: ErrorIcon,
  info: InfoIcon,
};

export const Toast: React.FC<ToastProps> = ({ style }) => {
  const { message, type, visible } = useToastStore();
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withTiming(100, { duration: 200, easing: Easing.in(Easing.ease) });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, translateY, opacity]);

  const Icon = typeIcons[type];

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.toast,
          { borderLeftColor: typeColors[type] },
          shadows.md,
          animatedStyle,
          style,
        ]}
      >
        <Icon />
        <Text variant="body2" color={colors.textPrimary} style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: spacing.xxl,
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '90%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderLeftWidth: 4,
  },
  message: {
    flex: 1,
  },
});

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface LoadingSpinnerProps {
  size?: SpinnerSize;
  color?: string;
  style?: ViewStyle;
  overlay?: boolean;
  text?: string;
}

const sizeMap: Record<SpinnerSize, number> = { sm: 20, md: 36, lg: 52 };

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = colors.secondary[500],
  style,
  overlay = false,
  text,
}) => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    );
    spin.start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();

    return () => { spin.stop(); pulse.stop(); };
  }, [spinAnim, pulseAnim]);

  const spinnerSize = sizeMap[size];
  const rotation = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  const spinner = (
    <Animated.View style={[{ transform: [{ rotate: rotation }, { scale }] }, style]}>
      <View style={[styles.spinner, { width: spinnerSize, height: spinnerSize }]}>
        <View style={[styles.arc, { borderColor: color, width: spinnerSize, height: spinnerSize, borderRadius: spinnerSize / 2 }]} />
        <View style={[styles.dot, { backgroundColor: color, width: spinnerSize * 0.2, height: spinnerSize * 0.2, borderRadius: spinnerSize * 0.1, top: spinnerSize * 0.05, left: (spinnerSize - spinnerSize * 0.2) / 2 }]} />
      </View>
    </Animated.View>
  );

  if (overlay) {
    return (
      <View style={styles.overlay}>
        <View style={styles.overlayContent}>
          {spinner}
          {text && <Animated.Text style={[styles.overlayText, { opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }]}>{text}</Animated.Text>}
        </View>
      </View>
    );
  }

  return spinner;
};

export const InlineSpinner: React.FC<{ size?: SpinnerSize; color?: string; style?: ViewStyle }> = ({ size = 'sm', color, style }) => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinnerSize = sizeMap[size];
  const c = color || colors.secondary[500];

  useEffect(() => {
    const spin = Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 800, useNativeDriver: true }));
    spin.start();
    return () => spin.stop();
  }, [spinAnim]);

  const rotation = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[{ width: spinnerSize, height: spinnerSize, transform: [{ rotate: rotation }] }, style]}>
      <View style={[styles.arc, { borderColor: c, width: spinnerSize, height: spinnerSize, borderRadius: spinnerSize / 2 }]} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  spinner: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  arc: { borderWidth: 2.5, borderTopColor: 'transparent', borderRightColor: 'transparent' },
  dot: { position: 'absolute' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay.dark, justifyContent: 'center', alignItems: 'center' },
  overlayContent: { backgroundColor: colors.neutral.white, borderRadius: spacing.borderRadius['2xl'], padding: spacing.aliases.xl, alignItems: 'center', ...shadows_presets_lg() },
  overlayText: { marginTop: spacing.aliases.md, color: colors.neutral[600], fontSize: 14, fontWeight: '500' },
});

function shadows_presets_lg() {
  return {
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  };
}

export default LoadingSpinner;

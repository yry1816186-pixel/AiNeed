import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { LinearGradient } from '@/src/polyfills/expo-linear-gradient';
import * as Haptics from '@/src/polyfills/expo-haptics';
import { Colors, Spacing, BorderRadius, Typography, Shadows, gradients } from '../../theme';
import { SpringConfigs, Duration } from '../../theme/tokens/animations';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'text' | 'gradient' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  hapticFeedback?: boolean;
  gradientColors?: [string, string, ...string[]];
  activeOpacity?: number;
}

const sizeConfig: Record<ButtonSize, { height: number; paddingHorizontal: number; fontSize: number; borderRadius: number }> = {
  sm: { height: 36, paddingHorizontal: Spacing.md, fontSize: Typography.sizes.sm, borderRadius: BorderRadius.lg },
  md: { height: 44, paddingHorizontal: Spacing.lg, fontSize: Typography.sizes.base, borderRadius: BorderRadius.xl },
  lg: { height: 52, paddingHorizontal: Spacing.xl, fontSize: Typography.sizes.base, borderRadius: BorderRadius.xl },
  xl: { height: 60, paddingHorizontal: Spacing['2xl'], fontSize: Typography.sizes.lg, borderRadius: BorderRadius['2xl'] },
};

const variantConfig: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: Colors.primary[500], text: Colors.neutral.white },
  secondary: { bg: Colors.neutral[100], text: Colors.primary[500] },
  outline: { bg: 'transparent', text: Colors.primary[500], border: Colors.primary[500] },
  ghost: { bg: 'transparent', text: Colors.primary[500] },
  text: { bg: 'transparent', text: Colors.sage[500] },
  gradient: { bg: 'transparent', text: Colors.neutral.white },
  danger: { bg: Colors.semantic.error, text: Colors.neutral.white },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  children,
  onPress,
  onPressIn,
  onPressOut,
  onLongPress,
  style,
  textStyle,
  hapticFeedback = true,
  gradientColors,
  activeOpacity = 0.8,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const config = sizeConfig[size];
  const vConfig = variantConfig[variant];
  const isDisabled = disabled || loading;

  const triggerHaptic = React.useCallback(() => {
    if (hapticFeedback && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [hapticFeedback]);

  const handlePressIn = React.useCallback(() => {
    triggerHaptic();
    onPressIn?.();
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      ...SpringConfigs.snappy,
    }).start();
  }, [triggerHaptic, onPressIn, scaleAnim]);

  const handlePressOut = React.useCallback(() => {
    onPressOut?.();
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      ...SpringConfigs.bouncy,
    }).start();
  }, [onPressOut, scaleAnim]);

  const handlePress = React.useCallback(() => {
    if (!isDisabled) onPress?.();
  }, [isDisabled, onPress]);

  const containerStyle: ViewStyle = {
    height: config.height,
    paddingHorizontal: config.paddingHorizontal,
    borderRadius: config.borderRadius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: isDisabled ? 0.5 : 1,
    overflow: 'hidden',
    backgroundColor: vConfig.bg,
    ...(vConfig.border ? { borderWidth: 1.5, borderColor: vConfig.border } : {}),
    ...(fullWidth ? { width: '100%' } : {}),
    ...(variant === 'primary' ? Shadows.md : {}),
  };

  const mergedTextStyle: TextStyle = {
    ...Typography.styles.button,
    fontSize: config.fontSize,
    color: vConfig.text,
    ...textStyle,
  };

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={['outline', 'ghost', 'text'].includes(variant) ? Colors.primary[500] : Colors.neutral.white}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && <>{icon}</>}
          <Text style={[mergedTextStyle, icon ? { marginHorizontal: Spacing.sm } : {}]}>
            {children}
          </Text>
          {icon && iconPosition === 'right' && <>{icon}</>}
        </>
      )}
    </>
  );

  if (variant === 'gradient') {
    const gColors = gradientColors || gradients.brand;
    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={onLongPress}
        disabled={isDisabled}
        style={({ pressed }) => [{ opacity: pressed ? activeOpacity : 1 }, fullWidth && { width: '100%' }]}
      >
        <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
          <LinearGradient colors={gColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={containerStyle}>
            {renderContent()}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onLongPress}
      disabled={isDisabled}
      style={({ pressed }) => [{ opacity: pressed ? activeOpacity : 1 }, fullWidth && { width: '100%' }]}
    >
      <Animated.View style={[containerStyle, { transform: [{ scale: scaleAnim }] }, style]}>
        {renderContent()}
      </Animated.View>
    </Pressable>
  );
};

export default Button;

import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  type TouchableOpacityProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  StyleSheet,
} from 'react-native';
import { colors, spacing, radius, typography } from '../../theme';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'text' | 'icon';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

const sizeConfig: Record<ButtonSize, { height: number; paddingHorizontal: number; fontSize: number }> = {
  small: { height: 32, paddingHorizontal: spacing.md, fontSize: 13 },
  medium: { height: 44, paddingHorizontal: spacing.lg, fontSize: 15 },
  large: { height: 52, paddingHorizontal: spacing.xl, fontSize: 16 },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  style,
  children,
  ...rest
}) => {
  const config = sizeConfig[size];
  const isDisabled = disabled || loading;

  const containerStyle = StyleSheet.flatten([
    styles.base,
    { height: config.height, paddingHorizontal: config.paddingHorizontal },
    variant === 'primary' && styles.primary,
    variant === 'secondary' && styles.secondary,
    variant === 'text' && styles.textVariant,
    variant === 'icon' && styles.iconVariant,
    isDisabled && styles.disabled,
    fullWidth && styles.fullWidth,
    style,
  ]);

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.white : colors.accent}
        />
      );
    }

    if (variant === 'icon') {
      return icon;
    }

    return (
      <>
        {icon && iconPosition === 'left' && icon}
        {typeof children === 'string' ? (
          <Text style={[styles.text, { fontSize: config.fontSize }, variant === 'primary' ? styles.primaryText : variant === 'secondary' ? styles.secondaryText : styles.textText, isDisabled && styles.disabledText]}>
            {children}
          </Text>
        ) : children}
        {icon && iconPosition === 'right' && icon}
      </>
    );
  };

  return (
    <TouchableOpacity
      style={containerStyle}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      {...rest}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  textVariant: {
    backgroundColor: 'transparent',
  },
  iconVariant: {
    backgroundColor: 'transparent',
    width: 44,
    paddingHorizontal: 0,
  },
  disabled: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontWeight: typography.button.fontWeight,
    lineHeight: typography.button.lineHeight,
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.accent,
  },
  textText: {
    color: colors.accent,
  },
  disabledText: {
    color: colors.textDisabled,
  },
});

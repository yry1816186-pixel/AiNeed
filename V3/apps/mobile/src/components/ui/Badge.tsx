import React from 'react';
import {
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  StyleSheet,
} from 'react-native';
import { colors, spacing, radius, typography } from '../../theme';
import { Text } from './Text';

type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'small' | 'medium';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: colors.gray100, text: colors.textSecondary },
  accent: { bg: colors.accent, text: colors.white },
  success: { bg: colors.success, text: colors.white },
  warning: { bg: colors.warning, text: colors.white },
  error: { bg: colors.error, text: colors.white },
  info: { bg: colors.info, text: colors.white },
};

const sizeConfig: Record<BadgeSize, { paddingHorizontal: number; paddingVertical: number; fontSize: number }> = {
  small: { paddingHorizontal: spacing.sm, paddingVertical: 2, fontSize: typography.caption.fontSize },
  medium: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, fontSize: typography.body2.fontSize },
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'medium',
  style,
  textStyle,
}) => {
  const config = sizeConfig[size];
  const variantStyle = variantColors[variant];

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: config.paddingHorizontal,
          paddingVertical: config.paddingVertical,
          backgroundColor: variantStyle.bg,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: variantStyle.text, fontSize: config.fontSize },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '500' as const,
    lineHeight: undefined,
  },
});

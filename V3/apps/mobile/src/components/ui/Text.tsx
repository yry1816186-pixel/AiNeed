import React from 'react';
import {
  Text as RNText,
  type TextProps as RNTextProps,
  type StyleProp,
  type TextStyle,
  StyleSheet,
} from 'react-native';
import { colors, typography, type TypographyVariantKey } from '../../theme';

type TextVariant = TypographyVariantKey;

interface TextProps extends Omit<RNTextProps, 'style'> {
  variant?: TextVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
  weight?: TextStyle['fontWeight'];
  style?: StyleProp<TextStyle>;
}

const variantStyles: Record<TextVariant, TextStyle> = {
  h1: {
    fontSize: typography.h1.fontSize,
    fontWeight: typography.h1.fontWeight,
    lineHeight: typography.h1.lineHeight,
  },
  h2: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    lineHeight: typography.h2.lineHeight,
  },
  h3: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    lineHeight: typography.h3.lineHeight,
  },
  body: {
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    lineHeight: typography.body.lineHeight,
  },
  body2: {
    fontSize: typography.body2.fontSize,
    fontWeight: typography.body2.fontWeight,
    lineHeight: typography.body2.lineHeight,
  },
  bodySmall: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: typography.bodySmall.fontWeight,
    lineHeight: typography.bodySmall.lineHeight,
  },
  caption: {
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
    lineHeight: typography.caption.lineHeight,
  },
  overline: {
    fontSize: typography.overline.fontSize,
    fontWeight: typography.overline.fontWeight,
    lineHeight: typography.overline.lineHeight,
    letterSpacing: typography.overline.letterSpacing,
  },
  button: {
    fontSize: typography.button.fontSize,
    fontWeight: typography.button.fontWeight,
    lineHeight: typography.button.lineHeight,
  },
  buttonSmall: {
    fontSize: typography.buttonSmall.fontSize,
    fontWeight: typography.buttonSmall.fontWeight,
    lineHeight: typography.buttonSmall.lineHeight,
  },
};

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color,
  align,
  weight,
  style,
  children,
  ...rest
}) => {
  return (
    <RNText
      style={[
        styles.base,
        variantStyles[variant],
        color ? { color } : undefined,
        align ? { textAlign: align } : undefined,
        weight ? { fontWeight: weight } : undefined,
        style,
      ]}
      accessibilityRole="text"
      {...rest}
    >
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  base: {
    color: colors.textPrimary,
  },
});

import React, { useState, useRef } from 'react';
import {
  TextInput,
  View,
  Text,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  StyleSheet,
  type TextInput as TextInputType,
} from 'react-native';
import { colors, spacing, radius, typography, shadows } from '../../theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  onRef?: (ref: TextInputType | null) => void;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightElement,
  containerStyle,
  inputStyle,
  onRef,
  editable = true,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInputType | null>(null);

  const handleRef = (ref: TextInputType | null) => {
    inputRef.current = ref;
    onRef?.(ref);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrapper,
          isFocused ? styles.inputWrapperFocused : undefined,
          error ? styles.inputWrapperError : undefined,
          !editable ? styles.inputWrapperDisabled : undefined,
        ]}
      >
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}
        <TextInput
          ref={handleRef}
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : undefined,
            rightElement ? styles.inputWithRightElement : undefined,
            !editable ? styles.inputDisabled : undefined,
            inputStyle,
          ]}
          placeholderTextColor={colors.textTertiary}
          onFocus={(e) => {
            setIsFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            rest.onBlur?.(e);
          }}
          editable={editable}
          {...rest}
        />
        {rightElement && <View style={styles.rightElementContainer}>{rightElement}</View>}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.body2.fontSize,
    fontWeight: '500' as const,
    color: colors.textPrimary,
    lineHeight: typography.body2.lineHeight,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    height: 48,
    ...shadows.input,
  },
  inputWrapperFocused: {
    borderColor: colors.accent,
    borderWidth: 1.5,
  },
  inputWrapperError: {
    borderColor: colors.error,
  },
  inputWrapperDisabled: {
    backgroundColor: colors.gray50,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: spacing.lg,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    lineHeight: typography.body.lineHeight,
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.sm,
  },
  inputWithRightElement: {
    paddingRight: spacing.sm,
  },
  inputDisabled: {
    color: colors.textDisabled,
  },
  leftIconContainer: {
    paddingLeft: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightElementContainer: {
    paddingRight: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: typography.caption.fontSize,
    color: colors.error,
    lineHeight: typography.caption.lineHeight,
    marginLeft: spacing.lg,
  },
});

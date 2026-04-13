import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
  TextInputProps,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import * as Haptics from '@/src/polyfills/expo-haptics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export type InputVariant = 'outlined' | 'filled' | 'underline';
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  variant?: InputVariant;
  size?: InputSize;
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  leftIconName?: keyof typeof Ionicons.glyphMap;
  rightIconName?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  disabled?: boolean;
  required?: boolean;
  hapticFeedback?: boolean;
}

const sizeConfig: Record<InputSize, { height: number; fontSize: number; paddingHorizontal: number }> = {
  sm: { height: 40, fontSize: typography.fontSize.sm, paddingHorizontal: spacing.aliases.md },
  md: { height: 48, fontSize: typography.fontSize.base, paddingHorizontal: spacing.aliases.lg },
  lg: { height: 56, fontSize: typography.fontSize.base, paddingHorizontal: spacing.aliases.xl },
};

export const Input: React.FC<InputProps> = ({
  variant = 'outlined',
  size = 'md',
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  leftIconName,
  rightIconName,
  onRightIconPress,
  containerStyle,
  inputStyle,
  disabled = false,
  required = false,
  hapticFeedback = true,
  onFocus,
  onBlur,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const [hasValue, setHasValue] = React.useState(!!textInputProps.value || !!textInputProps.defaultValue);

  const labelAnim = React.useRef(new Animated.Value(hasValue || isFocused ? 1 : 0)).current;
  const borderAnim = React.useRef(new Animated.Value(0)).current;
  const shakeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(labelAnim, { toValue: isFocused || hasValue ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [isFocused, hasValue, labelAnim]);

  React.useEffect(() => {
    Animated.timing(borderAnim, { toValue: isFocused ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [isFocused, borderAnim]);

  React.useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      if (hapticFeedback && Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [error, shakeAnim, hapticFeedback]);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (hapticFeedback && Platform.OS !== 'web') Haptics.selectionAsync();
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleChangeText = (text: string) => {
    setHasValue(!!text);
    textInputProps.onChangeText?.(text);
  };

  const config = sizeConfig[size];
  const borderColor = error ? colors.semantic.error : isFocused ? colors.primary[500] : colors.neutral[200];

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'outlined':
        return { borderWidth: 1.5, borderColor, backgroundColor: colors.neutral.white, borderRadius: spacing.borderRadius.xl };
      case 'filled':
        return { borderWidth: 0, backgroundColor: isFocused ? colors.neutral[100] : colors.neutral[50], borderRadius: spacing.borderRadius.xl };
      case 'underline':
        return { borderWidth: 0, borderBottomWidth: 1.5, borderColor, backgroundColor: 'transparent', borderRadius: 0 };
      default:
        return {};
    }
  };

  const labelStyle: any = {
    position: 'absolute',
    left: config.paddingHorizontal + (leftIcon || leftIconName ? 32 : 0),
    top: labelAnim.interpolate({ inputRange: [0, 1], outputRange: [config.height / 2 - 8, 6] }),
    fontSize: labelAnim.interpolate({ inputRange: [0, 1], outputRange: [config.fontSize, 12] }),
    color: labelAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.neutral[400], error ? colors.semantic.error : colors.primary[500]] }),
    backgroundColor: variant === 'outlined' ? colors.neutral.white : 'transparent',
    paddingHorizontal: labelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }),
    fontWeight: '500',
    zIndex: 1,
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: shakeAnim }] }, containerStyle]}>
      {label && (
        <Animated.Text style={labelStyle}>
          {label}{required && <Text style={styles.required}> *</Text>}
        </Animated.Text>
      )}
      <View style={[styles.inputContainer, { height: config.height }, getVariantStyle()]}>
        {(leftIcon || leftIconName) && (
          <View style={styles.leftIconContainer}>
            {leftIcon || <Ionicons name={leftIconName!} size={20} color={isFocused ? colors.primary[500] : colors.neutral[400]} />}
          </View>
        )}
        <TextInput
          {...textInputProps}
          style={StyleSheet.flatten([
            styles.input,
            { fontSize: config.fontSize, paddingHorizontal: config.paddingHorizontal, paddingTop: label ? spacing.aliases.md : 0 },
            leftIcon || leftIconName ? { paddingLeft: 0 } : null,
            rightIcon || rightIconName ? { paddingRight: 0 } : null,
            disabled && styles.disabled,
            inputStyle,
          ])}
          placeholderTextColor={colors.neutral[400]}
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChangeText={handleChangeText}
        />
        {(rightIcon || rightIconName) && (
          <Pressable onPress={onRightIconPress} style={styles.rightIconContainer} disabled={!onRightIconPress}>
            {rightIcon || <Ionicons name={rightIconName!} size={20} color={onRightIconPress ? colors.neutral[600] : colors.neutral[400]} />}
          </Pressable>
        )}
      </View>
      {(error || hint) && (
        <View style={styles.hintContainer}>
          <Text style={[styles.hintText, error && styles.errorText]}>{error || hint}</Text>
        </View>
      )}
    </Animated.View>
  );
};

export interface SearchInputProps extends Omit<InputProps, 'leftIconName' | 'variant'> {
  onClear?: () => void;
  showClearButton?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({ onClear, showClearButton = true, value, ...props }) => (
  <Input
    variant="filled"
    leftIconName="search"
    placeholder="搜索..."
    {...props}
    value={value}
    rightIconName={value && showClearButton ? 'close-circle' : undefined}
    onRightIconPress={onClear}
    containerStyle={StyleSheet.flatten([{ backgroundColor: colors.neutral[100], borderRadius: spacing.borderRadius.xl }, props.containerStyle])}
    inputStyle={{ backgroundColor: 'transparent' }}
  />
);

const styles = StyleSheet.create({
  container: { marginBottom: spacing.aliases.lg },
  required: { color: colors.semantic.error },
  inputContainer: { flexDirection: 'row', alignItems: 'center', overflow: 'visible' },
  input: { flex: 1, color: colors.neutral[900], fontWeight: '400' },
  leftIconContainer: { paddingLeft: spacing.aliases.lg, justifyContent: 'center' },
  rightIconContainer: { paddingRight: spacing.aliases.lg, justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  hintContainer: { marginTop: spacing.scale[1], paddingHorizontal: spacing.scale[1] },
  hintText: { fontSize: 12, color: colors.neutral[500] },
  errorText: { color: colors.semantic.error },
});

export default Input;

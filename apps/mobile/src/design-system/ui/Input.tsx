/**
 * Input - UI layer re-export with extended theme tokens
 *
 * This file provides the UI-layer Input with additional theme tokens.
 * Core animation logic uses Reanimated (native driver enabled).
 */
import React from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  Pressable,
  Platform,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  interpolateColor,
} from "react-native-reanimated";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import * as Haptics from "@/src/polyfills/expo-haptics";
import { Colors, Spacing, BorderRadius, Typography } from '../../design-system/theme';
import { SpringConfigs } from "../../theme/tokens/animations";

// Re-export from primitives for backward compatibility
export {
  Input as PrimitiveInput,
  SearchInput as PrimitiveSearchInput,
} from "../../design-system/primitives/Input";
export type {
  InputProps as PrimitiveInputProps,
  SearchInputProps as PrimitiveSearchInputProps,
  InputVariant as PrimitiveInputVariant,
  InputSize as PrimitiveInputSize,
} from "../../design-system/primitives/Input";

export type InputVariant = "outlined" | "filled" | "underline";
export type InputSize = "sm" | "md" | "lg";

export interface InputProps extends Omit<TextInputProps, "style"> {
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

const sizeConfig: Record<
  InputSize,
  { height: number; fontSize: number; paddingHorizontal: number }
> = {
  sm: { height: 40, fontSize: Typography.sizes.sm, paddingHorizontal: Spacing.md },
  md: { height: 48, fontSize: Typography.sizes.base, paddingHorizontal: Spacing.lg },
  lg: { height: 56, fontSize: Typography.sizes.base, paddingHorizontal: Spacing.xl },
};

export const Input: React.FC<InputProps> = ({
  variant = "outlined",
  size = "md",
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
  const [hasValue, setHasValue] = React.useState(
    !!textInputProps.value || !!textInputProps.defaultValue
  );

  // Reanimated shared values - all support native driver
  const labelProgress = useSharedValue(hasValue || isFocused ? 1 : 0);
  const shakeTranslateX = useSharedValue(0);

  // Label animation with SpringConfigs.gentle
  React.useEffect(() => {
    labelProgress.value = withSpring(isFocused || hasValue ? 1 : 0, SpringConfigs.gentle);
  }, [isFocused, hasValue]);

  // Shake animation on error - native driver via transform
  React.useEffect(() => {
    if (error) {
      shakeTranslateX.value = withSequence(
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      if (hapticFeedback && Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [error, hapticFeedback]);

  const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(true);
    if (hapticFeedback && Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    onFocus?.(e);
  };

  const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleChangeText = (text: string) => {
    setHasValue(!!text);
    textInputProps.onChangeText?.(text);
  };

  const config = sizeConfig[size];

  // Label animated style - uses transform for native driver
  const labelAnimatedStyle = useAnimatedStyle(() => {
    const progress = labelProgress.value;
    const translateY = interpolate(progress, [0, 1], [config.height / 2 - 8, 6]);
    const scale = interpolate(progress, [0, 1], [1, 12 / config.fontSize]);
    const color = interpolateColor(
      progress,
      [0, 1],
      [Colors.neutral[400], error ? Colors.semantic.error : Colors.primary[500]]
    );
    const paddingHorizontal = interpolate(progress, [0, 1], [0, 4]);

    return {
      transform: [{ translateY }, { scale }],
      color,
      paddingHorizontal,
    };
  });

  // Container shake animated style
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeTranslateX.value }],
  }));

  const borderColor = error
    ? Colors.semantic.error
    : isFocused
    ? Colors.primary[500]
    : Colors.neutral[200];

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case "outlined":
        return {
          borderWidth: 1.5,
          borderColor,
          backgroundColor: Colors.neutral.white,
          borderRadius: BorderRadius.xl,
        };
      case "filled":
        return {
          borderWidth: 0,
          backgroundColor: isFocused ? Colors.neutral[100] : Colors.neutral[50],
          borderRadius: BorderRadius.xl,
        };
      case "underline":
        return {
          borderWidth: 0,
          borderBottomWidth: 1.5,
          borderColor,
          backgroundColor: "transparent",
          borderRadius: 0,
        };
      default:
        return {};
    }
  };

  return (
    <Animated.View
      style={[styles.container, containerAnimatedStyle, containerStyle]}
    >
      {label && (
        <Animated.Text style={[styles.label, labelAnimatedStyle]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Animated.Text>
      )}
      <View style={[styles.inputContainer, { height: config.height }, getVariantStyle()]}>
        {(leftIcon || leftIconName) && (
          <View style={styles.leftIconContainer}>
            {leftIcon || (
              <Ionicons
                name={leftIconName!}
                size={20}
                color={isFocused ? Colors.primary[500] : Colors.neutral[400]}
              />
            )}
          </View>
        )}
        <TextInput
          {...textInputProps}
          style={StyleSheet.flatten([
            styles.input,
            {
              fontSize: config.fontSize,
              paddingHorizontal: config.paddingHorizontal,
              paddingTop: label ? Spacing.md : 0,
            },
            leftIcon || leftIconName ? { paddingLeft: 0 } : null,
            rightIcon || rightIconName ? { paddingRight: 0 } : null,
            disabled && styles.disabled,
            inputStyle,
          ])}
          placeholderTextColor={Colors.neutral[400]}
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChangeText={handleChangeText}
        />
        {(rightIcon || rightIconName) && (
          <Pressable
            onPress={onRightIconPress}
            style={styles.rightIconContainer}
            disabled={!onRightIconPress}
          >
            {rightIcon || (
              <Ionicons
                name={rightIconName!}
                size={20}
                color={onRightIconPress ? Colors.neutral[600] : Colors.neutral[400]}
              />
            )}
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

export interface SearchInputProps extends Omit<InputProps, "leftIconName" | "variant"> {
  onClear?: () => void;
  showClearButton?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  onClear,
  showClearButton = true,
  value,
  ...props
}) => (
  <Input
    variant="filled"
    leftIconName="search"
    placeholder="搜索..."
    {...props}
    value={value}
    rightIconName={value && showClearButton ? "close-circle" : undefined}
    onRightIconPress={onClear}
    containerStyle={StyleSheet.flatten([
      { backgroundColor: Colors.neutral[100], borderRadius: BorderRadius.xl },
      props.containerStyle,
    ])}
    inputStyle={{ backgroundColor: "transparent" }}
  />
);

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.lg },
  label: { position: "absolute", left: 0, fontWeight: "500", zIndex: 1, backgroundColor: "transparent" },
  required: { color: Colors.semantic.error },
  inputContainer: { flexDirection: "row", alignItems: "center", overflow: "visible" },
  input: { flex: 1, color: Colors.neutral[900], fontWeight: "400" },
  leftIconContainer: { paddingLeft: Spacing.lg, justifyContent: "center" },
  rightIconContainer: { paddingRight: Spacing.lg, justifyContent: "center" },
  disabled: { opacity: 0.5 },
  hintContainer: { marginTop: Spacing[1], paddingHorizontal: Spacing[1] },
  hintText: { fontSize: 12, color: Colors.neutral[500] },
  errorText: { color: Colors.semantic.error },
});

export default Input;

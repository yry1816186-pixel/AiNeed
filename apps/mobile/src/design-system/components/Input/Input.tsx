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
} from "react-native-reanimated";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import * as Haptics from "@/src/polyfills/expo-haptics";
import { useTheme } from "../../theme/themeStore";
import { semanticTokens } from "../../theme/tokens/generated/semantic-tokens";
import { componentTokens } from "../../theme/tokens/generated/component-tokens";
import { SpringConfigs, Duration } from "../../theme/tokens/animations";

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
  accessibilityLabel?: string;
}

const sizeConfig: Record<
  InputSize,
  { height: number; fontSize: number; paddingHorizontal: number }
> = {
  sm: {
    height: 40,
    fontSize: semanticTokens.typography.body.small.fontSize,
    paddingHorizontal: 12,
  },
  md: {
    height: 48,
    fontSize: semanticTokens.typography.body.default.fontSize,
    paddingHorizontal: 16,
  },
  lg: {
    height: 56,
    fontSize: semanticTokens.typography.body.default.fontSize,
    paddingHorizontal: 20,
  },
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
  accessibilityLabel,
  onFocus,
  onBlur,
  ...textInputProps
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = React.useState(false);
  const [hasValue, setHasValue] = React.useState(
    !!textInputProps.value || !!textInputProps.defaultValue
  );

  const labelProgress = useSharedValue(hasValue || isFocused ? 1 : 0);
  const shakeTranslateX = useSharedValue(0);
  const config = sizeConfig[size];
  const inputTokens = theme.components.input;

  React.useEffect(() => {
    labelProgress.value = withSpring(isFocused || hasValue ? 1 : 0, SpringConfigs.gentle);
  }, [isFocused, hasValue]);

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
    if (hapticFeedback && Platform.OS !== "web") Haptics.selectionAsync();
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

  const borderColor = error
    ? (inputTokens.error.border as string)
    : isFocused
    ? (inputTokens.focused.border as string)
    : (inputTokens.default.border as string);

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case "outlined":
        return {
          borderWidth: 1.5,
          borderColor,
          backgroundColor: inputTokens.default.background as string,
          borderRadius: semanticTokens.radius.input.default,
        };
      case "filled":
        return {
          borderWidth: 0,
          backgroundColor: isFocused
            ? (inputTokens.focused.border as string) + "10"
            : (inputTokens.default.background as string),
          borderRadius: semanticTokens.radius.input.default,
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

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeTranslateX.value }],
  }));

  const iconColor = isFocused ? theme.colors.interactive.primary : theme.colors.text.tertiary;

  return (
    <Animated.View
      style={[
        { marginBottom: semanticTokens.spacing.list.gap },
        containerAnimatedStyle,
        containerStyle,
      ]}
    >
      {label && (
        <Text
          style={{
            fontSize: semanticTokens.typography.caption.fontSize,
            fontWeight: "500",
            color: error ? theme.colors.status.error : theme.colors.text.secondary,
            marginBottom: 4,
          }}
        >
          {label}
          {required && <Text style={{ color: theme.colors.status.error }}> *</Text>}
        </Text>
      )}
      <View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            height: config.height,
            overflow: "visible",
          },
          getVariantStyle(),
        ]}
      >
        {(leftIcon || leftIconName) && (
          <View style={{ paddingLeft: 16, justifyContent: "center" }}>
            {leftIcon || <Ionicons name={leftIconName!} size={20} color={iconColor} />}
          </View>
        )}
        <TextInput
          {...textInputProps}
          style={StyleSheet.flatten(
            [
              {
                flex: 1,
                color: disabled
                  ? (inputTokens.disabled.text as string)
                  : (inputTokens.default.text as string),
                fontWeight: "400",
                fontSize: config.fontSize,
                paddingHorizontal: config.paddingHorizontal,
              },
              leftIcon || leftIconName ? { paddingLeft: 0 } : undefined,
              rightIcon || rightIconName ? { paddingRight: 0 } : undefined,
              disabled ? { opacity: 0.5 } : undefined,
              inputStyle,
            ].filter(Boolean) as any
          )}
          placeholderTextColor={inputTokens.default.placeholder as string}
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChangeText={handleChangeText}
          accessibilityLabel={accessibilityLabel}
        />
        {(rightIcon || rightIconName) && (
          <Pressable
            onPress={onRightIconPress}
            style={{ paddingRight: 16, justifyContent: "center" }}
            disabled={!onRightIconPress}
          >
            {rightIcon || (
              <Ionicons
                name={rightIconName!}
                size={20}
                color={onRightIconPress ? theme.colors.text.secondary : theme.colors.text.tertiary}
              />
            )}
          </Pressable>
        )}
      </View>
      {(error || hint) && (
        <View style={{ marginTop: 4, paddingHorizontal: 4 }}>
          <Text
            style={{
              fontSize: semanticTokens.typography.caption.fontSize,
              color: error ? theme.colors.status.error : theme.colors.text.tertiary,
            }}
          >
            {error || hint}
          </Text>
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
}) => {
  return (
    <Input
      variant="filled"
      leftIconName="search"
      placeholder="搜索..."
      {...props}
      value={value}
      rightIconName={value && showClearButton ? "close-circle" : undefined}
      onRightIconPress={onClear}
    />
  );
};

export default Input;

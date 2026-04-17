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
import { Colors, Spacing, BorderRadius, SpringConfigs, Duration, DesignTokens } from '../../theme';

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
  sm: { height: DesignTokens.spacing[10], fontSize: DesignTokens.typography.sizes.base, paddingHorizontal: Spacing[3] },
  md: { height: Spacing['2xl'], fontSize: DesignTokens.typography.sizes.md, paddingHorizontal: Spacing[4] },
  lg: { height: 56, fontSize: DesignTokens.typography.sizes.md, paddingHorizontal: Spacing[5] },
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

  // Update label animation with SpringConfigs.gentle
  React.useEffect(() => {
    labelProgress.value = withSpring(isFocused || hasValue ? 1 : 0, SpringConfigs.gentle);
  }, [isFocused, hasValue]);

  // Shake animation on error - uses native driver via transform
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

  // Label animated style - uses transform for translateY and scale to enable native driver
  const labelAnimatedStyle = useAnimatedStyle(() => {
    const progress = labelProgress.value;
    // Use translateY transform instead of top layout property
    const translateY = interpolate(progress, [0, 1], [config.height / 2 - 8, 6]);
    // Use scale transform for font size change
    const scale = interpolate(progress, [0, 1], [1, 12 / config.fontSize]);
    const color = interpolateColor(
      progress,
      [0, 1],
      [Colors.neutral[400], error ? Colors.error[500] : Colors.primary[500]]
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

  const getBorderColor = () => {
    if (error) {
      return Colors.error[500];
    }
    if (isFocused) {
      return Colors.primary[500];
    }
    return Colors.neutral[200];
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case "outlined":
        return {
          borderWidth: 1.5,
          borderColor: getBorderColor(),
          backgroundColor: Colors.white,
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
          borderColor: getBorderColor(),
          backgroundColor: "transparent",
          borderRadius: 0,
        };
      default:
        return {};
    }
  };

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle, containerStyle]}>
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
              paddingTop: label ? Spacing[3] : 0,
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
      containerStyle={StyleSheet.flatten([
        { backgroundColor: Colors.neutral[100], borderRadius: BorderRadius.xl },
        props.containerStyle,
      ])}
      inputStyle={{ backgroundColor: "transparent" }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing[4],
  },
  label: {
    position: "absolute",
    left: 0,
    fontWeight: "500",
    zIndex: 1,
    backgroundColor: "transparent",
  },
  required: {
    color: Colors.error[500],
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    overflow: "visible",
  },
  input: {
    flex: 1,
    color: Colors.neutral[900],
    fontWeight: "400",
  },
  leftIconContainer: {
    paddingLeft: Spacing[4],
    justifyContent: "center",
  },
  rightIconContainer: {
    paddingRight: Spacing[4],
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.5,
  },
  hintContainer: {
    marginTop: Spacing[1],
    paddingHorizontal: Spacing[1],
  },
  hintText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: Colors.neutral[500],
  },
  errorText: {
    color: Colors.error[500],
  },
});

export default Input;

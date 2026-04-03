import React from "react";
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
} from "react-native";
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import * as Haptics from '@/src/polyfills/expo-haptics';
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  Shadows,
} from "../../../theme";
import { SpringConfigs, Duration } from "../../../theme/tokens/animations";

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
  sm: { height: 40, fontSize: 14, paddingHorizontal: Spacing[3] },
  md: { height: 48, fontSize: 16, paddingHorizontal: Spacing[4] },
  lg: { height: 56, fontSize: 16, paddingHorizontal: Spacing[5] },
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
    !!textInputProps.value || !!textInputProps.defaultValue,
  );

  const labelAnim = React.useRef(
    new Animated.Value(hasValue || isFocused ? 1 : 0),
  ).current;
  const borderAnim = React.useRef(new Animated.Value(0)).current;
  const shakeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(labelAnim, {
      toValue: isFocused || hasValue ? 1 : 0,
      duration: Duration.fast,
      useNativeDriver: false,
    }).start();
  }, [isFocused, hasValue, labelAnim]);

  React.useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: isFocused ? 1 : 0,
      duration: Duration.fast,
      useNativeDriver: false,
    }).start();
  }, [isFocused, borderAnim]);

  React.useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();

      if (hapticFeedback && Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [error, shakeAnim, hapticFeedback]);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (hapticFeedback && Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
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

  const getBorderColor = () => {
    if (error) return Colors.error[500];
    if (isFocused) return Colors.primary[500];
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

  const labelStyle: Animated.AnimatedProps<TextStyle> = {
    position: "absolute",
    left: config.paddingHorizontal + (leftIcon || leftIconName ? 32 : 0),
    top: labelAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [config.height / 2 - 8, 6],
    }),
    fontSize: labelAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [config.fontSize, 12],
    }),
    color: labelAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [
        Colors.neutral[400],
        error ? Colors.error[500] : Colors.primary[500],
      ],
    }),
    backgroundColor: variant === "outlined" ? Colors.white : "transparent",
    paddingHorizontal: labelAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 4],
    }),
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateX: shakeAnim }] },
        containerStyle,
      ]}
    >
      {label && (
        <Animated.Text style={[styles.label, labelStyle]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Animated.Text>
      )}

      <View
        style={[
          styles.inputContainer,
          { height: config.height },
          getVariantStyle(),
        ]}
      >
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
                color={
                  onRightIconPress ? Colors.neutral[600] : Colors.neutral[400]
                }
              />
            )}
          </Pressable>
        )}
      </View>

      {(error || hint) && (
        <View style={styles.hintContainer}>
          <Text style={[styles.hintText, error && styles.errorText]}>
            {error || hint}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

export interface SearchInputProps extends Omit<
  InputProps,
  "leftIconName" | "variant"
> {
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
    fontWeight: "500",
    zIndex: 1,
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
    fontSize: 12,
    color: Colors.neutral[500],
  },
  errorText: {
    color: Colors.error[500],
  },
});

export default Input;

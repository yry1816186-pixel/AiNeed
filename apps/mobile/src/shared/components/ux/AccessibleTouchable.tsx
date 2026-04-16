import React, { memo } from "react";
import { DesignTokens } from "../../../design-system/theme";
import {
  TouchableOpacity,
  TouchableWithoutFeedback,
  TouchableHighlight,
  Pressable,
  ViewStyle,
  GestureResponderEvent,
  AccessibilityRole,
} from "react-native";

type TouchableType = "opacity" | "highlight" | "without-feedback" | "pressable";

interface AccessibleTouchableProps {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  onPressIn?: (event: GestureResponderEvent) => void;
  onPressOut?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  accessibilityLabel: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityHint?: string;
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean;
    busy?: boolean;
    expanded?: boolean;
  };
  touchableType?: TouchableType;
  activeOpacity?: number;
  underlayColor?: string;
  style?: ViewStyle;
  hitSlop?: number | { top: number; bottom: number; left: number; right: number };
  testID?: string;
}

export const AccessibleTouchable = memo(function AccessibleTouchable({
  children,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  disabled = false,
  accessibilityLabel,
  accessibilityRole = "button",
  accessibilityHint,
  accessibilityState,
  touchableType = "opacity",
  activeOpacity = 0.7,
  underlayColor,
  style,
  hitSlop,
  testID,
}: AccessibleTouchableProps) {
  const accessibilityProps = {
    accessibilityLabel,
    accessibilityRole,
    accessibilityHint,
    accessibilityState: { disabled, ...accessibilityState },
    testID,
  };

  const commonProps = {
    onPress,
    onLongPress,
    onPressIn,
    onPressOut,
    disabled,
    hitSlop:
      typeof hitSlop === "number"
        ? { top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }
        : hitSlop,
    style,
  };

  switch (touchableType) {
    case "highlight":
      return (
        <TouchableHighlight
          {...commonProps}
          {...accessibilityProps}
          underlayColor={underlayColor || DesignTokens.colors.borders.default}
          activeOpacity={activeOpacity}
        >
          {children as React.ReactElement}
        </TouchableHighlight>
      );

    case "without-feedback":
      return (
        <TouchableWithoutFeedback {...commonProps} {...accessibilityProps}>
          {children as React.ReactElement}
        </TouchableWithoutFeedback>
      );

    case "pressable":
      return (
        <Pressable
          {...commonProps}
          {...accessibilityProps}
          accessibilityState={accessibilityProps.accessibilityState}
        >
          {children}
        </Pressable>
      );

    case "opacity":
    default:
      return (
        <TouchableOpacity {...commonProps} {...accessibilityProps} activeOpacity={activeOpacity}>
          {children}
        </TouchableOpacity>
      );
  }
});

export default AccessibleTouchable;

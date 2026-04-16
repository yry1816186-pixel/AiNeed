import React from "react";
import { View, ViewStyle } from "react-native";
import { Colors, Spacing } from '../../design-system/theme';

export interface DividerProps {
  style?: ViewStyle;
  variant?: "solid" | "dashed";
}

export const Divider: React.FC<DividerProps> = ({ style, variant = "solid" }) => {
  return (
    <View
      style={[
        {
          height: 1,
          backgroundColor: variant === "solid" ? Colors.neutral[200] : "transparent",
          marginVertical: Spacing.lg,
          borderStyle: variant === "dashed" ? "dashed" : "solid",
          borderTopWidth: variant === "dashed" ? 1 : 0,
          borderTopColor: Colors.neutral[200],
        },
        style,
      ]}
    />
  );
};

export default Divider;

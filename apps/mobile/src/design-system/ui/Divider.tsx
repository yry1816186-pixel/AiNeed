import React from "react";
import { View, ViewStyle } from "react-native";
import { Colors, Spacing } from "../../design-system/theme";
import { flatColors as colors } from "../theme";

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
          backgroundColor: variant === "solid" ? colors.neutral[200] : "transparent",
          marginVertical: Spacing.lg,
          borderStyle: variant === "dashed" ? "dashed" : "solid",
          borderTopWidth: variant === "dashed" ? 1 : 0,
          borderTopColor: colors.neutral[200],
        },
        style,
      ]}
    />
  );
};

export default Divider;

import React from "react";
import { View, ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { DesignTokens } from "../theme/tokens/design-tokens";

export type YiyiAvatarSize = "sm" | "md" | "lg";
export interface YiyiAvatarProps {
  size?: YiyiAvatarSize;
  style?: ViewStyle;
}
const s: Record<YiyiAvatarSize, number> = { sm: 32, md: 48, lg: 64 };

export const YiyiAvatar: React.FC<YiyiAvatarProps> = ({ size = "md", style }) => {
  const d = s[size];
  return (
    <View
      style={[
        {
          width: d,
          height: d,
          borderRadius: d / 2,
          backgroundColor: DesignTokens.colors.xuno.warmCamel,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Svg width={d * 0.5} height={d * 0.5} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2C11.17 2 10.5 2.67 10.5 3.5C10.5 4.07 10.84 4.56 11.33 4.82L7 9H5L12 16L19 9H17L12.67 4.82C13.16 4.56 13.5 4.07 13.5 3.5C13.5 2.67 12.83 2 12 2ZM5.5 17H18.5V19H5.5V17Z"
          fill="white"
          opacity={0.9}
        />
      </Svg>
    </View>
  );
};

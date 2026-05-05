import React from "react";
import { View, Text, StyleSheet, Platform, ViewStyle } from "react-native";
import { useThemeTokens } from "../../theme/useThemeTokens";

export type LogoVariant = "horizontal" | "square";

export interface LogoPlaceholderProps {
  variant?: LogoVariant;
  style?: ViewStyle;
}

const SIZE_PRESETS: Record<LogoVariant, { width: number; height: number }> = {
  horizontal: { width: 200, height: 60 },
  square: { width: 120, height: 120 },
};

/**
 * 占位 Logo 组件 — 需设计确认后替换
 *
 * 根据 theme 自动切换深浅色，使用品牌配色和系统字体渲染文字占位 Logo。
 * 正式上线前应由设计师提供矢量 Logo 资源替换本组件。
 */
export const LogoPlaceholder: React.FC<LogoPlaceholderProps> = ({
  variant = "horizontal",
  style,
}) => {
  const { isDark, colors } = useThemeTokens();
  const { width, height } = SIZE_PRESETS[variant];

  const isSquare = variant === "square";

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: isSquare ? 28 : 12,
          backgroundColor: colors.primaryLight,
          borderWidth: 2,
          borderColor: colors.primary,
          borderStyle: "dashed",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        },
        style,
      ]}
      accessibilityLabel="Logo"
      accessibilityRole="image"
    >
      <Text
        style={{
          fontSize: isSquare ? 36 : 22,
          fontWeight: "700",
          color: colors.primary,
          fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
          textAlign: "center",
          letterSpacing: 2,
        }}
      >
        {isSquare ? "寻" : "寻裳"}
      </Text>
      {!isSquare && (
        <Text
          style={{
            fontSize: 10,
            fontWeight: "400",
            color: colors.textSecondary,
            fontFamily: Platform.select({ ios: "System", android: "sans-serif" }),
            textAlign: "center",
            letterSpacing: 4,
            marginTop: 2,
          }}
        >
          XUNO
        </Text>
      )}
    </View>
  );
};

export default LogoPlaceholder;

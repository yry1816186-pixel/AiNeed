import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Rect, Text as SvgText, Path, G } from "react-native-svg";
import { colors } from "../../theme/tokens/colors";
import { typography } from "../../theme/tokens/typography";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { useTheme, createStyles } from '../../contexts/ThemeContext';

export interface ColorPaletteProps {
  colors: { name: string; hex: string; label?: string }[];
  columns?: number;
  blockSize?: number;
  gap?: number;
  showLabel?: boolean;
  type?: "best" | "avoid" | "neutral";
  accessibilityLabel?: string;
}

const CheckPath = "M4 8.5L7 11.5L12 5.5";
const CrossPath = "M5 5L11 11M11 5L5 11";

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  colors: paletteColors,
  columns = 4,
  blockSize = 44,
  gap = 8,
  showLabel = true,
  type = "neutral",
  accessibilityLabel,
}) => {
  const e_styles = use_styles(colors);
  const { colors } = useTheme();
  const _styles = use_styles(colors);
  const defaultA11yLabel =
    accessibilityLabel ||
    `${type === "best" ? "推荐" : type === "avoid" ? "避免" : ""}色彩 ${paletteColors
      .map((c) => c.name)
      .join(", ")}`;

  const indicatorSize = 16;
  const labelHeight = showLabel ? 18 : 0;
  const itemHeight = blockSize + (showLabel ? gap + labelHeight : 0);

  const renderIndicator = (x: number, y: number) => {
    if (type === "best") {
      return (
        <G>
          <Rect
            x={x + blockSize - indicatorSize - 2}
            y={y + 2}
            width={indicatorSize}
            height={indicatorSize}
            rx={indicatorSize / 2}
            ry={indicatorSize / 2}
            fill={colors.brand.warmPrimary}
          />
          <Path
            d={CheckPath}
            x={x + blockSize - indicatorSize - 2}
            y={y + 2}
            fill="none"
            stroke={colors.surface}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      );
    }
    if (type === "avoid") {
      return (
        <G>
          <Rect
            x={x + blockSize - indicatorSize - 2}
            y={y + 2}
            width={indicatorSize}
            height={indicatorSize}
            rx={indicatorSize / 2}
            ry={indicatorSize / 2}
            fill="rgba(0,0,0,0.5)"
          />
          <Path
            d={CrossPath}
            x={x + blockSize - indicatorSize - 2}
            y={y + 2}
            fill="none"
            stroke={colors.surface}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </G>
      );
    }
    return null;
  };

  const totalWidth = columns * blockSize + (columns - 1) * gap;
  const totalHeight =
    Math.ceil(paletteColors.length / columns) * itemHeight +
    (Math.ceil(paletteColors.length / columns) - 1) * gap;

  return (
    <View accessible={true} accessibilityLabel={defaultA11yLabel} accessibilityRole="list">
      <Svg width={totalWidth} height={totalHeight}>
        {paletteColors.map((item, index) => {
          const col = index % columns;
          const row = Math.floor(index / columns);
          const x = col * (blockSize + gap);
          const y = row * (itemHeight + gap);

          return (
            <G key={item.hex + index}>
              <Rect
                x={x}
                y={y}
                width={blockSize}
                height={blockSize}
                rx={8}
                ry={8}
                fill={item.hex}
              />
              {renderIndicator(x, y)}
              {showLabel && (
                <SvgText
                  x={x + blockSize / 2}
                  y={y + blockSize + gap + 12}
                  textAnchor="middle"
                  fontSize={typography.fontSize.xs}
                  fontWeight={typography.fontWeight.medium}
                  fill={type === "avoid" ? colors.neutral[400] : colors.neutral[600]}
                >
                  {item.label || item.name}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
};

const use_styles = createStyles((colors) => ({}))

export default ColorPalette;

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { flatColors } from "../../../design-system/theme";
import { typography } from "../../../design-system/theme/tokens/typography";
import { spacing } from "../../../design-system/theme/tokens/spacing";
import { shadows } from "../../../design-system/theme/tokens/shadows";

export interface ColorPaletteProps {
  colors: string[];
  title?: string;
  subtitle?: string;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  colors: swatchColors,
  title = "你的专属色板",
  subtitle,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[paletteStyles.container, { backgroundColor: colors.surface }]}>
      <Text style={[paletteStyles.title, { color: colors.textPrimary }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[paletteStyles.subtitle, { color: colors.textTertiary }]}>
          {subtitle}
        </Text>
      ) : null}
      <View style={paletteStyles.swatchRow}>
        {swatchColors.slice(0, 8).map((hex, i) => (
          <View
            key={i}
            style={[
              paletteStyles.swatch,
              { backgroundColor: hex, borderColor: colors.border },
            ]}
            accessibilityLabel={`颜色 ${hex}`}
            accessibilityRole="image"
          />
        ))}
        {swatchColors.length < 1 && (
          <Text style={[paletteStyles.emptyText, { color: colors.textTertiary }]}>
            暂无色板数据
          </Text>
        )}
      </View>
    </View>
  );
};

const paletteStyles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.layout.screenPadding,
    borderRadius: spacing.borderRadius.xl,
    padding: spacing.layout.cardPadding,
    marginBottom: spacing.layout.cardGap,
    ...shadows.presets.sm,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    marginBottom: 12,
  },
  swatchRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    fontStyle: "italic",
  },
});

export default ColorPalette;

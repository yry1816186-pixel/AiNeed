import React, { useMemo } from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';

interface BrandPatternProps {
  variant: "weave" | "wave" | "leaf";
  style?: ViewStyle;
}

export const BrandPattern: React.FC<BrandPatternProps> = ({ variant, style }) => {
  const config = DesignTokens.motif.patterns;

  const elements = useMemo(() => {
    const items: React.ReactNode[] = [];

    if (variant === "weave") {
      const weave = config.weave;
      const cols = 8;
      const rows = 6;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          items.push(
            <View
              key={`h-${r}-${c}`}
              style={{
                position: "absolute",
                left: c * weave.spacing,
                top: r * weave.spacing + weave.spacing / 2,
                width: weave.spacing,
                height: weave.strokeWidth,
                backgroundColor: weave.strokeColor,
                opacity: weave.opacity,
              }}
            />
          );
          items.push(
            <View
              key={`v-${r}-${c}`}
              style={{
                position: "absolute",
                left: c * weave.spacing + weave.spacing / 2,
                top: r * weave.spacing,
                width: weave.strokeWidth,
                height: weave.spacing,
                backgroundColor: weave.strokeColor,
                opacity: weave.opacity,
              }}
            />
          );
        }
      }
    } else if (variant === "wave") {
      const wave = config.terracottaWave;
      const rows = 5;
      const cols = 6;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          items.push(
            <View
              key={`wave-${r}-${c}`}
              style={{
                position: "absolute",
                left: c * wave.wavelength,
                top: r * (wave.amplitude * 4) + wave.amplitude,
                width: wave.wavelength / 2,
                height: wave.amplitude * 2,
                borderRadius: wave.wavelength / 4,
                borderWidth: wave.strokeWidth,
                borderColor: wave.strokeColor,
                opacity: wave.opacity,
              }}
            />
          );
        }
      }
    } else if (variant === "leaf") {
      const leaf = config.sageLeaf;
      const cols = 6;
      const rows = 5;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          items.push(
            <View
              key={`leaf-${r}-${c}`}
              style={{
                position: "absolute",
                left: c * leaf.spacing + leaf.spacing / 2 - leaf.size / 2,
                top: r * leaf.spacing + leaf.spacing / 2 - leaf.size / 2,
                width: leaf.size,
                height: leaf.size,
                backgroundColor: leaf.fillColor,
                opacity: leaf.opacity,
                transform: [{ rotate: "45deg" }],
                borderRadius: leaf.size / 4,
              }}
            />
          );
        }
      }
    }

    return items;
  }, [variant, config]);

  const containerSize = variant === "weave"
    ? { width: config.weave.spacing * 8, height: config.weave.spacing * 6 }
    : variant === "wave"
    ? { width: config.terracottaWave.wavelength * 6, height: config.terracottaWave.amplitude * 4 * 5 }
    : { width: config.sageLeaf.spacing * 6, height: config.sageLeaf.spacing * 5 };

  return (
    <View style={[styles.patternContainer, containerSize, style]} pointerEvents="none">
      {elements}
    </View>
  );
};

interface BrandDividerProps {
  style?: ViewStyle;
}

export const BrandDivider: React.FC<BrandDividerProps> = ({ style }) => {
  const ornament = DesignTokens.motif.ornaments;

  return (
    <View style={[styles.dividerContainer, style]}>
      <View style={[styles.dividerLine, { backgroundColor: ornament.color, opacity: ornament.opacity }]} />
      <View
        style={[
          styles.dividerOrnament,
          {
            borderColor: ornament.color,
            opacity: ornament.opacity + 0.1,
          },
        ]}
      />
      <View style={[styles.dividerLine, { backgroundColor: ornament.color, opacity: ornament.opacity }]} />
    </View>
  );
};

interface BrandCornerOrnamentProps {
  position: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
  size?: number;
  style?: ViewStyle;
}

export const BrandCornerOrnament: React.FC<BrandCornerOrnamentProps> = ({
  position,
  size = 32,
  style,
}) => {
  const ornament = DesignTokens.motif.ornaments;
  const armLength = size * 0.6;
  const curlSize = size * 0.25;

  const isTop = position === "topLeft" || position === "topRight";
  const isLeft = position === "topLeft" || position === "bottomLeft";

  const containerStyle: ViewStyle = {
    position: "absolute",
    top: isTop ? 0 : undefined,
    bottom: isTop ? undefined : 0,
    left: isLeft ? 0 : undefined,
    right: isLeft ? undefined : 0,
    width: size,
    height: size,
  };

  const verticalBarStyle: ViewStyle = {
    position: "absolute",
    top: isTop ? 0 : undefined,
    bottom: isTop ? undefined : 0,
    left: isLeft ? 0 : size - ornament.strokeWidth,
    width: ornament.strokeWidth,
    height: armLength,
    backgroundColor: ornament.color,
    opacity: ornament.opacity,
  };

  const horizontalBarStyle: ViewStyle = {
    position: "absolute",
    top: isTop ? 0 : size - ornament.strokeWidth,
    left: isLeft ? 0 : undefined,
    right: isLeft ? undefined : 0,
    width: armLength,
    height: ornament.strokeWidth,
    backgroundColor: ornament.color,
    opacity: ornament.opacity,
  };

  const curlStyle: ViewStyle = {
    position: "absolute",
    top: isTop ? armLength - curlSize / 2 : undefined,
    bottom: isTop ? undefined : armLength - curlSize / 2,
    left: isLeft ? armLength - curlSize / 2 : undefined,
    right: isLeft ? undefined : armLength - curlSize / 2,
    width: curlSize,
    height: curlSize,
    borderRadius: curlSize / 2,
    borderWidth: ornament.strokeWidth,
    borderColor: ornament.color,
    opacity: ornament.opacity,
  };

  return (
    <View style={[containerStyle, style]} pointerEvents="none">
      <View style={verticalBarStyle} />
      <View style={horizontalBarStyle} />
      <View style={curlStyle} />
    </View>
  );
};

const styles = StyleSheet.create({
  patternContainer: {
    position: "absolute",
    overflow: "hidden",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerOrnament: {
    width: 8,
    height: 8,
    borderRadius: 2,
    borderWidth: 1.5,
    transform: [{ rotate: "45deg" }],
  },
});

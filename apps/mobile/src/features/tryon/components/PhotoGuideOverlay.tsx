import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Ellipse, Path } from "react-native-svg";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { Spacing, flatColors as colors } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';


interface PhotoGuideOverlayProps {
  visible: boolean;
  dimensions?: { width: number; height: number };
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const DEFAULT_HEIGHT = Math.round(SCREEN_WIDTH * 0.7);

export const PhotoGuideOverlay: React.FC<PhotoGuideOverlayProps> = ({ visible, dimensions }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  if (!visible) {
    return null;
  }

  const width = dimensions?.width ?? SCREEN_WIDTH;
  const height = dimensions?.height ?? DEFAULT_HEIGHT;

  const centerX = width / 2;
  const headRx = width * 0.08;
  const headRy = width * 0.1;
  const headCy = height * 0.15;

  const shoulderWidth = width * 0.35;
  const shoulderY = height * 0.3;
  const waistWidth = width * 0.25;
  const waistY = height * 0.55;
  const hipWidth = width * 0.3;
  const hipY = height * 0.7;
  const feetY = height * 0.92;

  const bodyPath = [
    `M ${centerX - shoulderWidth} ${shoulderY}`,
    `L ${centerX - waistWidth} ${waistY}`,
    `L ${centerX - hipWidth} ${hipY}`,
    `L ${centerX - hipWidth * 0.4} ${feetY}`,
    `L ${centerX + hipWidth * 0.4} ${feetY}`,
    `L ${centerX + hipWidth} ${hipY}`,
    `L ${centerX + waistWidth} ${waistY}`,
    `L ${centerX + shoulderWidth} ${shoulderY}`,
    "Z",
  ].join(" ");

  return (
    <View style={[styles.overlay, { width, height }]} pointerEvents="none">
      <Svg width={width} height={height} style={styles.svg}>
        <Ellipse
          cx={centerX}
          cy={headCy}
          rx={headRx}
          ry={headRy}
          stroke="rgba(255, 255, 255, 0.8)"
          strokeWidth={2}
          strokeDasharray="8 4"
          fill="none"
        />
        <Path
          d={bodyPath}
          stroke="rgba(255, 255, 255, 0.8)"
          strokeWidth={2}
          strokeDasharray="8 4"
          fill="none"
        />
      </Svg>
      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>请正面站立</Text>
      </View>
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  svg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  hintContainer: {
    position: "absolute",
    bottom: Spacing.xl,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hintText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "400",
    color: colors.surface,
    textAlign: "center",
  },
}))

export default PhotoGuideOverlay;

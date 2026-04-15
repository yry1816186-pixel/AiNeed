import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import Svg, { Polyline, Line, Polygon } from "react-native-svg";
import type {
  ReferenceLines,
  AlignmentStatus,
  AlignmentLevel,
  OverallAlignment,
} from "../../../hooks/useReferenceLines";

interface ReferenceLineOverlayProps {
  referenceLines: ReferenceLines | null;
  alignmentStatus: AlignmentStatus | null;
  width: number;
  height: number;
}

function getLineColor(level: AlignmentLevel | OverallAlignment): string {
  switch (level) {
    case "aligned":
    case "perfect":
    case "good":
      return "#4CAF50";
    case "slight":
      return "#FFC107";
    case "off":
    case "adjust":
      return "#F44336";
    default:
      return "#FFC107";
  }
}

function pointsToString(points: { x: number; y: number }[], width: number, height: number): string {
  return points.map((p) => `${(p.x * width).toFixed(1)},${(p.y * height).toFixed(1)}`).join(" ");
}

export const ReferenceLineOverlay: React.FC<ReferenceLineOverlayProps> = ({
  referenceLines,
  alignmentStatus,
  width,
  height,
}) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (referenceLines) {
      Animated.timing(opacityAnim, {
        toValue: 0.7,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      opacityAnim.setValue(0);
    }
  }, [referenceLines, opacityAnim]);

  if (!referenceLines || width <= 0 || height <= 0) {
    return null;
  }

  const shoulderColor = getLineColor(alignmentStatus?.shoulder ?? "slight");
  const postureColor = getLineColor(alignmentStatus?.posture ?? "slight");
  const centerColor = getLineColor(alignmentStatus?.center ?? "slight");
  const overallColor = getLineColor(alignmentStatus?.overall ?? "adjust");

  const shoulderPoints = pointsToString(referenceLines.shoulderLine, width, height);
  const waistPoints = pointsToString(referenceLines.waistLine, width, height);
  const centerStart = referenceLines.centerLine[0];
  const centerEnd = referenceLines.centerLine[referenceLines.centerLine.length - 1];
  const outlinePoints = pointsToString(referenceLines.bodyOutline, width, height);

  return (
    <Animated.View style={[styles.container, { opacity: opacityAnim }]}>
      <Svg width={width} height={height} style={styles.svg}>
        <Polygon
          points={outlinePoints}
          fill="none"
          stroke={overallColor}
          strokeWidth={1.5}
          strokeDasharray={[8, 4]}
          opacity={0.7}
        />

        <Polyline
          points={shoulderPoints}
          fill="none"
          stroke={shoulderColor}
          strokeWidth={2}
          opacity={0.7}
        />

        <Polyline
          points={waistPoints}
          fill="none"
          stroke={postureColor}
          strokeWidth={2}
          opacity={0.7}
        />

        <Line
          x1={centerStart.x * width}
          y1={centerStart.y * height}
          x2={centerEnd.x * width}
          y2={centerEnd.y * height}
          stroke={centerColor}
          strokeWidth={1.5}
          strokeDasharray={[6, 4]}
          opacity={0.7}
        />
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  svg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});

import React, { useCallback, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Svg, Rect, Image as SvgImage, Text as SvgText, G } from "react-native-svg";
import { GestureHandlerRootView, GestureDetector, Gesture } from "react-native-gesture-handler";
import { theme, Colors } from '../../design-system/theme';
import type { DesignLayer, PrintableAreaBounds } from "../../stores/customizationEditorStore";
import { DesignTokens } from "../../design-system/theme";

interface DesignCanvasProps {
  template: {
    printableArea: PrintableAreaBounds;
  } | null;
  layers: DesignLayer[];
  selectedLayerId: string | null;
  onLayerUpdate: (layerId: string, props: Partial<DesignLayer>) => void;
  canvasWidth: number;
  canvasHeight: number;
}

export const DesignCanvas: React.FC<DesignCanvasProps> = ({
  template,
  layers,
  selectedLayerId,
  onLayerUpdate,
  canvasWidth,
  canvasHeight,
}) => {
  const startRef = useRef({ x: 0, y: 0 });

  const panGesture = useCallback(
    () =>
      Gesture.Pan()
        .onStart(() => {
          if (!selectedLayerId) {
            return;
          }
          const layer = layers.find((l) => l.id === selectedLayerId);
          if (layer) {
            startRef.current = { x: layer.x, y: layer.y };
          }
        })
        .onUpdate((event) => {
          if (!selectedLayerId || !template) {
            return;
          }
          const area = template.printableArea;
          const newX = startRef.current.x + event.translationX;
          const newY = startRef.current.y + event.translationY;

          const clampedX = Math.max(
            (area.x / 100) * canvasWidth,
            Math.min(newX, ((area.x + area.width) / 100) * canvasWidth)
          );
          const clampedY = Math.max(
            (area.y / 100) * canvasHeight,
            Math.min(newY, ((area.y + area.height) / 100) * canvasHeight)
          );

          onLayerUpdate(selectedLayerId, { x: clampedX, y: clampedY });
        })
        .enabled(!!selectedLayerId),
    [selectedLayerId, layers, template, canvasWidth, canvasHeight, onLayerUpdate]
  );

  const pinchGesture = useCallback(
    () =>
      Gesture.Pinch()
        .onUpdate((event) => {
          if (!selectedLayerId) {
            return;
          }
          onLayerUpdate(selectedLayerId, {
            scale: Math.max(0.1, Math.min(5, event.scale)),
          });
        })
        .enabled(!!selectedLayerId),
    [selectedLayerId, onLayerUpdate]
  );

  const rotationGesture = useCallback(
    () =>
      Gesture.Rotation()
        .onUpdate((event) => {
          if (!selectedLayerId) {
            return;
          }
          const layer = layers.find((l) => l.id === selectedLayerId);
          if (layer) {
            onLayerUpdate(selectedLayerId, {
              rotation: layer.rotation + event.rotation,
            });
          }
        })
        .enabled(!!selectedLayerId),
    [selectedLayerId, layers, onLayerUpdate]
  );

  const composedGesture = Gesture.Simultaneous(panGesture(), pinchGesture(), rotationGesture());

  const renderPrintableArea = () => {
    if (!template) {
      return null;
    }
    const area = template.printableArea;
    return (
      <Rect
        x={(area.x / 100) * canvasWidth}
        y={(area.y / 100) * canvasHeight}
        width={(area.width / 100) * canvasWidth}
        height={(area.height / 100) * canvasHeight}
        fill="none"
        stroke={Colors.neutral[400]}
        strokeWidth={1}
        strokeDasharray="8 4"
      />
    );
  };

  const renderLayer = (layer: DesignLayer) => {
    const isSelected = layer.id === selectedLayerId;

    const transformProps = {
      x: layer.x,
      y: layer.y,
      scale: layer.scale,
      rotation: layer.rotation,
    };

    const layerElement =
      layer.type === "image" ? (
        <SvgImage
          href={layer.imageUrl || layer.content}
          x={0}
          y={0}
          width={layer.width * layer.scale}
          height={layer.height * layer.scale}
          opacity={layer.opacity}
        />
      ) : layer.type === "text" ? (
        <SvgText
          x={0}
          y={(layer.fontSize ?? 24) * layer.scale}
          fontSize={(layer.fontSize ?? 24) * layer.scale}
          fill={layer.color ?? DesignTokens.colors.neutral.black}
          opacity={layer.opacity}
        >
          {layer.content}
        </SvgText>
      ) : (
        <Rect
          x={0}
          y={0}
          width={layer.width * layer.scale}
          height={layer.height * layer.scale}
          fill={layer.fillColor ?? DesignTokens.colors.neutral[300]}
          stroke={layer.strokeColor ?? DesignTokens.colors.neutral.black}
          strokeWidth={layer.strokeWidth ?? 1}
          opacity={layer.opacity}
        />
      );

    return (
      <G
        key={layer.id}
        transform={`translate(${transformProps.x}, ${transformProps.y}) scale(${
          transformProps.scale
        }) rotate(${transformProps.rotation}, ${layer.width / 2}, ${layer.height / 2})`}
      >
        {layerElement}
        {isSelected && (
          <Rect
            x={-4}
            y={-4}
            width={layer.width * layer.scale + 8}
            height={layer.height * layer.scale + 8}
            fill="none"
            stroke={theme.colors.primary}
            strokeWidth={1.5}
            strokeDasharray="6 3"
          />
        )}
      </G>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View style={styles.canvasContainer}>
          <Svg
            width={canvasWidth}
            height={canvasHeight}
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          >
            {/* Background */}
            <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill={DesignTokens.colors.backgrounds.tertiary} />
            {/* Printable area indicator */}
            {renderPrintableArea()}
            {/* Layers */}
            {layers.map(renderLayer)}
          </Svg>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  canvasContainer: {
    backgroundColor: Colors.neutral[100],
    borderRadius: 8,
    overflow: "hidden",
  },
});

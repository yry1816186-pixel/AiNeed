import React from "react";
import { Image, ViewStyle, StyleSheet } from "react-native";

export interface SmartImageProps {
  uri: string;
  blurhash?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  borderRadius?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export const SmartImage: React.FC<SmartImageProps> = ({
  uri,
  style,
  accessibilityLabel,
  borderRadius,
  aspectRatio,
  width,
  height,
}) => {
  return (
    <Image
      source={{ uri }}
      style={StyleSheet.flatten(
        [
          {
            borderRadius: borderRadius ?? 0,
          },
          aspectRatio ? { aspectRatio } : undefined,
          width ? { width } : undefined,
          height ? { height } : undefined,
          style,
        ].filter(Boolean) as any
      )}
      accessibilityLabel={accessibilityLabel}
    />
  );
};

export default SmartImage;

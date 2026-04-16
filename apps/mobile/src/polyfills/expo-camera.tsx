import React from "react";
import { View, ViewStyle, StyleSheet } from "react-native";
import { DesignTokens } from "../design-system/theme";
import { useTheme, createStyles } from '../shared/contexts/ThemeContext';

export interface CameraRef {
  takePictureAsync: () => Promise<{ uri: string }>;
}

export interface CameraProps {
  style?: ViewStyle;
  type?: "front" | "back";
  flashMode?: "on" | "off" | "auto" | "torch";
  onCameraReady?: () => void;
  onMountError?: (error: { message: string }) => void;
  children?: React.ReactNode;
  ref?: React.Ref<CameraRef>;
}

export const Camera: React.FC<CameraProps> = ({
  style,
  _type = "back",
  _flashMode = "auto",
  onCameraReady,
  onMountError,
  children,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  React.useEffect(() => {
    onCameraReady?.();
  }, []);

  return <View style={[styles.camera, style]}>{children}</View>;
};

export const CameraView: React.FC<CameraProps & { facing?: "front" | "back"; flash?: string }> =
  React.forwardRef(
    (
      { style, _facing = "back", flash, _flashMode = "auto", onCameraReady, onMountError, children },
      ref
    ) => {
      React.useEffect(() => {
        onCameraReady?.();
      }, []);

      React.useImperativeHandle(ref, () => ({
        takePictureAsync: async () => {
          return { uri: `file:///tmp/photo_${Date.now()}.jpg` };
        },
      }));

      return <View style={[styles.camera, style]}>{children}</View>;
    }
  );

export const CameraType = {
  front: "front" as const,
  back: "back" as const,
};

export const FlashMode = {
  on: "on" as const,
  off: "off" as const,
  auto: "auto" as const,
  torch: "torch" as const,
};

export async function requestCameraPermissionsAsync(): Promise<{
  status: string;
  granted: boolean;
}> {
  return { status: "granted", granted: true };
}

export function useCameraPermissions(): [
  { status: string; granted: boolean },
  () => Promise<void>
] {
  const requestPermission = async () => {};
  return [{ status: "granted", granted: true }, requestPermission];
}

const useStyles = createStyles((colors) => ({
  camera: {
    flex: 1,
    backgroundColor: colors.neutral[900],
  },
}))

export default {
  Camera,
  CameraView,
  CameraType,
  FlashMode,
  requestCameraPermissionsAsync,
  useCameraPermissions,
};

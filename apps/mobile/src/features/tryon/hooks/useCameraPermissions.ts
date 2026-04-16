import { useState, useEffect, useCallback } from "react";
import { PermissionsAndroid, Linking, Platform } from "react-native";

type PermissionStatus = "undetermined" | "granted" | "denied";

interface UseCameraPermissionsResult {
  permissionStatus: PermissionStatus;
  canAskAgain: boolean;
  requestPermission: () => Promise<PermissionStatus>;
  openSettings: () => Promise<void>;
}

const CAMERA_PERMISSION = "android.permission.CAMERA" as const;

async function checkCameraPermission(): Promise<{
  status: PermissionStatus;
  canAskAgain: boolean;
}> {
  if (Platform.OS !== "android") {
    return { status: "granted", canAskAgain: true };
  }

  try {
    const granted = await PermissionsAndroid.check(CAMERA_PERMISSION);
    if (granted) {
      return { status: "granted", canAskAgain: true };
    }
    return { status: "undetermined", canAskAgain: true };
  } catch (e) {
    console.error('Camera permission check failed:', e);
    return { status: "undetermined", canAskAgain: true };
  }
}

export function useCameraPermissions(): UseCameraPermissionsResult {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>("undetermined");
  const [canAskAgain, setCanAskAgain] = useState(true);

  useEffect(() => {
    void checkCameraPermission().then(({ status, canAskAgain: askable }) => {
      setPermissionStatus(status);
      setCanAskAgain(askable);
    });
  }, []);

  const requestPermission = useCallback(async (): Promise<PermissionStatus> => {
    if (Platform.OS !== "android") {
      setPermissionStatus("granted");
      return "granted";
    }

    try {
      const result = await PermissionsAndroid.request(CAMERA_PERMISSION);

      const status: PermissionStatus =
        result === PermissionsAndroid.RESULTS.GRANTED
          ? "granted"
          : result === PermissionsAndroid.RESULTS.DENIED
          ? "denied"
          : "denied";

      const askable = result !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

      setPermissionStatus(status);
      setCanAskAgain(askable);
      return status;
    } catch (e) {
      console.error('Camera permission request failed:', e);
      setPermissionStatus("denied");
      setCanAskAgain(false);
      return "denied";
    }
  }, []);

  const openSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch {
      try {
        await Linking.openURL("app-settings:");
      } catch (e) {
        console.error('Failed to open app settings:', e);
      }
    }
  }, []);

  return { permissionStatus, canAskAgain, requestPermission, openSettings };
}

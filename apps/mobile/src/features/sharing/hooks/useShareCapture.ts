import { useCallback, useRef, useState } from "react";
import type { RefObject } from "react";
import { Alert, type View } from "react-native";

/**
 * Hook for capturing a share card view as an image and sharing it.
 *
 * Uses react-native-view-shot for capture and react-native-share for sharing.
 * Cancel errors from the share dialog are silently caught.
 * Root View MUST have collapsable={false} for Android compatibility.
 */
export function useShareCapture() {
  const viewRef = useRef<View>(null) as RefObject<View>;
  const [isSharing, setIsSharing] = useState(false);

  const captureAndShare = useCallback(async (title: string, message: string) => {
    if (!viewRef.current) return;
    setIsSharing(true);
    try {
      const { captureRef } = require("react-native-view-shot") as {
        captureRef: (
          ref: RefObject<View>,
          options: { format: string; quality: number; result: string }
        ) => Promise<string>;
      };
      const uri = await captureRef(viewRef, {
        format: "png",
        quality: 0.9,
        result: "tmpfile",
      });

      const Share = require("react-native-share") as {
        open: (options: {
          url: string;
          type: string;
          title: string;
          message: string;
        }) => Promise<void>;
      };
      await Share.open({
        url: uri.startsWith("file://") ? uri : `file://${uri}`,
        type: "image/png",
        title,
        message,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (!msg.includes("cancelled") && !msg.includes("CANCEL")) {
        Alert.alert("分享失败", "请稍后重试");
      }
    } finally {
      setIsSharing(false);
    }
  }, []);

  const saveToAlbum = useCallback(async () => {
    if (!viewRef.current) return;
    try {
      const { captureRef } = require("react-native-view-shot") as {
        captureRef: (
          ref: RefObject<View>,
          options: { format: string; quality: number; result: string }
        ) => Promise<string>;
      };
      const uri = await captureRef(viewRef, {
        format: "png",
        quality: 0.9,
        result: "tmpfile",
      });

      const Share = require("react-native-share") as {
        open: (options: { url: string; type: string; title: string }) => Promise<void>;
      };
      await Share.open({
        url: uri.startsWith("file://") ? uri : `file://${uri}`,
        type: "image/png",
        title: "保存到相册",
      });
    } catch {
      // User cancelled or save failed — silently ignore
    }
  }, []);

  return { viewRef, isSharing, captureAndShare, saveToAlbum };
}

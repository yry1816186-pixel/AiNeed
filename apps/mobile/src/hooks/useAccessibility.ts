import { useState, useEffect, useCallback } from "react";
import { AccessibilityInfo, PixelRatio } from "react-native";

export function useAccessibility() {
  const [screenReaderActive, setScreenReaderActive] = useState(false);
  const fontScale = PixelRatio.getFontScale();

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReaderActive);
    const sub = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      (enabled) => setScreenReaderActive(enabled)
    );
    return () => sub.remove();
  }, []);

  const ensureMinTouchTarget = useCallback(
    (size: number) => Math.max(size, 44),
    []
  );

  return { screenReaderActive, fontScale, ensureMinTouchTarget };
}

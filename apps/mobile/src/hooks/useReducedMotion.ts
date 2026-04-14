import { useState, useEffect } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { useSharedValue } from "react-native-reanimated";

export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const reducedMotionSV = useSharedValue(false);

  useEffect(() => {
    const osVersion = Platform.Version;
    if (Platform.OS === "ios" && typeof osVersion === "number" && osVersion < 16) {
      AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
        setReducedMotion(enabled);
        reducedMotionSV.value = enabled;
      });
      return;
    }
    if (Platform.OS === "android" && typeof osVersion === "number" && osVersion < 24) {
      return;
    }

    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        setReducedMotion(enabled);
        reducedMotionSV.value = enabled;
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled: boolean) => {
        if (mounted) {
          setReducedMotion(enabled);
          reducedMotionSV.value = enabled;
        }
      },
    );

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  return { reducedMotion, reducedMotionSV };
}

export function useMotionHelpers() {
  const { reducedMotion, reducedMotionSV } = useReducedMotion();

  return { reducedMotion, reducedMotionSV };
}

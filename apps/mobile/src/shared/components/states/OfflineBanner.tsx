import React, { useEffect } from "react";
import { View, Text, StyleSheet, Platform, TouchableOpacity, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { useSharedValue, useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";

import { DesignTokens } from "../../../theme/tokens/design-tokens";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { flatColors as colors } from "../../../design-system/theme";
import { createStyles } from "../../contexts/ThemeContext";

const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);

const springConfig = {
  damping: 15,
  stiffness: 150,
  mass: 0.5,
};

export interface OfflineBannerProps {
  visible: boolean;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ visible, onRetry, style }) => {
  const styles = useStyles(colors);
  const translateY = useSharedValue(-60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, springConfig);
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withTiming(-60, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) {
    return null;
  }

  return (
    <AnimatedView style={[styles.offlineBanner, animatedStyle, style]}>
      <BlurView intensity={100} style={StyleSheet.absoluteFill as ViewStyle}>
        <View style={styles.offlineContent}>
          <Ionicons name="cloud-offline" size={18} color={colors.warning[500]} />
          <Text style={styles.offlineText}>网络连接已断开</Text>
          {onRetry && (
            <TouchableOpacity style={styles.offlineRetry} onPress={onRetry}>
              <Text style={styles.offlineRetryText}>重试</Text>
            </TouchableOpacity>
          )}
        </View>
      </BlurView>
    </AnimatedView>
  );
};

const useStyles = createStyles((colors) => ({
  offlineBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    zIndex: 100,
  },
  offlineContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    backgroundColor: colors.warning[50],
  },
  offlineText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.warning[700],
    fontWeight: "500",
  },
  offlineRetry: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: colors.warning[500],
    borderRadius: 12,
  },
  offlineRetryText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textInverse,
    fontWeight: "600",
  },
}));

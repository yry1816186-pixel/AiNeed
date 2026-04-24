import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, ViewStyle } from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
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

export interface PermissionDeniedProps {
  permission: "camera" | "gallery" | "location" | "notification";
  onOpenSettings?: () => void;
  style?: ViewStyle;
}

export const PermissionDenied: React.FC<PermissionDeniedProps> = ({
  permission,
  onOpenSettings,
  style,
}) => {
  const styles = useStyles(colors);
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, springConfig);
  }, []);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const permissionConfig = {
    camera: {
      icon: "camera-outline",
      title: "需要相机权限",
      message: "请在设置中允许访问相机，以便您可以使用拍照功能",
    },
    gallery: {
      icon: "images-outline",
      title: "需要相册权限",
      message: "请在设置中允许访问相册，以便您可以选择和保存照片",
    },
    location: {
      icon: "location-outline",
      title: "需要位置权限",
      message: "请在设置中允许访问位置，以便我们可以为您推荐附近的门店",
    },
    notification: {
      icon: "notifications-outline",
      title: "需要通知权限",
      message: "请在设置中允许发送通知，以便您不会错过重要消息",
    },
  };

  const config = permissionConfig[permission];

  return (
    <AnimatedView style={[styles.permissionContainer, containerAnimatedStyle, style]}>
      <View style={styles.permissionIconContainer}>
        <Ionicons name={config.icon} size={56} color={colors.primary[500]} />
        <View style={styles.permissionLock}>
          <Ionicons name="lock-closed" size={20} color={colors.error[500]} />
        </View>
      </View>

      <Text style={styles.permissionTitle}>{config.title}</Text>
      <Text style={styles.permissionMessage}>{config.message}</Text>

      {onOpenSettings && (
        <TouchableOpacity style={styles.permissionButton} onPress={onOpenSettings}>
          <LinearGradient
            colors={[DesignTokens.colors.brand.slateLight, DesignTokens.colors.brand.slateDark]}
            style={styles.permissionButtonGradient}
          >
            <Ionicons name="settings-outline" size={18} color={colors.textInverse} />
            <Text style={styles.permissionButtonText}>打开设置</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </AnimatedView>
  );
};

const useStyles = createStyles((colors) => ({
  permissionContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  permissionIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  permissionLock: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: DesignTokens.colors.neutral.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  permissionTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: colors.neutral[800],
    textAlign: "center",
    marginBottom: 8,
  },
  permissionMessage: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.neutral[500],
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionButton: {
    borderRadius: 24,
    overflow: "hidden",
  },
  permissionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  permissionButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textInverse,
  },
}));

/**
 * OfflineBanner - 离线模式顶部 toast 组件
 *
 * 当 isOffline=true 时显示暖橘色 #E17055 提示:
 * - 文案: "离线模式 -- 正在浏览缓存数据"
 * - 禁用需要网络的操作: 试穿/AI对话/分享
 * - 使用动画滑入/滑出效果
 */
import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useOfflineNetworkStatus } from "../../hooks/useOfflineNetworkStatus";

const OFFLINE_COLOR = "#E17055";
const BANNER_HEIGHT = 36;

interface OfflineBannerProps {
  /** 自定义离线文案 */
  message?: string;
  /** 是否禁用需要网络的操作提示 */
  disableActions?: boolean;
}

export function OfflineBanner({ message = "离线模式 -- 正在浏览缓存数据" }: OfflineBannerProps) {
  const { isOffline } = useOfflineNetworkStatus();
  const translateY = useSharedValue(-BANNER_HEIGHT);

  useEffect(() => {
    translateY.value = withSpring(isOffline ? 0 : -BANNER_HEIGHT, {
      damping: 20,
      stiffness: 300,
    });
  }, [isOffline, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[styles.banner, animatedStyle]}
      pointerEvents={isOffline ? "auto" : "none"}
      accessibilityLabel={message}
      accessibilityRole="alert"
    >
      <View style={styles.content}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: OFFLINE_COLOR,
    height: BANNER_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});

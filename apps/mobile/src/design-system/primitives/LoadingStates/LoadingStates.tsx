import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  Dimensions,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
  interpolateColor,
} from "react-native-reanimated";
import { Colors, theme } from '../theme';
import { DesignTokens } from "../../theme/tokens/design-tokens";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// 基础加载指示器
interface SpinnerProps {
  size?: "small" | "large";
  color?: string;
  style?: ViewStyle;
}

export function Spinner({ size = "large", color, style }: SpinnerProps) {
  return <ActivityIndicator size={size} color={color || Colors.primary[500]} style={style} />;
}

// 全屏加载遮罩
interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.overlayContent}>
        <Spinner size="large" color="#fff" />
        {message && <Text style={styles.overlayMessage}>{message}</Text>}
      </View>
    </View>
  );
}

// 骨架屏加载器
interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = 8, style }: SkeletonProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [theme.colors.neutral[200], theme.colors.neutral[300]]
    ),
  }));

  const widthStyle: ViewStyle =
    typeof width === "number" ? { width } : { width: width as `${number}%` };

  return (
    <Animated.View
      style={[styles.skeleton, { height, borderRadius }, widthStyle, animatedStyle, style]}
    />
  );
}

// 预设骨架屏模板
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <View style={styles.skeletonTextContainer}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? "60%" : "100%"}
          height={14}
          style={{ marginBottom: index < lines - 1 ? 8 : 0 }}
        />
      ))}
    </View>
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <Skeleton width="100%" height={120} borderRadius={12} />
      <View style={styles.skeletonCardContent}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
        <Skeleton width="50%" height={14} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.skeletonListItem}>
          <Skeleton width={48} height={48} borderRadius={24} />
          <View style={styles.skeletonListItemText}>
            <Skeleton width="70%" height={14} />
            <Skeleton width="50%" height={12} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function SkeletonProductGrid() {
  return (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={styles.skeletonGridItem}>
          <Skeleton width="100%" height={(SCREEN_WIDTH - 48) / 2} borderRadius={12} />
          <View style={styles.skeletonGridContent}>
            <Skeleton width="80%" height={14} style={{ marginTop: 8 }} />
            <Skeleton width="50%" height={12} style={{ marginTop: 4 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  overlayContent: {
    alignItems: "center",
  },
  overlayMessage: {
    marginTop: 16,
    fontSize: DesignTokens.typography.sizes.md,
    color: "#fff",
    fontWeight: "500",
  },
  skeleton: {
    backgroundColor: theme.colors.neutral[200],
  },
  skeletonTextContainer: {
    padding: 16,
  },
  skeletonCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: DesignTokens.colors.neutral.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  skeletonCardContent: {
    padding: 12,
  },
  skeletonList: {
    padding: 16,
  },
  skeletonListItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  skeletonListItemText: {
    flex: 1,
    marginLeft: 12,
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    gap: 12,
  },
  skeletonGridItem: {
    width: (SCREEN_WIDTH - 48) / 2,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  skeletonGridContent: {
    padding: 12,
  },
});

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
  interpolateColor,
} from "react-native-reanimated";
import { DesignTokens } from "../../theme/tokens/design-tokens";
import { Spacing } from '../../theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';


const { width: SCREEN_WIDTH } = Dimensions.get("window");

// 基础加载指示器
interface SpinnerProps {
  size?: "small" | "large";
  color?: string;
  style?: ViewStyle;
}

export function Spinner({ size = "large", color, style }: SpinnerProps) {
  const { colors } = useTheme();
  return <ActivityIndicator size={size} color={color || colors.primary} style={style} />;
}

// 全屏加载遮罩
interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.overlayContent}>
        <Spinner size="large" color={colors.textInverse} />
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
  const { colors } = useTheme();
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
      [colors.placeholderBg, colors.border]
    ),
  }));

  const widthStyle: ViewStyle =
    typeof width === "number" ? { width } : { width: width as `${number}%` };

  return (
    <Animated.View
      style={[{ height, borderRadius }, widthStyle, animatedStyle, style]}
    />
  );
}

// 预设骨架屏模板
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  const { colors } = useTheme();
  const styles = useStyles(colors);

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
  const { colors } = useTheme();
  const styles = useStyles(colors);

  return (
    <View style={styles.skeletonCard}>
      <Skeleton width="100%" height={120} borderRadius={12} />
      <View style={styles.skeletonCardContent}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="40%" height={12} style={{ marginTop: Spacing.sm }} />
        <Skeleton width="50%" height={14} style={{ marginTop: Spacing.sm }} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.skeletonListItem}>
          <Skeleton width={48} height={48} borderRadius={24} />
          <View style={styles.skeletonListItemText}>
            <Skeleton width="70%" height={14} />
            <Skeleton width="50%" height={12} style={{ marginTop: DesignTokens.spacing['1.5'] }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function SkeletonProductGrid() {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  return (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={styles.skeletonGridItem}>
          <Skeleton width="100%" height={(SCREEN_WIDTH - 48) / 2} borderRadius={12} />
          <View style={styles.skeletonGridContent}>
            <Skeleton width="80%" height={14} style={{ marginTop: Spacing.sm }} />
            <Skeleton width="50%" height={12} style={{ marginTop: Spacing.xs }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const useStyles = createStyles((colors) => ({
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
    marginTop: Spacing.md,
    fontSize: DesignTokens.typography.sizes.md,
    color: colors.textInverse,
    fontWeight: "500",
  },
  skeletonTextContainer: {
    padding: Spacing.md,
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: colors.textPrimary,
        shadowOffset: { width: 0, height: DesignTokens.spacing['0.5'] },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  skeletonCardContent: {
    padding: DesignTokens.spacing[3],
  },
  skeletonList: {
    padding: Spacing.md,
  },
  skeletonListItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  skeletonListItemText: {
    flex: 1,
    marginLeft: DesignTokens.spacing[3],
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: DesignTokens.spacing[3],
    gap: DesignTokens.spacing[3],
  },
  skeletonGridItem: {
    width: (SCREEN_WIDTH - 48) / 2,
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: "hidden",
  },
  skeletonGridContent: {
    padding: DesignTokens.spacing[3],
  },
}));

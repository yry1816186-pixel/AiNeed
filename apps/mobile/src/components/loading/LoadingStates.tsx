import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  Image,
  ViewStyle,
  TextStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from '@/src/polyfills/expo-linear-gradient';
import * as Haptics from '@/src/polyfills/expo-haptics';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Extrapolate,
  Easing,
  runOnJS,
  cancelAnimation,
  useDerivedValue,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import {
  Colors,
  Spacing,
  BorderRadius,
  Shadows,
  Typography,
} from "../../theme";

import { Ionicons } from '@/src/polyfills/expo-vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);
const AnimatedText = AnimatedReanimated.createAnimatedComponent(Text);
const AnimatedLinearGradient =
  AnimatedReanimated.createAnimatedComponent(LinearGradient);

const shimmerColors = ["transparent", "rgba(255,255,255,0.4)", "transparent"];

export interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  animated?: boolean;
  shimmerColor?: string;
  baseColor?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
  animated = true,
  shimmerColor = "rgba(255,255,255,0.4)",
  baseColor = Colors.neutral[200],
}) => {
  const shimmerProgress = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      shimmerProgress.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        false,
      );
    }
  }, [animated]);

  const shimmerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shimmerProgress.value, [0, 1], [-200, 200]) },
    ],
  }));

  return (
    <View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: baseColor,
        },
        style,
      ]}
    >
      {animated && (
        <View style={styles.shimmerContainer}>
          <AnimatedView style={[styles.shimmer, shimmerAnimatedStyle]}>
            <LinearGradient
              colors={["transparent", shimmerColor, "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </AnimatedView>
        </View>
      )}
    </View>
  );
};

export interface SkeletonCardProps {
  style?: ViewStyle;
  variant?: "product" | "article" | "profile" | "list" | "outfit";
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  style,
  variant = "product",
}) => {
  const renderProductSkeleton = () => (
    <View style={[styles.skeletonProductCard, style]}>
      <Skeleton width="100%" height={180} borderRadius={16} />
      <View style={styles.skeletonContent}>
        <Skeleton
          width="60%"
          height={14}
          borderRadius={7}
          style={{ marginTop: 12 }}
        />
        <Skeleton
          width="100%"
          height={12}
          borderRadius={6}
          style={{ marginTop: 8 }}
        />
        <Skeleton
          width="80%"
          height={12}
          borderRadius={6}
          style={{ marginTop: 4 }}
        />
        <View style={styles.skeletonRow}>
          <Skeleton
            width={80}
            height={20}
            borderRadius={10}
            style={{ marginTop: 12 }}
          />
          <Skeleton
            width={60}
            height={16}
            borderRadius={8}
            style={{ marginTop: 12 }}
          />
        </View>
      </View>
    </View>
  );

  const renderArticleSkeleton = () => (
    <View style={[styles.skeletonArticleCard, style]}>
      <View style={styles.skeletonArticleHeader}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.skeletonArticleMeta}>
          <Skeleton width={100} height={12} borderRadius={6} />
          <Skeleton
            width={60}
            height={10}
            borderRadius={5}
            style={{ marginTop: 4 }}
          />
        </View>
      </View>
      <Skeleton
        width="100%"
        height={200}
        borderRadius={12}
        style={{ marginTop: 12 }}
      />
      <Skeleton
        width="90%"
        height={14}
        borderRadius={7}
        style={{ marginTop: 12 }}
      />
      <Skeleton
        width="70%"
        height={14}
        borderRadius={7}
        style={{ marginTop: 6 }}
      />
    </View>
  );

  const renderProfileSkeleton = () => (
    <View style={[styles.skeletonProfileCard, style]}>
      <Skeleton
        width={80}
        height={80}
        borderRadius={40}
        style={{ alignSelf: "center" }}
      />
      <Skeleton
        width={120}
        height={16}
        borderRadius={8}
        style={{ marginTop: 16, alignSelf: "center" }}
      />
      <Skeleton
        width={160}
        height={12}
        borderRadius={6}
        style={{ marginTop: 8, alignSelf: "center" }}
      />
      <View style={styles.skeletonStatsRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.skeletonStat}>
            <Skeleton width={40} height={18} borderRadius={9} />
            <Skeleton
              width={50}
              height={10}
              borderRadius={5}
              style={{ marginTop: 4 }}
            />
          </View>
        ))}
      </View>
    </View>
  );

  const renderListSkeleton = () => (
    <View style={[styles.skeletonListItem, style]}>
      <Skeleton width={60} height={60} borderRadius={12} />
      <View style={styles.skeletonListContent}>
        <Skeleton width="70%" height={14} borderRadius={7} />
        <Skeleton
          width="50%"
          height={12}
          borderRadius={6}
          style={{ marginTop: 6 }}
        />
        <Skeleton
          width={80}
          height={18}
          borderRadius={9}
          style={{ marginTop: 8 }}
        />
      </View>
    </View>
  );

  const renderOutfitSkeleton = () => (
    <View style={[styles.skeletonOutfitCard, style]}>
      <View style={styles.skeletonOutfitGrid}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width="48%" height={120} borderRadius={12} />
        ))}
      </View>
      <View style={styles.skeletonOutfitFooter}>
        <Skeleton width={100} height={12} borderRadius={6} />
        <Skeleton width={60} height={24} borderRadius={12} />
      </View>
    </View>
  );

  switch (variant) {
    case "article":
      return renderArticleSkeleton();
    case "profile":
      return renderProfileSkeleton();
    case "list":
      return renderListSkeleton();
    case "outfit":
      return renderOutfitSkeleton();
    default:
      return renderProductSkeleton();
  }
};

export interface ProgressIndicatorProps {
  progress: number;
  size?: "small" | "medium" | "large";
  color?: string;
  backgroundColor?: string;
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  style?: ViewStyle;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  size = "medium",
  color = Colors.primary[500],
  backgroundColor = Colors.neutral[200],
  showLabel = false,
  label,
  animated = true,
  style,
}) => {
  const animatedProgress = useSharedValue(0);
  const scale = useSharedValue(1);

  const sizeMap = {
    small: { width: 80, height: 4, fontSize: 10 },
    medium: { width: 120, height: 6, fontSize: 12 },
    large: { width: 180, height: 8, fontSize: 14 },
  };

  const config = sizeMap[size];

  useEffect(() => {
    if (animated) {
      animatedProgress.value = withSpring(progress, {
        damping: 15,
        stiffness: 100,
      });
    } else {
      animatedProgress.value = progress;
    }
  }, [progress, animated]);

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    if (progress < 1) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 500 }),
          withTiming(1, { duration: 500 }),
        ),
        -1,
        true,
      );
    } else {
      scale.value = withSpring(1);
    }
  }, [progress]);

  return (
    <View style={[styles.progressContainer, style]}>
      {showLabel && (
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { fontSize: config.fontSize }]}>
            {label || `${Math.round(progress * 100)}%`}
          </Text>
        </View>
      )}
      <AnimatedView
        style={[
          styles.progressTrack,
          {
            width: config.width,
            height: config.height,
            backgroundColor,
          },
          pulseAnimatedStyle,
        ]}
      >
        <AnimatedView
          style={[
            styles.progressFill,
            { backgroundColor: color },
            progressAnimatedStyle,
          ]}
        />
      </AnimatedView>
    </View>
  );
};

export interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  animated?: boolean;
  style?: ViewStyle;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 60,
  strokeWidth = 4,
  color = Colors.primary[500],
  backgroundColor = Colors.neutral[200],
  showPercentage = true,
  animated = true,
  style,
}) => {
  const animatedProgress = useSharedValue(0);
  const rotation = useSharedValue(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (animated) {
      animatedProgress.value = withSpring(progress, {
        damping: 15,
        stiffness: 80,
      });
    } else {
      animatedProgress.value = progress;
    }
  }, [progress, animated]);

  useEffect(() => {
    if (progress < 1) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 3000, easing: Easing.linear }),
        -1,
        false,
      );
    }
  }, [progress]);

  const strokeDashoffset = useDerivedValue(() => {
    return circumference * (1 - animatedProgress.value);
  });

  const rotateAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation.value}deg` }],
  }));

  return (
    <View
      style={[styles.circularContainer, { width: size, height: size }, style]}
    >
      <View style={StyleSheet.absoluteFill}>
        <View style={[styles.circleBackground, { width: size, height: size }]}>
          <View
            style={{
              width: radius * 2,
              height: radius * 2,
              borderRadius: radius,
              borderWidth: strokeWidth,
              borderColor: backgroundColor,
            }}
          />
        </View>
      </View>
      <AnimatedView style={rotateAnimatedStyle}>
        <View style={{ width: size, height: size }}>
          <View
            style={{
              width: radius * 2,
              height: radius * 2,
              borderRadius: radius,
              borderWidth: strokeWidth,
              borderColor: color,
              borderTopColor: "transparent",
              borderRightColor: "transparent",
            }}
          />
        </View>
      </AnimatedView>
      {showPercentage && (
        <View style={StyleSheet.absoluteFill}>
          <Text style={[styles.percentageText, { fontSize: size * 0.25 }]}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
      )}
    </View>
  );
};

export interface LoadingDotsProps {
  size?: "small" | "medium" | "large";
  color?: string;
  style?: ViewStyle;
}

interface LoadingDotProps {
  index: number;
  dotSize: number;
  gap: number;
  color: string;
}

const LoadingDot: React.FC<LoadingDotProps> = ({
  index,
  dotSize,
  gap,
  color,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * 150,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, [index, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -dotSize]) },
    ],
    opacity: interpolate(progress.value, [0, 1], [0.5, 1]),
  }));

  return (
    <AnimatedView
      style={[
        styles.dot,
        {
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: color,
          marginHorizontal: gap / 2,
        },
        animatedStyle,
      ]}
    />
  );
};

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  size = "medium",
  color = Colors.primary[500],
  style,
}) => {
  const sizeMap = {
    small: { dotSize: 6, gap: 4 },
    medium: { dotSize: 10, gap: 6 },
    large: { dotSize: 14, gap: 8 },
  };

  const config = sizeMap[size];

  return (
    <View style={[styles.dotsContainer, style]}>
      {[0, 1, 2].map((index) => (
        <LoadingDot
          key={index}
          index={index}
          dotSize={config.dotSize}
          gap={config.gap}
          color={color}
        />
      ))}
    </View>
  );
};

export interface BrandLoaderProps {
  size?: "small" | "medium" | "large";
  style?: ViewStyle;
  showText?: boolean;
  text?: string;
}

export const BrandLoader: React.FC<BrandLoaderProps> = ({
  size = "medium",
  style,
  showText = true,
  text = "AiNeed",
}) => {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0.5);
  const rotation = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  const sizeMap = {
    small: { logoSize: 40, fontSize: 12 },
    medium: { logoSize: 60, fontSize: 16 },
    large: { logoSize: 80, fontSize: 20 },
  };

  const config = sizeMap[size];

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withSpring(1.1, { damping: 8, stiffness: 100 }),
        withSpring(0.9, { damping: 8, stiffness: 100 }),
      ),
      -1,
      true,
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0.6, { duration: 600 }),
      ),
      -1,
      true,
    );

    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1,
      false,
    );

    textOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation.value}deg` }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View style={[styles.brandLoaderContainer, style]}>
      <View style={{ width: config.logoSize, height: config.logoSize }}>
        <AnimatedView style={[StyleSheet.absoluteFill, ringAnimatedStyle]}>
          <View
            style={[
              styles.brandRing,
              {
                width: config.logoSize,
                height: config.logoSize,
                borderRadius: config.logoSize / 2,
              },
            ]}
          >
            <LinearGradient
              colors={["#667EEA", "#764BA2", "#667EEA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        </AnimatedView>
        <AnimatedView style={[styles.brandLogoInner, logoAnimatedStyle]}>
          <LinearGradient
            colors={["#667EEA", "#764BA2"]}
            style={[
              styles.brandLogoGradient,
              {
                width: config.logoSize * 0.7,
                height: config.logoSize * 0.7,
                borderRadius: (config.logoSize * 0.7) / 4,
              },
            ]}
          >
            <Ionicons name="shirt" size={config.logoSize * 0.35} color="#fff" />
          </LinearGradient>
        </AnimatedView>
      </View>
      {showText && (
        <AnimatedText
          style={[
            styles.brandText,
            { fontSize: config.fontSize },
            textAnimatedStyle,
          ]}
        >
          {text}
        </AnimatedText>
      )}
    </View>
  );
};

export interface SkeletonListProps {
  count?: number;
  variant?: "product" | "article" | "profile" | "list" | "outfit";
  columns?: number;
  style?: ViewStyle;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 4,
  variant = "product",
  columns = 1,
  style,
}) => {
  return (
    <View style={[styles.skeletonList, style]}>
      {Array(count)
        .fill(0)
        .map((_, index) => (
          <View
            key={index}
            style={{
              width: columns > 1 ? `${100 / columns - 2}%` : "100%",
              marginBottom: 12,
              marginHorizontal: columns > 1 ? "1%" : 0,
            }}
          >
            <SkeletonCard variant={variant} />
          </View>
        ))}
    </View>
  );
};

export interface WaveLoaderProps {
  size?: number;
  color?: string;
  style?: ViewStyle;
}

interface WaveBarProps {
  index: number;
  size: number;
  color: string;
}

const WaveBar: React.FC<WaveBarProps> = ({ index, size, color }) => {
  const scaleY = useSharedValue(0.3);

  useEffect(() => {
    scaleY.value = withDelay(
      index * 100,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(0.3, { duration: 300, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, [index, scaleY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scaleY.value }],
  }));

  const barWidth = size / 8;
  const barHeight = size * 0.8;

  return (
    <AnimatedView
      style={[
        styles.waveBar,
        {
          width: barWidth,
          height: barHeight,
          backgroundColor: color,
          borderRadius: barWidth / 2,
          marginHorizontal: barWidth / 4,
        },
        animatedStyle,
      ]}
    />
  );
};

export const WaveLoader: React.FC<WaveLoaderProps> = ({
  size = 40,
  color = Colors.primary[500],
  style,
}) => {
  return (
    <View style={[styles.waveContainer, { height: size }, style]}>
      {[0, 1, 2, 3, 4].map((index) => (
        <WaveBar key={index} index={index} size={size} color={color} />
      ))}
    </View>
  );
};

export interface PulseLoaderProps {
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export const PulseLoader: React.FC<PulseLoaderProps> = ({
  size = 40,
  color = Colors.primary[500],
  style,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 600, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      false,
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ),
      -1,
      false,
    );
  }, []);

  const outerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.pulseContainer, { width: size, height: size }, style]}>
      <AnimatedView
        style={[
          styles.pulseOuter,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          outerAnimatedStyle,
        ]}
      />
      <View
        style={[
          styles.pulseInner,
          {
            width: size * 0.6,
            height: size * 0.6,
            borderRadius: size * 0.3,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
};

export interface OrbitLoaderProps {
  size?: number;
  color?: string;
  orbitColor?: string;
  style?: ViewStyle;
}

export const OrbitLoader: React.FC<OrbitLoaderProps> = ({
  size = 50,
  color = Colors.primary[500],
  orbitColor = Colors.primary[300],
  style,
}) => {
  const rotation = useSharedValue(0);
  const dotRotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1500, easing: Easing.linear }),
      -1,
      false,
    );

    dotRotation.value = withRepeat(
      withTiming(-360, { duration: 1500, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const orbitAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation.value}deg` }],
  }));

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${dotRotation.value}deg` }],
  }));

  const orbitSize = size * 0.8;
  const dotSize = size * 0.2;

  return (
    <View style={[styles.orbitContainer, { width: size, height: size }, style]}>
      <View
        style={[
          styles.orbitCenter,
          {
            width: size * 0.3,
            height: size * 0.3,
            borderRadius: size * 0.15,
            backgroundColor: color,
          },
        ]}
      />
      <AnimatedView
        style={[
          styles.orbitRing,
          {
            width: orbitSize,
            height: orbitSize,
            borderRadius: orbitSize / 2,
            borderWidth: 2,
            borderColor: orbitColor,
          },
          orbitAnimatedStyle,
        ]}
      >
        <AnimatedView style={dotAnimatedStyle}>
          <View
            style={[
              styles.orbitDot,
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: color,
              },
            ]}
          />
        </AnimatedView>
      </AnimatedView>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: "hidden",
  },
  shimmerContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  shimmer: {
    width: 400,
    height: "100%",
  },
  skeletonProductCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
  },
  skeletonContent: {
    padding: 12,
  },
  skeletonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skeletonArticleCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  skeletonArticleHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  skeletonArticleMeta: {
    marginLeft: 12,
    flex: 1,
  },
  skeletonProfileCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  skeletonStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 20,
  },
  skeletonStat: {
    alignItems: "center",
  },
  skeletonListItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
  },
  skeletonListContent: {
    marginLeft: 12,
    flex: 1,
  },
  skeletonOutfitCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
  },
  skeletonOutfitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  skeletonOutfitFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  skeletonList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  progressContainer: {
    alignItems: "center",
  },
  progressHeader: {
    marginBottom: 8,
  },
  progressLabel: {
    fontWeight: "600",
    color: Colors.neutral[700],
  },
  progressTrack: {
    borderRadius: 100,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 100,
  },
  circularContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  circleBackground: {
    alignItems: "center",
    justifyContent: "center",
  },
  percentageText: {
    fontWeight: "700",
    color: Colors.neutral[700],
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {},
  brandLoaderContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  brandRing: {
    borderWidth: 3,
    borderColor: "transparent",
  },
  brandLogoInner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  brandLogoGradient: {
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    marginTop: 16,
    fontWeight: "700",
    color: Colors.neutral[800],
    letterSpacing: 2,
  },
  waveContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  waveBar: {},
  pulseContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulseOuter: {
    position: "absolute",
  },
  pulseInner: {},
  orbitContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  orbitCenter: {},
  orbitRing: {
    position: "absolute",
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  orbitDot: {
    position: "absolute",
    top: -4,
    left: -4,
  },
});

export default {
  Skeleton,
  SkeletonCard,
  SkeletonList,
  ProgressIndicator,
  CircularProgress,
  LoadingDots,
  BrandLoader,
  WaveLoader,
  PulseLoader,
  OrbitLoader,
};

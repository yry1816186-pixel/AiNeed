import React, { useState, useCallback, useRef, useEffect, memo } from "react";
import {
  View,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  Text,
  Dimensions,
  ImageStyle,
  StyleProp,
} from "react-native";
import FastImage, { FastImageProps } from "react-native-fast-image";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../design-system/theme';

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * 图片加载状态
 */
type ImageLoadStatus = "loading" | "loaded" | "error";

/**
 * 骨架屏占位符组件
 */
const SkeletonPlaceholder: React.FC<{
  width: number | string;
  height: number | string;
  borderRadius: number;
  animationSpeed: number;
  style?: ViewStyle;
}> = ({ width, height, borderRadius, animationSpeed, style }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: animationSpeed,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: animationSpeed,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue, animationSpeed]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.3],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as DimensionValue,
          height: height as DimensionValue,
          borderRadius,
          backgroundColor: Colors.neutral[200],
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * 错误占位符组件 - 使用 React.memo 优化
 */
const ErrorPlaceholder = memo(function ErrorPlaceholder({
  width,
  height,
  borderRadius,
  onRetry,
  enableRetry,
  retryCount,
  maxRetryCount,
  style,
}: {
  width: number | string;
  height: number | string;
  borderRadius: number;
  onRetry?: () => void;
  enableRetry: boolean;
  retryCount: number;
  maxRetryCount: number;
  style?: ViewStyle;
}) {
  const canRetry = enableRetry && retryCount < maxRetryCount;

  return (
    <View
      style={[
        styles.errorContainer,
        {
          width: width as DimensionValue,
          height: height as DimensionValue,
          borderRadius,
        },
        style,
      ]}
    >
      <Ionicons name="image-outline" size={32} color={Colors.neutral[400]} />
      <Text style={styles.errorText}>加载失败</Text>
      {canRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.7}>
          <Text style={styles.retryText}>点击重试</Text>
        </TouchableOpacity>
      )}
      {retryCount > 0 && (
        <Text style={styles.retryCountText}>
          已重试 {retryCount}/{maxRetryCount} 次
        </Text>
      )}
    </View>
  );
});

/**
 * ImageWithPlaceholder 组件属性
 */
export interface ImageWithPlaceholderProps
  extends Omit<FastImageProps, "onLoad" | "onError" | "style"> {
  /** 图片源 */
  source: { uri: string; priority?: string } | number;
  /** 容器样式 */
  containerStyle?: ViewStyle;
  /** 图片样式 */
  style?: StyleProp<ImageStyle>;
  /** 占位符样式 */
  placeholderStyle?: ViewStyle;
  /** 错误占位符样式 */
  errorStyle?: ViewStyle;
  /** 是否显示加载动画 */
  showLoadingAnimation?: boolean;
  /** 加载动画速度 (ms) */
  animationSpeed?: number;
  /** 是否启用重试功能 */
  enableRetry?: boolean;
  /** 最大重试次数 */
  maxRetryCount?: number;
  /** 自定义加载占位符 */
  customPlaceholder?: React.ReactNode;
  /** 自定义错误占位符 */
  customError?: React.ReactNode;
  /** 加载完成回调 */
  onLoad?: () => void;
  /** 加载错误回调 */
  onError?: (error: Error) => void;
  /** 重试回调 */
  onRetry?: () => void;
  /** 图片缩放模式 */
  resizeMode?: "contain" | "cover" | "stretch" | "center";
  /** 是否为圆形图片 (用于头像等) */
  isCircular?: boolean;
  /** 圆角大小 */
  borderRadius?: number;
  /** 测试 ID */
  testID?: string;
}

/**
 * 高质量图片加载组件 - 使用 React.memo 优化
 *
 * 特性:
 * - 加载占位符 (骨架屏动画效果)
 * - 错误状态显示
 * - 自动重试功能
 * - 平滑过渡动画
 * - 支持圆形图片
 * - 完全类型安全
 *
 * @example
 * ```tsx
 * // 基础用法
 * <ImageWithPlaceholder
 *   source={{ uri: 'https://example.com/image.jpg' }}
 *   style={{ width: 200, height: 200 }}
 * />
 *
 * // 圆形头像
 * <ImageWithPlaceholder
 *   source={{ uri: avatarUrl }}
 *   style={{ width: 80, height: 80 }}
 *   isCircular
 * />
 *
 * // 带重试功能
 * <ImageWithPlaceholder
 *   source={{ uri: imageUrl }}
 *   style={{ width: 300, height: 200 }}
 *   enableRetry
 *   maxRetryCount={3}
 *   onRetry={() => console.log('Retrying...')}
 * />
 * ```
 */
export const ImageWithPlaceholder = memo(function ImageWithPlaceholder({
  source,
  containerStyle,
  style,
  placeholderStyle,
  errorStyle,
  showLoadingAnimation = true,
  animationSpeed = 1200,
  enableRetry = true,
  maxRetryCount = 3,
  customPlaceholder,
  customError,
  onLoad,
  onError,
  onRetry,
  resizeMode = "cover",
  isCircular = false,
  borderRadius: customBorderRadius,
  testID,
  ...props
}: ImageWithPlaceholderProps) {
  const [status, setStatus] = useState<ImageLoadStatus>("loading");
  const [retryCount, setRetryCount] = useState(0);
  const [imageKey, setImageKey] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const placeholderOpacity = useRef(new Animated.Value(1)).current;

  // 计算图片尺寸
  const imageStyle = StyleSheet.flatten(style) || {};
  const imageWidth = (imageStyle.width as number) || SCREEN_WIDTH;
  const imageHeight = (imageStyle.height as number) || 200;
  const borderRadius = customBorderRadius ?? (isCircular ? imageWidth / 2 : BorderRadius.lg);

  /**
   * 处理加载成功
   */
  const handleLoad = useCallback(() => {
    setStatus("loaded");
    onLoad?.();

    // 淡入图片
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(placeholderOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, placeholderOpacity, onLoad]);

  /**
   * 处理加载错误
   */
  const handleError = useCallback(() => {
    setStatus("error");
    const error = new Error("Image failed to load");
    onError?.(error);
  }, [onError]);

  /**
   * 处理重试
   */
  const handleRetry = useCallback(() => {
    if (retryCount >= maxRetryCount) {
      return;
    }

    setRetryCount((prev) => prev + 1);
    setStatus("loading");
    setImageKey((prev) => prev + 1);
    fadeAnim.setValue(0);
    placeholderOpacity.setValue(1);
    onRetry?.();
  }, [retryCount, maxRetryCount, fadeAnim, placeholderOpacity, onRetry]);

  /**
   * 渲染占位符
   */
  const renderPlaceholder = () => {
    if (status === "loaded") {
      return null;
    }

    if (status === "error") {
      return customError ? (
        <View style={[styles.placeholderWrapper, { borderRadius }]}>{customError}</View>
      ) : (
        <ErrorPlaceholder
          width={imageWidth}
          height={imageHeight}
          borderRadius={borderRadius}
          onRetry={handleRetry}
          enableRetry={enableRetry}
          retryCount={retryCount}
          maxRetryCount={maxRetryCount}
          style={errorStyle}
        />
      );
    }

    return customPlaceholder ? (
      <View style={[styles.placeholderWrapper, { borderRadius }]}>{customPlaceholder}</View>
    ) : showLoadingAnimation ? (
      <SkeletonPlaceholder
        width={imageWidth}
        height={imageHeight}
        borderRadius={borderRadius}
        animationSpeed={animationSpeed}
        style={placeholderStyle}
      />
    ) : (
      <View
        style={[
          styles.staticPlaceholder,
          {
            width: imageWidth,
            height: imageHeight,
            borderRadius,
          },
          placeholderStyle,
        ]}
      />
    );
  };

  return (
    <View style={[styles.container, containerStyle]} testID={testID}>
      {/* 占位符 */}
      <Animated.View style={[styles.placeholderContainer, { opacity: placeholderOpacity }]}>
        {renderPlaceholder()}
      </Animated.View>

      {/* 图片 */}
      {status !== "error" && (
        <Animated.View style={[styles.imageContainer, { opacity: fadeAnim }]}>
          <FastImage
            key={imageKey}
            source={source}
            style={[
              styles.image,
              {
                width: imageWidth,
                height: imageHeight,
                borderRadius,
              },
              style,
            ]}
            resizeMode={resizeMode}
            onLoad={handleLoad}
            onError={handleError}
            {...props}
          />
        </Animated.View>
      )}
    </View>
  );
});

/**
 * 预设变体组件
 */

/**
 * 头像图片组件 - 使用 React.memo 优化
 */
export interface AvatarImageProps extends Omit<ImageWithPlaceholderProps, "isCircular"> {
  size?: number;
}

export const AvatarImage = memo(function AvatarImage({
  size = 48,
  style,
  ...props
}: AvatarImageProps) {
  return (
    <ImageWithPlaceholder
      {...props}
      isCircular
      style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      enableRetry={false}
    />
  );
});

/**
 * 产品图片组件 - 使用 React.memo 优化
 */
export interface ProductImageProps extends ImageWithPlaceholderProps {
  aspectRatio?: number;
  width?: number;
}

export const ProductImage = memo(function ProductImage({
  aspectRatio = 0.75,
  width = SCREEN_WIDTH * 0.45,
  style,
  ...props
}: ProductImageProps) {
  return (
    <ImageWithPlaceholder
      {...props}
      style={[
        {
          width,
          height: width / aspectRatio,
          borderRadius: BorderRadius.lg,
        },
        style,
      ]}
    />
  );
});

/**
 * 横幅图片组件 - 使用 React.memo 优化
 */
export interface BannerImageProps extends ImageWithPlaceholderProps {
  height?: number;
}

export const BannerImage = memo(function BannerImage({
  height = 180,
  style,
  ...props
}: BannerImageProps) {
  return (
    <ImageWithPlaceholder
      {...props}
      style={[
        {
          width: SCREEN_WIDTH,
          height,
          borderRadius: 0,
        },
        style,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
  },
  placeholderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  placeholderWrapper: {
    overflow: "hidden",
  },
  staticPlaceholder: {
    backgroundColor: Colors.neutral[200],
  },
  imageContainer: {
    position: "relative",
    zIndex: 2,
  },
  image: {
    backgroundColor: "transparent",
  },
  errorContainer: {
    backgroundColor: Colors.neutral[100],
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing[4],
  },
  errorText: {
    ...Typography.body.sm,
    color: Colors.neutral[500],
    marginBottom: Spacing[3],
  },
  retryButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  retryText: {
    ...Typography.caption.md,
    color: Colors.white,
    fontWeight: "600",
  },
  retryCountText: {
    ...Typography.caption.sm,
    color: Colors.neutral[400],
    marginTop: Spacing[2],
  },
});

export default ImageWithPlaceholder;

import React, { useEffect, useCallback, memo, useMemo } from "react";
import { View, Text, StyleSheet, Image, Dimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import {
  Svg,
  Circle,
  Path,
  Text as SvgText,
} from "react-native-svg";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { theme, Colors, BorderRadius, Shadows } from '../../design-system/theme';
import { DesignTokens } from "../../theme/tokens/design-tokens";
import { SpringConfigs } from "../../theme/tokens/animations";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { AnimatedHeartButton } from "../../design-system/ui/AnimatedHeartButton";
import { ActionButtons } from "./ActionButtons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.65;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;
const VERTICAL_SWIPE_THRESHOLD = SCREEN_HEIGHT * 0.15;

export interface ProductItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  images: string[];
  category: string;
  colors: string[];
  sizes: string[];
  brand?: {
    id: string;
    name: string;
    logo?: string;
  };
  tags?: string[];
  score?: number;
  matchReasons?: string[];
}

interface SwipeCardProps {
  item: ProductItem;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  isActive: boolean;
  index: number;
  isFavorite?: boolean;
  onFavorite?: (item: ProductItem) => void;
}

/**
 * 滑动卡片组件 - 使用 React.memo 优化
 * 避免其他卡片状态变化时不必要的重渲染
 */
export const SwipeCard = memo(function SwipeCard({
  item,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  isActive,
  index,
  isFavorite = false,
  onFavorite,
}: SwipeCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const _scale = useSharedValue(1);
  const rotateZ = useSharedValue(0);

  const stackScale = useSharedValue(0.9);
  const stackTranslateY = useSharedValue(20);
  const stackOpacity = useSharedValue(0.7);
  const { reducedMotion, reducedMotionSV } = useReducedMotion();

  useEffect(() => {
    if (!isActive) {
      if (reducedMotion) {
        stackScale.value = withTiming(0.9, { duration: 0 });
        stackTranslateY.value = withTiming(20, { duration: 0 });
        stackOpacity.value = withTiming(0.7, { duration: 0 });
      } else {
        stackScale.value = withSpring(0.9, { damping: 15, stiffness: 150 });
        stackTranslateY.value = withSpring(20, { damping: 15, stiffness: 150 });
        stackOpacity.value = withTiming(0.7, { duration: 200 });
      }
    } else {
      if (reducedMotion) {
        stackScale.value = withTiming(1, { duration: 0 });
        stackTranslateY.value = withTiming(0, { duration: 0 });
        stackOpacity.value = withTiming(1, { duration: 0 });
      } else {
        stackScale.value = withSpring(1, { damping: 15, stiffness: 150 });
        stackTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 });
        stackOpacity.value = withTiming(1, { duration: 200 });
      }
    }
  }, [isActive, reducedMotion]);

  const handleSwipeEnd = useCallback(() => {
    const xVal = translateX.value;
    const yVal = translateY.value;

    if (yVal < -VERTICAL_SWIPE_THRESHOLD) {
      translateY.value = withTiming(-SCREEN_HEIGHT, { duration: reducedMotionSV.value ? 0 : 300 });
      setTimeout(() => onSwipeUp(), reducedMotionSV.value ? 0 : 200);
      return;
    }

    if (yVal > VERTICAL_SWIPE_THRESHOLD) {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: reducedMotionSV.value ? 0 : 300 });
      setTimeout(() => onSwipeDown(), reducedMotionSV.value ? 0 : 200);
      return;
    }

    if (xVal > SWIPE_THRESHOLD) {
      translateX.value = withTiming(SCREEN_WIDTH * 1.5, {
        duration: reducedMotionSV.value ? 0 : 300,
      });
      rotateZ.value = withTiming(0.3, { duration: reducedMotionSV.value ? 0 : 300 });
      setTimeout(() => onSwipeRight(), reducedMotionSV.value ? 0 : 200);
      return;
    }

    if (xVal < -SWIPE_THRESHOLD) {
      translateX.value = withTiming(-SCREEN_WIDTH * 1.5, {
        duration: reducedMotionSV.value ? 0 : 300,
      });
      rotateZ.value = withTiming(-0.3, { duration: reducedMotionSV.value ? 0 : 300 });
      setTimeout(() => onSwipeLeft(), reducedMotionSV.value ? 0 : 200);
      return;
    }

    if (reducedMotionSV.value) {
      translateX.value = withTiming(0, { duration: 0 });
      translateY.value = withTiming(0, { duration: 0 });
      rotateZ.value = withTiming(0, { duration: 0 });
    } else {
      translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
      rotateZ.value = withSpring(0, { damping: 15, stiffness: 200 });
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, reducedMotionSV]);

  const triggerDislike = useCallback(() => {
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: reducedMotionSV.value ? 0 : 300 });
    setTimeout(() => onSwipeDown(), reducedMotionSV.value ? 0 : 200);
  }, [onSwipeDown, reducedMotionSV]);

  const triggerSkip = useCallback(() => {
    translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: reducedMotionSV.value ? 0 : 300 });
    rotateZ.value = withTiming(-0.3, { duration: reducedMotionSV.value ? 0 : 300 });
    setTimeout(() => onSwipeLeft(), reducedMotionSV.value ? 0 : 200);
  }, [onSwipeLeft, reducedMotionSV]);

  const triggerCart = useCallback(() => {
    translateY.value = withTiming(-SCREEN_HEIGHT, { duration: reducedMotionSV.value ? 0 : 300 });
    setTimeout(() => onSwipeUp(), reducedMotionSV.value ? 0 : 200);
  }, [onSwipeUp, reducedMotionSV]);

  const triggerLike = useCallback(() => {
    translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: reducedMotionSV.value ? 0 : 300 });
    rotateZ.value = withTiming(0.3, { duration: reducedMotionSV.value ? 0 : 300 });
    setTimeout(() => onSwipeRight(), reducedMotionSV.value ? 0 : 200);
  }, [onSwipeRight, reducedMotionSV]);

  const panGesture = Gesture.Pan()
    .enabled(isActive)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      rotateZ.value = interpolate(
        event.translationX,
        [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        [-0.15, 0, 0.15],
        Extrapolate.CLAMP
      );
    })
    .onEnd(() => {
      runOnJS(handleSwipeEnd)();
    });

  const cardStyle = useAnimatedStyle(() => {
    const _likeOpacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolate.CLAMP
    );
    const _nopeOpacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP
    );
    const _cartOpacity = interpolate(
      translateY.value,
      [-VERTICAL_SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP
    );
    const _skipOpacity = interpolate(
      translateY.value,
      [0, VERTICAL_SWIPE_THRESHOLD],
      [0, 1],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${rotateZ.value}rad` },
        { scale: isActive ? stackScale.value : stackScale.value * 0.95 },
      ],
      opacity: stackOpacity.value,
    };
  });

  const likeIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolate.CLAMP),
    transform: [{ rotateZ: "-20deg" }],
  }));

  const nopeIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolate.CLAMP),
    transform: [{ rotateZ: "20deg" }],
  }));

  const cartIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [-VERTICAL_SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP
    ),
  }));

  const skipIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, VERTICAL_SWIPE_THRESHOLD],
      [0, 1],
      Extrapolate.CLAMP
    ),
  }));

  // 使用 useMemo 缓存图片 URL，避免每次渲染重新计算
  const mainImage = useMemo(
    () => item.images?.[0] || `https://picsum.photos/400/500?random=${item.id}`,
    [item.images, item.id]
  );

  return (
    <View style={styles.outerWrapper} pointerEvents={isActive ? "box-none" : "none"}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.cardContainer, cardStyle]} accessibilityLabel={`${item.name}，左滑跳过，右滑喜欢`} accessibilityRole="button">
        <View style={styles.card}>
          <Image source={{ uri: mainImage }} style={styles.cardImage} resizeMode="cover" accessibilityLabel={`${item.name}图片`} accessibilityRole="image" />

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.8)"]}
            style={styles.cardGradient}
          />

          <Animated.View style={[styles.indicator, styles.likeIndicator, likeIndicatorStyle]}>
            <Text style={styles.likeText}>喜欢</Text>
          </Animated.View>

          <Animated.View style={[styles.indicator, styles.nopeIndicator, nopeIndicatorStyle]}>
            <Text style={styles.nopeText}>跳过</Text>
          </Animated.View>

          <Animated.View style={[styles.indicator, styles.cartIndicator, cartIndicatorStyle]}>
            <Ionicons name="cart" size={32} color={Colors.success[500]} />
            <Text style={styles.cartText}>加入购物车</Text>
          </Animated.View>

          <Animated.View style={[styles.indicator, styles.skipIndicator, skipIndicatorStyle]}>
            <Ionicons name="close-circle" size={32} color={Colors.neutral[500]} />
            <Text style={styles.skipText}>不喜欢</Text>
          </Animated.View>

          <View style={styles.cardInfo}>
            {item.brand && <Text style={styles.brandText}>{item.brand.name}</Text>}
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>

            <View style={styles.priceRow}>
              <Text style={styles.priceText}>¥{item.price.toLocaleString()}</Text>
              {item.originalPrice && item.originalPrice > item.price && (
                <Text style={styles.originalPriceText}>¥{item.originalPrice.toLocaleString()}</Text>
              )}
              {onFavorite && (
                <AnimatedHeartButton
                  isFavorite={isFavorite}
                  onPress={() => onFavorite(item)}
                  size={22}
                  style={styles.heartButton}
                />
              )}
            </View>

            {/* 7-point rating bar */}
            {item.score !== null && (
              <View style={styles.ratingBar}>
                {Array.from({ length: 7 }, (_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.ratingDot,
                      {
                        backgroundColor:
                          i < Math.round(item.score! * 7)
                            ? Colors.success[500]
                            : "rgba(255,255,255,0.2)",
                      },
                    ]}
                  />
                ))}
                <Text style={styles.ratingLabel}>{Math.round((item.score ?? 0) * 100)}%</Text>
              </View>
            )}

            {item.matchReasons && item.matchReasons.length > 0 && (
              <View style={styles.matchReasons}>
                {item.matchReasons.slice(0, 2).map((reason, _idx) => (
                  <View key={reason} style={styles.reasonTag}>
                    <Text style={styles.reasonText}>{reason}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Primary recommendation reason */}
            {item.matchReasons && item.matchReasons.length > 0 && (
              <View style={styles.reasonPill}>
                <Text style={styles.reasonPillText} numberOfLines={1}>
                  {item.matchReasons[0]}
                </Text>
              </View>
            )}

            {item.colors && item.colors.length > 0 && (
              <View style={styles.colorOptions}>
                {item.colors.slice(0, 5).map((color, _idx) => (
                  <View
                    key={color}
                    style={[styles.colorDot, { backgroundColor: color.toLowerCase() }]}
                  />
                ))}
                {item.colors.length > 5 && (
                  <Text style={styles.moreColors}>+{item.colors.length - 5}</Text>
                )}

                {/* Color harmony arc */}
                {item.score !== null && item.score !== undefined && (
                  <View style={styles.harmonyArcContainer}>
                    <ColorHarmonyArc score={item.score!} />
                  </View>
                )}

                {/* CIEDE2000 distance arc */}
                {item.score !== null && item.score !== undefined && item.colors.length > 0 && (
                  <View style={styles.ciedeArcContainer}>
                    <CIEDE2000Arc score={item.score!} colors={item.colors} />
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Animated.View>
      </GestureDetector>
      {isActive && (
        <View style={styles.actionButtonsPosition} pointerEvents="box-none">
          <ActionButtons
            onDislike={triggerDislike}
            onSkip={triggerSkip}
            onAddToCart={triggerCart}
            onLike={triggerLike}
          />
        </View>
      )}
    </View>
  );
});

/** Color harmony arc - shows how harmonious item colors are with user palette */
function ColorHarmonyArc({ score }: { score: number }) {
  const size = 40;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // semicircle
  const fillLength = circumference * score;
  const center = size / 2;

  return (
    <Svg width={size} height={size / 2 + 2} viewBox={`0 0 ${size} ${size / 2 + 2}`}>
      {/* Background arc (semicircle) */}
      <Path
        d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${
          size - strokeWidth / 2
        } ${size / 2}`}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />
      {/* Filled arc based on score */}
      <Path
        d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${
          size - strokeWidth / 2
        } ${size / 2}`}
        stroke={DesignTokens.colors.brand.terracotta}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${fillLength} ${circumference}`}
      />
      {/* Percentage label */}
      <SvgText
        x={center}
        y={size / 2 - 2}
        textAnchor="middle"
        fontSize={9}
        fontWeight="600"
        fill={DesignTokens.colors.text.inverse}
      >
        {Math.round(score * 100)}%
      </SvgText>
    </Svg>
  );
}

/** CIEDE2000 color distance arc indicator */
function CIEDE2000Arc({ score, colors: itemColors }: { score: number; colors: string[] }) {
  const size = 50;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillLength = circumference * score;
  const center = size / 2;

  // Position up to 5 color dots along the arc
  const dotCount = Math.min(itemColors.length, 5);
  const dots = Array.from({ length: dotCount }, (_, i) => {
    const angle = (Math.PI * 2 * i) / dotCount - Math.PI / 2;
    const dotRadius = radius + strokeWidth / 2 + 4;
    const x = center + dotRadius * Math.cos(angle);
    const y = center + dotRadius * Math.sin(angle);
    return { x, y, color: itemColors[i] };
  });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background circle */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Score arc */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={DesignTokens.colors.brand.terracotta}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${fillLength} ${circumference}`}
        strokeLinecap="round"
        rotation="-90"
        originX={center}
        originY={center}
      />
      {/* Color dots along the arc */}
      {dots.map((dot, i) => (
        <Circle
          key={`dot-${i}`}
          cx={dot.x}
          cy={dot.y}
          r={3}
          fill={dot.color.toLowerCase()}
          stroke="rgba(255,255,255,0.6)"
          strokeWidth={1}
        />
      ))}
    </Svg>
  );
}

export const SWIPE_CARD_CONSTANTS = {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  CARD_WIDTH,
  CARD_HEIGHT,
  SWIPE_THRESHOLD,
  VERTICAL_SWIPE_THRESHOLD,
};

const BUTTONS_AREA_HEIGHT = 80;

const styles = StyleSheet.create({
  outerWrapper: {
    position: "absolute",
    width: CARD_WIDTH,
    height: CARD_HEIGHT + BUTTONS_AREA_HEIGHT,
    alignItems: "center",
  },
  cardContainer: {
    position: "absolute",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  card: {
    flex: 1,
    borderRadius: BorderRadius["3xl"],
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
    ...Shadows.xl,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  cardGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
  },
  indicator: {
    position: "absolute",
    padding: 10,
    borderRadius: 10,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  likeIndicator: {
    top: 50,
    left: 20,
    borderColor: Colors.success[500],
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  likeText: {
    fontSize: DesignTokens.typography.sizes['3xl'],
    fontWeight: "800",
    color: Colors.success[500],
  },
  nopeIndicator: {
    top: 50,
    right: 20,
    borderColor: Colors.rose[500],
    backgroundColor: "rgba(244, 63, 94, 0.1)",
  },
  nopeText: {
    fontSize: DesignTokens.typography.sizes['3xl'],
    fontWeight: "800",
    color: Colors.rose[500],
  },
  cartIndicator: {
    top: 100,
    alignSelf: "center",
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    padding: 16,
    borderRadius: 20,
    alignItems: "center",
  },
  cartText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "700",
    color: Colors.success[500],
    marginTop: 4,
  },
  skipIndicator: {
    top: 100,
    alignSelf: "center",
    backgroundColor: "rgba(161, 161, 170, 0.2)",
    padding: 16,
    borderRadius: 20,
    alignItems: "center",
  },
  skipText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "700",
    color: Colors.neutral[600],
    marginTop: 4,
  },
  cardInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 24,
  },
  brandText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
    letterSpacing: 1,
  },
  productName: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: DesignTokens.colors.text.inverse,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 12,
  },
  heartButton: {
    marginLeft: "auto",
  },
  priceText: {
    fontSize: DesignTokens.typography.sizes['2xl'],
    fontWeight: "800",
    color: DesignTokens.colors.text.inverse,
  },
  originalPriceText: {
    fontSize: DesignTokens.typography.sizes.md,
    color: "rgba(255,255,255,0.6)",
    textDecorationLine: "line-through",
  },
  matchReasons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  reasonTag: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reasonText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.text.inverse,
    fontWeight: "500",
  },
  colorOptions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  moreColors: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  ratingBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
  },
  ratingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ratingLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: Colors.success[500],
    marginLeft: 6,
  },
  reasonPill: {
    backgroundColor: "rgba(198,123,92,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  reasonPillText: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "500",
    color: "#F5D5C5", // custom color
  },
  harmonyArcContainer: {
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  ciedeArcContainer: {
    marginLeft: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonsPosition: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
});

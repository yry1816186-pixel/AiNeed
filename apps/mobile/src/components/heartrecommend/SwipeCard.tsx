import React, { useEffect, useCallback, memo, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
} from "react-native";
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
import { LinearGradient } from '@/src/polyfills/expo-linear-gradient';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { theme, Colors, BorderRadius, Shadows } from "../../theme";

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
}: SwipeCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotateZ = useSharedValue(0);

  const stackScale = useSharedValue(0.9);
  const stackTranslateY = useSharedValue(20);
  const stackOpacity = useSharedValue(0.7);

  useEffect(() => {
    if (!isActive) {
      stackScale.value = withSpring(0.9, { damping: 15, stiffness: 150 });
      stackTranslateY.value = withSpring(20, { damping: 15, stiffness: 150 });
      stackOpacity.value = withTiming(0.7, { duration: 200 });
    } else {
      stackScale.value = withSpring(1, { damping: 15, stiffness: 150 });
      stackTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      stackOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [isActive]);

  const handleSwipeEnd = useCallback(() => {
    const xVal = translateX.value;
    const yVal = translateY.value;

    if (yVal < -VERTICAL_SWIPE_THRESHOLD) {
      translateY.value = withTiming(-SCREEN_HEIGHT, { duration: 300 });
      setTimeout(() => onSwipeUp(), 200);
      return;
    }

    if (yVal > VERTICAL_SWIPE_THRESHOLD) {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 });
      setTimeout(() => onSwipeDown(), 200);
      return;
    }

    if (xVal > SWIPE_THRESHOLD) {
      translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 });
      rotateZ.value = withTiming(0.3, { duration: 300 });
      setTimeout(() => onSwipeRight(), 200);
      return;
    }

    if (xVal < -SWIPE_THRESHOLD) {
      translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 });
      rotateZ.value = withTiming(-0.3, { duration: 300 });
      setTimeout(() => onSwipeLeft(), 200);
      return;
    }

    translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
    rotateZ.value = withSpring(0, { damping: 15, stiffness: 200 });
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  const panGesture = Gesture.Pan()
    .enabled(isActive)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      rotateZ.value = interpolate(
        event.translationX,
        [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        [-0.15, 0, 0.15],
        Extrapolate.CLAMP,
      );
    })
    .onEnd(() => {
      runOnJS(handleSwipeEnd)();
    });

  const cardStyle = useAnimatedStyle(() => {
    const likeOpacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolate.CLAMP,
    );
    const nopeOpacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP,
    );
    const cartOpacity = interpolate(
      translateY.value,
      [-VERTICAL_SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP,
    );
    const skipOpacity = interpolate(
      translateY.value,
      [0, VERTICAL_SWIPE_THRESHOLD],
      [0, 1],
      Extrapolate.CLAMP,
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
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolate.CLAMP,
    ),
    transform: [{ rotateZ: "-20deg" }],
  }));

  const nopeIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP,
    ),
    transform: [{ rotateZ: "20deg" }],
  }));

  const cartIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [-VERTICAL_SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP,
    ),
  }));

  const skipIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, VERTICAL_SWIPE_THRESHOLD],
      [0, 1],
      Extrapolate.CLAMP,
    ),
  }));

  // 使用 useMemo 缓存图片 URL，避免每次渲染重新计算
  const mainImage = useMemo(
    () => item.images?.[0] || `https://picsum.photos/400/500?random=${item.id}`,
    [item.images, item.id]
  );

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.cardContainer, cardStyle]}>
        <View style={styles.card}>
          <Image
            source={{ uri: mainImage }}
            style={styles.cardImage}
            resizeMode="cover"
          />

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.8)"]}
            style={styles.cardGradient}
          />

          <Animated.View
            style={[styles.indicator, styles.likeIndicator, likeIndicatorStyle]}
          >
            <Text style={styles.likeText}>喜欢</Text>
          </Animated.View>

          <Animated.View
            style={[styles.indicator, styles.nopeIndicator, nopeIndicatorStyle]}
          >
            <Text style={styles.nopeText}>跳过</Text>
          </Animated.View>

          <Animated.View
            style={[styles.indicator, styles.cartIndicator, cartIndicatorStyle]}
          >
            <Ionicons name="cart" size={32} color={Colors.success[500]} />
            <Text style={styles.cartText}>加入购物车</Text>
          </Animated.View>

          <Animated.View
            style={[styles.indicator, styles.skipIndicator, skipIndicatorStyle]}
          >
            <Ionicons
              name="close-circle"
              size={32}
              color={Colors.neutral[500]}
            />
            <Text style={styles.skipText}>不喜欢</Text>
          </Animated.View>

          <View style={styles.cardInfo}>
            {item.brand && (
              <Text style={styles.brandText}>{item.brand.name}</Text>
            )}
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>

            <View style={styles.priceRow}>
              <Text style={styles.priceText}>
                ¥{item.price.toLocaleString()}
              </Text>
              {item.originalPrice && item.originalPrice > item.price && (
                <Text style={styles.originalPriceText}>
                  ¥{item.originalPrice.toLocaleString()}
                </Text>
              )}
            </View>

            {item.matchReasons && item.matchReasons.length > 0 && (
              <View style={styles.matchReasons}>
                {item.matchReasons.slice(0, 2).map((reason, idx) => (
                  <View key={idx} style={styles.reasonTag}>
                    <Text style={styles.reasonText}>{reason}</Text>
                  </View>
                ))}
              </View>
            )}

            {item.colors && item.colors.length > 0 && (
              <View style={styles.colorOptions}>
                {item.colors.slice(0, 5).map((color, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.colorDot,
                      { backgroundColor: color.toLowerCase() },
                    ]}
                  />
                ))}
                {item.colors.length > 5 && (
                  <Text style={styles.moreColors}>
                    +{item.colors.length - 5}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
});

export const SWIPE_CARD_CONSTANTS = {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  CARD_WIDTH,
  CARD_HEIGHT,
  SWIPE_THRESHOLD,
  VERTICAL_SWIPE_THRESHOLD,
};

const styles = StyleSheet.create({
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
    fontSize: 28,
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
    fontSize: 28,
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
    fontSize: 16,
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
    fontSize: 16,
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
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
    letterSpacing: 1,
  },
  productName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 12,
  },
  priceText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
  },
  originalPriceText: {
    fontSize: 16,
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
    fontSize: 12,
    color: "#fff",
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
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
});

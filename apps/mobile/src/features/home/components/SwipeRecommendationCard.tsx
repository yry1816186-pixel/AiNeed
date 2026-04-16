import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Animated,
  PanResponder,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from "react-native";
import { DesignTokens } from "../../theme/tokens/design-tokens";
import type { FeedItem } from "../../services/api/recommendation-feed.api";
import { Spacing } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';


interface SwipeRecommendationCardProps {
  item: FeedItem;
  onLike: (item: FeedItem) => void;
  onDislike: (item: FeedItem) => void;
  onSkip: (item: FeedItem) => void;
}

const SWIPE_THRESHOLD = 100;

export function SwipeRecommendationCard({
  item,
  onLike,
  onDislike,
  onSkip,
}: SwipeRecommendationCardProps) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const pan = useRef(new Animated.ValueXY()).current;
  const _rotate = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (
        _e: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          onLike(item);
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          onDislike(item);
        } else if (gestureState.dy < -SWIPE_THRESHOLD) {
          onSkip(item);
        }
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  const likeOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const dislikeOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const cardRotate = pan.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: ["-15deg", "0deg", "15deg"],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate: cardRotate }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Image source={{ uri: item.mainImage }} style={styles.image as ViewStyle} resizeMode="cover" />

      <Animated.View style={[styles.overlay, styles.likeOverlay, { opacity: likeOpacity }]}>
        <Text style={styles.likeText}>♥ 喜欢</Text>
      </Animated.View>

      <Animated.View style={[styles.overlay, styles.dislikeOverlay, { opacity: dislikeOpacity }]}>
        <Text style={styles.dislikeText}>✕ 不喜欢</Text>
      </Animated.View>

      <View style={styles.infoBar}>
        {item.brand && <Text style={styles.brandName}>{item.brand.name}</Text>}
        <Text style={styles.price}>¥{item.price}</Text>
        <Text style={styles.matchReason}>{item.matchReason}</Text>
      </View>

      <View style={styles.actionHints}>
        <Text style={styles.hintText}>← 不喜欢</Text>
        <Text style={styles.hintText}>↑ 跳过</Text>
        <Text style={styles.hintText}>喜欢 →</Text>
      </View>
    </Animated.View>
  );
}

const CARD_WIDTH = 300;
const CARD_HEIGHT = 420;

const useStyles = createStyles((colors) => ({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: DesignTokens.borderRadius.lg,
    backgroundColor: colors.surface,
    overflow: "hidden",
    elevation: 4,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: DesignTokens.spacing['0.5'] },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  image: {
    width: "100%",
    height: CARD_HEIGHT - 80,
  },
  overlay: {
    position: "absolute",
    top: DesignTokens.spacing[5],
    padding: Spacing.sm,
    borderRadius: 8,
    borderWidth: 3,
  },
  likeOverlay: {
    right: DesignTokens.spacing[5],
    borderColor: colors.success,
    backgroundColor: "rgba(74, 222, 128, 0.15)",
  },
  dislikeOverlay: {
    left: DesignTokens.spacing[5],
    borderColor: colors.error,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  likeText: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "800",
    color: colors.success,
  },
  dislikeText: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "800",
    color: colors.error,
  },
  infoBar: {
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: Spacing.sm,
    gap: DesignTokens.spacing['0.5'],
  },
  brandName: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
  },
  price: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  matchReason: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.primary,
    fontWeight: "500",
  },
  actionHints: {
    position: "absolute",
    bottom: Spacing.sm,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
  },
  hintText: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.textTertiary,
  },
}))

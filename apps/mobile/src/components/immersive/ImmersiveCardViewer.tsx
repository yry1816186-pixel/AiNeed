import React, { useCallback, useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Pressable,
  Platform,
  StatusBar,
} from "react-native";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  interpolate,
  Extrapolation,
  runOnJS,
  useAnimatedReaction,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DesignTokens } from "../../theme/tokens/design-tokens";
import { LinearGradient } from '@/src/polyfills/expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);
const AnimatedImage = AnimatedReanimated.createAnimatedComponent(Image);

export interface OutfitItem {
  id: string;
  name: string;
  brand?: string;
  price?: number;
  imageUrl: string;
  externalUrl?: string;
  category: string;
}

export interface OutfitCard {
  id: string;
  title: string;
  description: string;
  items: OutfitItem[];
  tags: string[];
  occasion?: string;
  style?: string;
  estimatedPrice?: number;
  imageUrl: string;
  likeCount?: number;
  viewCount?: number;
}

export interface ImmersiveCardViewerProps {
  cards: OutfitCard[];
  initialIndex?: number;
  onCardChange?: (index: number) => void;
  onLike?: (card: OutfitCard) => void;
  onDislike?: (card: OutfitCard) => void;
  onItemClick?: (item: OutfitItem) => void;
  onShare?: (card: OutfitCard) => void;
  onSave?: (card: OutfitCard) => void;
  onBack?: () => void;
  trackViewDuration?: boolean;
}

interface ViewTracker {
  cardId: string;
  startTime: number;
  endTime?: number;
  duration: number;
}

const SingleCard: React.FC<{
  card: OutfitCard;
  index: number;
  currentIndex: number;
  translateY: ReturnType<typeof useSharedValue<number>>;
  onLike: () => void;
  onDislike: () => void;
  onItemClick: (item: OutfitItem) => void;
}> = ({
  card,
  index,
  currentIndex,
  translateY,
  onLike,
  onDislike,
  onItemClick,
}) => {
  const isActive = index === currentIndex;
  const scale = useSharedValue(1);
  const likeOpacity = useSharedValue(0);
  const dislikeOpacity = useSharedValue(0);
  const itemModalVisible = useSharedValue(0);
  const [selectedItem, setSelectedItem] = useState<OutfitItem | null>(null);

  const animatedStyle = useAnimatedStyle(() => {
    const position = index - currentIndex;
    const inputRange = [-2, -1, 0, 1, 2];

    const translateYValue = interpolate(
      position,
      inputRange,
      [-SCREEN_HEIGHT * 2, -SCREEN_HEIGHT, 0, SCREEN_HEIGHT, SCREEN_HEIGHT * 2],
      Extrapolation.CLAMP,
    );

    const scaleValue = interpolate(
      position,
      inputRange,
      [0.8, 0.9, 1, 0.9, 0.8],
      Extrapolation.CLAMP,
    );

    const opacityValue = interpolate(
      position,
      inputRange,
      [0, 0.5, 1, 0.5, 0],
      Extrapolation.CLAMP,
    );

    return {
      transform: [
        { translateY: translateYValue + translateY.value * 0.3 },
        { scale: scaleValue * scale.value },
      ],
      opacity: opacityValue,
    };
  });

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: likeOpacity.value,
    transform: [
      { scale: interpolate(likeOpacity.value, [0, 1], [0.5, 1]) },
      { rotate: `${interpolate(likeOpacity.value, [0, 1], [-15, 0])}deg` },
    ],
  }));

  const dislikeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: dislikeOpacity.value,
    transform: [
      { scale: interpolate(dislikeOpacity.value, [0, 1], [0.5, 1]) },
      { rotate: `${interpolate(dislikeOpacity.value, [0, 1], [15, 0])}deg` },
    ],
  }));

  const handleDoubleTap = useCallback(() => {
    if (isActive) {
      likeOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(500, withTiming(0, { duration: 300 })),
      );
      onLike();
    }
  }, [isActive]);

  const tapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      runOnJS(handleDoubleTap)();
    });

  const handleItemPress = useCallback((item: OutfitItem) => {
    setSelectedItem(item);
    itemModalVisible.value = withTiming(1, { duration: 300 });
    onItemClick(item);
  }, []);

  return (
    <GestureDetector gesture={tapGesture}>
      <AnimatedView style={[styles.cardContainer, animatedStyle]}>
        <View style={styles.cardContent}>
          <Image
            source={{ uri: card.imageUrl }}
            style={styles.cardImage}
            resizeMode="cover"
          />

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.7)"]}
            style={styles.cardGradient}
          >
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardDescription} numberOfLines={2}>
                {card.description}
              </Text>

              <View style={styles.tagsContainer}>
                {card.tags.slice(0, 3).map((tag, i) => (
                  <View key={i} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.itemsPreview}>
                {card.items.slice(0, 4).map((item, i) => (
                  <Pressable
                    key={item.id}
                    style={[styles.itemThumbnail, { zIndex: 4 - i }]}
                    onPress={() => handleItemPress(item)}
                  >
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.itemImage}
                    />
                  </Pressable>
                ))}
                {card.items.length > 4 && (
                  <View style={styles.moreItems}>
                    <Text style={styles.moreItemsText}>
                      +{card.items.length - 4}
                    </Text>
                  </View>
                )}
              </View>

              {card.estimatedPrice && (
                <Text style={styles.priceText}>
                  预估总价 ¥{card.estimatedPrice.toLocaleString()}
                </Text>
              )}
            </View>
          </LinearGradient>

          <AnimatedView style={[styles.likeOverlay, likeAnimatedStyle]}>
            <View style={styles.likeBadge}>
              <Text style={styles.likeText}>喜欢</Text>
            </View>
          </AnimatedView>

          <AnimatedView style={[styles.dislikeOverlay, dislikeAnimatedStyle]}>
            <View style={styles.dislikeBadge}>
              <Text style={styles.dislikeText}>跳过</Text>
            </View>
          </AnimatedView>
        </View>
      </AnimatedView>
    </GestureDetector>
  );
};

export const ImmersiveCardViewer: React.FC<ImmersiveCardViewerProps> = ({
  cards,
  initialIndex = 0,
  onCardChange,
  onLike,
  onDislike,
  onItemClick,
  onShare,
  onSave,
  onBack,
  trackViewDuration = true,
}) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const translateY = useSharedValue(0);
  const viewTrackers = useRef<Map<string, ViewTracker>>(new Map());
  const [viewDurations, setViewDurations] = useState<Map<string, number>>(
    new Map(),
  );

  useEffect(() => {
    if (trackViewDuration && cards[currentIndex]) {
      const cardId = cards[currentIndex].id;
      viewTrackers.current.set(cardId, {
        cardId,
        startTime: Date.now(),
        duration: 0,
      });
    }

    return () => {
      if (trackViewDuration) {
        viewTrackers.current.forEach((tracker) => {
          if (!tracker.endTime) {
            tracker.endTime = Date.now();
            tracker.duration = tracker.endTime - tracker.startTime;
          }
        });
      }
    };
  }, [currentIndex, trackViewDuration]);

  const handleCardChange = useCallback(
    (newIndex: number) => {
      if (newIndex >= 0 && newIndex < cards.length) {
        if (trackViewDuration && cards[currentIndex]) {
          const prevTracker = viewTrackers.current.get(cards[currentIndex].id);
          if (prevTracker && !prevTracker.endTime) {
            prevTracker.endTime = Date.now();
            prevTracker.duration = prevTracker.endTime - prevTracker.startTime;
            setViewDurations((prev) => {
              const newMap = new Map(prev);
              newMap.set(prevTracker.cardId, prevTracker.duration);
              return newMap;
            });
          }
        }

        setCurrentIndex(newIndex);
        onCardChange?.(newIndex);
      }
    },
    [cards, currentIndex, onCardChange, trackViewDuration],
  );

  const handleLike = useCallback(() => {
    if (cards[currentIndex]) {
      onLike?.(cards[currentIndex]);
    }
  }, [cards, currentIndex, onLike]);

  const handleDislike = useCallback(() => {
    if (cards[currentIndex]) {
      onDislike?.(cards[currentIndex]);
      handleCardChange(currentIndex + 1);
    }
  }, [cards, currentIndex, onDislike, handleCardChange]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const threshold = SCREEN_HEIGHT * 0.15;

      if (event.translationY < -threshold) {
        runOnJS(handleCardChange)(currentIndex + 1);
      } else if (event.translationY > threshold) {
        runOnJS(handleCardChange)(currentIndex - 1);
      }

      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    });

  const currentCard = cards[currentIndex];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>

        <View style={styles.progressContainer}>
          {cards.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i === currentIndex && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={styles.headerButton}
            onPress={() => onShare?.(currentCard)}
          >
            <Text style={styles.headerButtonText}>分享</Text>
          </Pressable>
        </View>
      </View>

      <GestureDetector gesture={panGesture}>
        <View style={styles.cardsContainer}>
          {cards.map((card, index) => (
            <SingleCard
              key={card.id}
              card={card}
              index={index}
              currentIndex={currentIndex}
              translateY={translateY}
              onLike={handleLike}
              onDislike={handleDislike}
              onItemClick={onItemClick || (() => {})}
            />
          ))}
        </View>
      </GestureDetector>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable style={styles.actionButton} onPress={handleDislike}>
          <Text style={styles.actionButtonText}>跳过</Text>
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.likeButton]}
          onPress={handleLike}
        >
          <Text style={[styles.actionButtonText, styles.likeButtonText]}>
            喜欢
          </Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={() => onSave?.(currentCard)}
        >
          <Text style={styles.actionButtonText}>收藏</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.colors.neutral[900],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    color: "#fff",
    fontSize: 20,
  },
  progressContainer: {
    flexDirection: "row",
    gap: 6,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  progressDotActive: {
    backgroundColor: DesignTokens.colors.brand.terracotta,
    width: 20,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  cardsContainer: {
    flex: 1,
    position: "relative",
  },
  cardContainer: {
    position: "absolute",
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 180,
  },
  cardContent: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: DesignTokens.colors.neutral[800],
  },
  cardImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  cardGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 100,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  cardInfo: {
    gap: 12,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  cardDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  tagText: {
    fontSize: 12,
    color: "#fff",
  },
  itemsPreview: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  itemThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#fff",
    marginLeft: -12,
    overflow: "hidden",
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  moreItems: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#fff",
    marginLeft: -12,
    backgroundColor: DesignTokens.colors.brand.terracotta,
    alignItems: "center",
    justifyContent: "center",
  },
  moreItemsText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  priceText: {
    fontSize: 16,
    fontWeight: "600",
    color: DesignTokens.colors.brand.terracottaLight,
    marginTop: 4,
  },
  likeOverlay: {
    position: "absolute",
    top: 60,
    left: 30,
  },
  likeBadge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: DesignTokens.colors.semantic.success,
    backgroundColor: "transparent",
  },
  likeText: {
    fontSize: 32,
    fontWeight: "800",
    color: DesignTokens.colors.semantic.success,
  },
  dislikeOverlay: {
    position: "absolute",
    top: 60,
    right: 30,
  },
  dislikeBadge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: DesignTokens.colors.semantic.warning,
    backgroundColor: "transparent",
  },
  dislikeText: {
    fontSize: 32,
    fontWeight: "800",
    color: DesignTokens.colors.semantic.warning,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
    minWidth: 80,
    alignItems: "center",
  },
  likeButton: {
    backgroundColor: DesignTokens.colors.brand.terracotta,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  likeButtonText: {
    color: "#fff",
  },
});

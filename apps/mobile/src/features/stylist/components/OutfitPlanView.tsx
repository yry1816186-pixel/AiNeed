import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { DesignTokens } from "../../theme/tokens/design-tokens";
import { SpringConfigs, ListAnimations, Duration } from "../../theme/tokens/animations";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import type { OutfitPlanDetail } from "../../stores/aiStylistStore";
import type { AiStylistOutfitItem } from "../../services/api/ai-stylist.api";
import { ReasoningCard } from "./ReasoningCard";
import { WeatherBadge } from "./WeatherBadge";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OutfitPlanViewProps {
  plan: OutfitPlanDetail;
  onItemReplace: (outfitIndex: number, itemIndex: number) => void;
  onItemPress: (item: AiStylistOutfitItem) => void;
  onFeedback: (action: "like" | "dislike") => void;
}

const formatPrice = (price?: number | null) => {
  if (price === null || price === undefined) {
    return null;
  }
  return `\u00a5${price.toFixed(0)}`;
};

/** Animated item card with staggered bounce-in */
const AnimatedItemCard: React.FC<{
  item: AiStylistOutfitItem;
  itemIdx: number;
  cardWidth: number;
  onItemPress: (item: AiStylistOutfitItem) => void;
  onItemReplace: (outfitIndex: number, itemIndex: number) => void;
  activeOutfitIndex: number;
}> = ({ item, itemIdx, cardWidth, onItemPress, onItemReplace, activeOutfitIndex }) => {
  const { reducedMotion } = useReducedMotion();
  const scale = useSharedValue(reducedMotion ? 1 : 0.3);
  const opacity = useSharedValue(reducedMotion ? 1 : 0);
  const translateY = useSharedValue(reducedMotion ? 0 : 50);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }
    const staggerDelay = itemIdx * 100; // 100ms stagger as specified
    scale.value = withDelay(staggerDelay, withSpring(1, SpringConfigs.bouncy));
    opacity.value = withDelay(staggerDelay, withTiming(1, { duration: Duration.normal }));
    translateY.value = withDelay(staggerDelay, withSpring(0, SpringConfigs.bouncy));
  }, [itemIdx, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[styles.itemCard, { width: cardWidth }]}
        onPress={() => onItemPress(item)}
      >
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="cover" />
        ) : (
          <View style={styles.itemImagePlaceholder}>
            <Text style={styles.itemImagePlaceholderText}>{item.category}</Text>
          </View>
        )}
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
        {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}
        {formatPrice(item.price) && (
          <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
        )}
        <Pressable
          style={styles.replaceButton}
          onPress={() => onItemReplace(activeOutfitIndex, itemIdx)}
        >
          <Text style={styles.replaceButtonText}>Replace</Text>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
};

export const OutfitPlanView: React.FC<OutfitPlanViewProps> = ({
  plan,
  onItemReplace,
  onItemPress,
  onFeedback,
}) => {
  const [activeOutfitIndex, setActiveOutfitIndex] = useState(0);
  const activeOutfit = plan.outfits[activeOutfitIndex];

  if (!activeOutfit) {
    return null;
  }

  const totalItems = activeOutfit.items.length;
  const cardWidth = (SCREEN_WIDTH - 48 - (totalItems - 1) * 8) / Math.min(totalItems, 3);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{activeOutfit.title}</Text>
        {plan.weatherInfo && (
          <WeatherBadge
            temperature={plan.weatherInfo.temperature}
            condition={plan.weatherInfo.condition}
            suggestion={plan.weatherInfo.suggestion}
          />
        )}
      </View>

      {/* Outfit tabs */}
      {plan.outfits.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
          {plan.outfits.map((outfit, idx) => (
            <Pressable
              key={idx}
              style={[styles.tab, idx === activeOutfitIndex && styles.tabActive]}
              onPress={() => setActiveOutfitIndex(idx)}
            >
              <Text style={[styles.tabText, idx === activeOutfitIndex && styles.tabTextActive]}>
                {outfit.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Item cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.itemsRow}
      >
        {activeOutfit.items.map((item, itemIdx) => (
          <AnimatedItemCard
            key={`${item.itemId ?? itemIdx}-${itemIdx}`}
            item={item}
            itemIdx={itemIdx}
            cardWidth={cardWidth}
            onItemPress={onItemPress}
            onItemReplace={onItemReplace}
            activeOutfitIndex={activeOutfitIndex}
          />
        ))}
      </ScrollView>

      {/* Total price */}
      {activeOutfit.estimatedTotalPrice !== null && (
        <Text style={styles.totalPrice}>
          Total: {formatPrice(activeOutfit.estimatedTotalPrice)}
        </Text>
      )}

      {/* Reasoning */}
      <ReasoningCard reasons={plan.whyItFits} />

      {/* Feedback buttons */}
      <View style={styles.feedbackRow}>
        <Pressable style={styles.feedbackButton} onPress={() => onFeedback("like")}>
          <Text style={styles.feedbackButtonText}>Like</Text>
        </Pressable>
        <Pressable
          style={[styles.feedbackButton, styles.dislikeButton]}
          onPress={() => onFeedback("dislike")}
        >
          <Text style={[styles.feedbackButtonText, styles.dislikeButtonText]}>Dislike</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingVertical: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600", color: DesignTokens.colors.neutral[900] },
  tabBar: { marginBottom: 12, maxHeight: 40 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: DesignTokens.colors.neutral[100],
    marginRight: 8,
  },
  tabActive: { backgroundColor: DesignTokens.colors.brand.terracotta },
  tabText: { fontSize: DesignTokens.typography.sizes.base, color: DesignTokens.colors.neutral[600] },
  tabTextActive: { color: DesignTokens.colors.neutral.white, fontWeight: "500" },
  itemsRow: { paddingVertical: 4, gap: 8 },
  itemCard: {
    backgroundColor: DesignTokens.colors.backgrounds.elevated,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
  },
  itemImage: { width: "100%", height: 120, borderRadius: 8, marginBottom: 8 },
  itemImagePlaceholder: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    backgroundColor: DesignTokens.colors.neutral[100],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  itemImagePlaceholderText: { fontSize: DesignTokens.typography.sizes.sm, color: DesignTokens.colors.neutral[400] },
  itemName: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "500",
    color: DesignTokens.colors.neutral[800],
    marginBottom: 2,
  },
  itemBrand: { fontSize: DesignTokens.typography.sizes.xs, color: DesignTokens.colors.neutral[500], marginBottom: 2 },
  itemPrice: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: DesignTokens.colors.brand.terracotta,
    marginBottom: 6,
  },
  replaceButton: {
    backgroundColor: DesignTokens.colors.neutral[100],
    borderRadius: 6,
    paddingVertical: 4,
    alignItems: "center",
  },
  replaceButtonText: { fontSize: DesignTokens.typography.sizes.sm, color: DesignTokens.colors.neutral[600] },
  totalPrice: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[900],
    marginTop: 12,
    marginBottom: 8,
  },
  feedbackRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  feedbackButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: DesignTokens.colors.brand.terracotta,
    alignItems: "center",
  },
  dislikeButton: { backgroundColor: DesignTokens.colors.neutral[100] },
  feedbackButtonText: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "500", color: DesignTokens.colors.neutral.white },
  dislikeButtonText: { color: DesignTokens.colors.neutral[600] },
});

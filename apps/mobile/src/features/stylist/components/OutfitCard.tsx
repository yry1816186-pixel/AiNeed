import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  Linking,
  Dimensions,
} from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  interpolate,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import { DesignTokens } from "../../theme/tokens/design-tokens";
import {
  AiStylistResolution,
  AiStylistOutfitPlan,
  AiStylistOutfitItem,
} from "../../services/api/ai-stylist.api";

const { width: _SCREEN_WIDTH } = Dimensions.get("window");
const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);
const AnimatedPressable = AnimatedReanimated.createAnimatedComponent(Pressable);

const formatPrice = (price?: number | null) => {
  if (price === null || price === undefined) {
    return null;
  }
  return `¥${price.toFixed(0)}`;
};

export interface OutfitCardProps {
  result: AiStylistResolution;
  onItemPress?: (item: AiStylistOutfitItem) => void;
}

export const OutfitCard = React.memo(function OutfitCard({ result, onItemPress }: OutfitCardProps) {
  const [activeOutfitIndex, setActiveOutfitIndex] = useState(0);
  const containerOpacity = useSharedValue(0);
  const containerScale = useSharedValue(0.95);

  useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 400 });
    containerScale.value = withSpring(1, { damping: 15, stiffness: 150 });
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));

  const activeOutfit = result.outfits[activeOutfitIndex];

  const handleItemPress = (item: AiStylistOutfitItem) => {
    if (item.externalUrl) {
      void Linking.openURL(item.externalUrl);
    }
    onItemPress?.(item);
  };

  return (
    <AnimatedView style={[styles.container, containerStyle]}>
      <View style={styles.summarySection}>
        <LinearGradient
          colors={[DesignTokens.colors.brand.sage, DesignTokens.colors.brand.camel]}
          style={styles.summaryGradient}
        >
          <Ionicons name="sparkles" size={20} color={DesignTokens.colors.text.inverse} />
          <Text style={styles.summaryTitle}>穿搭方案</Text>
        </LinearGradient>
        <Text style={styles.summaryText}>{result.lookSummary}</Text>
      </View>

      <View style={styles.whySection}>
        <Text style={styles.whyTitle}>为什么适合你</Text>
        {result.whyItFits.map((reason, index) => (
          <View key={index} style={styles.reasonItem}>
            <View style={styles.reasonDot} />
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ))}
      </View>

      {result.outfits.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.outfitTabs}
        >
          {result.outfits.map((outfit, index) => (
            <Pressable
              key={index}
              style={[styles.outfitTab, index === activeOutfitIndex && styles.outfitTabActive]}
              onPress={() => setActiveOutfitIndex(index)}
            >
              <Text
                style={[
                  styles.outfitTabText,
                  index === activeOutfitIndex && styles.outfitTabTextActive,
                ]}
              >
                方案 {index + 1}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {activeOutfit && (
        <View style={styles.outfitSection}>
          <View style={styles.outfitHeader}>
            <Text style={styles.outfitTitle}>{activeOutfit.title}</Text>
            {activeOutfit.estimatedTotalPrice && (
              <Text style={styles.totalPrice}>
                总计 ¥{activeOutfit.estimatedTotalPrice.toFixed(0)}
              </Text>
            )}
          </View>

          {activeOutfit.styleExplanation.length > 0 && (
            <View style={styles.styleTags}>
              {activeOutfit.styleExplanation.map((tag, index) => (
                <View key={index} style={styles.styleTag}>
                  <Text style={styles.styleTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {activeOutfit.items.map((item, index) => (
            <OutfitItemCard
              key={`${item.category}-${index}`}
              item={item}
              index={index}
              onPress={() => handleItemPress(item)}
            />
          ))}
        </View>
      )}
    </AnimatedView>
  );
});

interface OutfitItemCardProps {
  item: AiStylistOutfitItem;
  index: number;
  onPress: () => void;
}

const OutfitItemCard = React.memo(function OutfitItemCard({ item, index, onPress }: OutfitItemCardProps) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(index * 100, withTiming(1, { duration: 300 }));
    translateX.value = withDelay(index * 100, withSpring(0, { damping: 15, stiffness: 150 }));
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  const hasLink = !!item.externalUrl;

  return (
    <AnimatedPressable
      style={[styles.itemCard, hasLink && styles.itemCardClickable, cardStyle]}
      onPress={hasLink ? onPress : undefined}
    >
      <View style={styles.itemImageContainer}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="cover" />
        ) : (
          <View style={styles.itemImagePlaceholder}>
            <Ionicons
              name={getCategoryIcon(item.category)}
              size={24}
              color={DesignTokens.colors.neutral[400]}
            />
          </View>
        )}
      </View>

      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemCategory}>{item.category}</Text>
          {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}
        </View>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.itemReason} numberOfLines={2}>
          {item.reason}
        </Text>
        <View style={styles.itemFooter}>
          {item.price && <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>}
          {hasLink && (
            <View style={styles.viewLink}>
              <Text style={styles.viewLinkText}>查看商品</Text>
              <Ionicons
                name="open-outline"
                size={14}
                color={DesignTokens.colors.brand.terracotta}
              />
            </View>
          )}
        </View>
      </View>

      {item.score && (
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>{Math.round(item.score)}%</Text>
        </View>
      )}
    </AnimatedPressable>
  );
});

const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    top: "shirt-outline",
    bottom: "ellipse-outline",
    dress: "female-outline",
    outerwear: "layers-outline",
    shoes: "footsteps-outline",
    accessories: "watch-outline",
    bag: "bag-outline",
  };
  return iconMap[category.toLowerCase()] || "cube-outline";
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: DesignTokens.colors.neutral[50],
    borderRadius: 20,
    overflow: "hidden",
    marginVertical: 8,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
  },
  summarySection: {
    padding: 16,
  },
  summaryGradient: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: DesignTokens.colors.text.inverse,
    marginLeft: 6,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
    color: DesignTokens.colors.neutral[800],
  },
  whySection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[200],
  },
  whyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[700],
    marginBottom: 10,
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  reasonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DesignTokens.colors.brand.sage,
    marginTop: 7,
    marginRight: 8,
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: DesignTokens.colors.neutral[600],
  },
  outfitTabs: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  outfitTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: DesignTokens.colors.neutral[100],
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
  },
  outfitTabActive: {
    backgroundColor: DesignTokens.colors.brand.sage + "20",
    borderColor: DesignTokens.colors.brand.sage,
  },
  outfitTabText: {
    fontSize: 13,
    fontWeight: "500",
    color: DesignTokens.colors.neutral[600],
  },
  outfitTabTextActive: {
    color: DesignTokens.colors.brand.sage,
    fontWeight: "600",
  },
  outfitSection: {
    padding: 16,
  },
  outfitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  outfitTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: DesignTokens.colors.neutral[900],
  },
  totalPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: DesignTokens.colors.brand.terracotta,
  },
  styleTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
  },
  styleTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  styleTagText: {
    fontSize: 12,
    color: DesignTokens.colors.neutral[600],
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
  },
  itemCardClickable: {
    shadowColor: DesignTokens.colors.neutral.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  itemImagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemCategory: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: DesignTokens.colors.brand.sage,
    fontWeight: "600",
  },
  itemBrand: {
    fontSize: 11,
    color: DesignTokens.colors.neutral[500],
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[900],
    marginTop: 2,
  },
  itemReason: {
    fontSize: 12,
    color: DesignTokens.colors.neutral[500],
    marginTop: 2,
    lineHeight: 16,
  },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: DesignTokens.colors.brand.terracotta,
  },
  viewLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewLinkText: {
    fontSize: 12,
    color: DesignTokens.colors.brand.terracotta,
    fontWeight: "500",
  },
  scoreBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: DesignTokens.colors.brand.sage,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: "700",
    color: DesignTokens.colors.text.inverse,
  },
});

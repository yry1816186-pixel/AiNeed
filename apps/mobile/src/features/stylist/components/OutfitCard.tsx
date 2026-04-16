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
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { Spacing, flatColors as colors } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import {
  AiStylistResolution,
  AiStylistOutfitPlan,
  AiStylistOutfitItem,
} from '../../../services/api/ai-stylist.api';

const { width: _SCREEN_WIDTH } = Dimensions.get("window");
const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);
const AnimatedPressable = AnimatedReanimated.createAnimatedComponent(Pressable);

const formatPrice = (price?: number | null) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
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
          colors={[colors.secondary, colors.primary]}
          style={styles.summaryGradient}
        >
          <Ionicons name="sparkles" size={20} color={colors.textInverse} />
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
                color={colors.primary}
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

const useStyles = createStyles((colors) => ({
  container: {
    backgroundColor: DesignTokens.colors.neutral[50],
    borderRadius: 20,
    overflow: "hidden",
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
  },
  summarySection: {
    padding: Spacing.md,
  },
  summaryGradient: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: DesignTokens.spacing['1.5'],
    borderRadius: 16,
    marginBottom: DesignTokens.spacing[3],
  },
  summaryTitle: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textInverse,
    marginLeft: DesignTokens.spacing['1.5'],
  },
  summaryText: {
    fontSize: DesignTokens.typography.sizes.base,
    lineHeight: 22,
    color: DesignTokens.colors.neutral[800],
  },
  whySection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[200],
  },
  whyTitle: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[700],
    marginBottom: DesignTokens.spacing['2.5'],
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: DesignTokens.spacing['1.5'],
  },
  reasonDot: {
    width: DesignTokens.spacing['1.5'],
    height: DesignTokens.spacing['1.5'],
    borderRadius: 3,
    backgroundColor: colors.secondary,
    marginTop: 7,
    marginRight: Spacing.sm,
  },
  reasonText: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.base,
    lineHeight: 20,
    color: DesignTokens.colors.neutral[600],
  },
  outfitTabs: {
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing[3],
    gap: Spacing.sm,
  },
  outfitTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 16,
    backgroundColor: DesignTokens.colors.neutral[100],
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
  },
  outfitTabActive: {
    backgroundColor: colors.secondary + "20",
    borderColor: colors.secondary,
  },
  outfitTabText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "500",
    color: DesignTokens.colors.neutral[600],
  },
  outfitTabTextActive: {
    color: colors.secondary,
    fontWeight: "600",
  },
  outfitSection: {
    padding: Spacing.md,
  },
  outfitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: DesignTokens.spacing[3],
  },
  outfitTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "700",
    color: DesignTokens.colors.neutral[900],
  },
  totalPrice: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.primary,
  },
  styleTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: DesignTokens.spacing['1.5'],
    marginBottom: Spacing.md,
  },
  styleTag: {
    paddingHorizontal: DesignTokens.spacing['2.5'],
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  styleTagText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.neutral[600],
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: DesignTokens.spacing[3],
    marginBottom: DesignTokens.spacing['2.5'],
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
  },
  itemCardClickable: {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: DesignTokens.spacing['0.5'] },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemImageContainer: {
    width: Spacing['4xl'],
    height: Spacing['4xl'],
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
    marginLeft: DesignTokens.spacing[3],
    justifyContent: "space-between",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemCategory: {
    fontSize: DesignTokens.typography.sizes.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.secondary,
    fontWeight: "600",
  },
  itemBrand: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: DesignTokens.colors.neutral[500],
  },
  itemName: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[900],
    marginTop: DesignTokens.spacing['0.5'],
  },
  itemReason: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.neutral[500],
    marginTop: DesignTokens.spacing['0.5'],
    lineHeight: 16,
  },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  itemPrice: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.primary,
  },
  viewLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  viewLinkText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.primary,
    fontWeight: "500",
  },
  scoreBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: colors.secondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 10,
  },
  scoreText: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "700",
    color: colors.textInverse,
  },
}))


const styles = StyleSheet.create({
  container: { flex: 1 },
  summarySection: { flex: 1 },
  summaryGradient: { flex: 1 },
  summaryTitle: { flex: 1 },
  summaryText: { flex: 1 },
  whySection: { flex: 1 },
  whyTitle: { flex: 1 },
  reasonItem: { flex: 1 },
  reasonDot: { flex: 1 },
  reasonText: { flex: 1 },
  outfitTabs: { flex: 1 },
  outfitTab: { flex: 1 },
  outfitTabActive: { flex: 1 },
  outfitTabText: { flex: 1 },
  outfitTabTextActive: { flex: 1 },
  outfitSection: { flex: 1 },
  outfitHeader: { flex: 1 },
  outfitTitle: { flex: 1 },
  totalPrice: { flex: 1 },
  styleTags: { flex: 1 },
  styleTag: { flex: 1 },
  styleTagText: { flex: 1 },
  itemCard: { flex: 1 },
  itemCardClickable: { flex: 1 },
  itemImageContainer: { flex: 1 },
  itemImage: { flex: 1 },
  itemImagePlaceholder: { flex: 1 },
  itemContent: { flex: 1 },
  itemHeader: { flex: 1 },
  itemCategory: { flex: 1 },
  itemBrand: { flex: 1 },
  itemName: { flex: 1 },
  itemReason: { flex: 1 },
  itemFooter: { flex: 1 },
  itemPrice: { flex: 1 },
  viewLink: { flex: 1 },
  viewLinkText: { flex: 1 },
  scoreBadge: { flex: 1 },
  scoreText: { flex: 1 },
});

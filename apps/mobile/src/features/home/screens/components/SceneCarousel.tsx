import { memo, useCallback, useState } from "react";
import { View, Text, TouchableOpacity, Dimensions, type TextStyle, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { DesignTokens } from "../../../../design-system/theme/tokens/design-tokens";
import { useTheme, createStyles } from "../../../../shared/contexts/ThemeContext";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH * 0.62;
const CARD_GAP = 12;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

export interface SceneCard {
  id: string;
  scene: string;
  imageUrl: string;
  matchScore: number;
  description: string;
}

interface SceneCarouselProps {
  cards: SceneCard[];
  onCardPress: (card: SceneCard) => void;
  onSeeAll?: () => void;
}

const PLACEHOLDER_COLORS: [string, string][] = [
  [DesignTokens.colors.colorSeasons.spring.colors[0], DesignTokens.colors.brand.terracottaLight],
  [DesignTokens.colors.brand.sageLight, DesignTokens.colors.brand.sage],
  [DesignTokens.colors.brand.camelLight, DesignTokens.colors.brand.camel],
  [DesignTokens.colors.brand.slate, DesignTokens.colors.brand.slateDark],
  [DesignTokens.colors.brand.slateLight, DesignTokens.colors.brand.slate],
];

const cardStyles = StyleSheet.create({
  cardWrapper: {
    width: CARD_WIDTH,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.35,
    borderRadius: DesignTokens.borderRadius.xl,
    overflow: "hidden",
    ...DesignTokens.shadows.lg,
  },
  cardImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  cardOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
    justifyContent: "flex-end",
    padding: DesignTokens.spacing[3],
  },
  sceneTag: {
    backgroundColor: DesignTokens.colors.borders.light,
    paddingHorizontal: DesignTokens.spacing["2.5"],
    paddingVertical: DesignTokens.spacing["0.5"],
    borderRadius: DesignTokens.borderRadius.full,
    alignSelf: "flex-start",
    marginBottom: DesignTokens.spacing[2],
  },
  sceneText: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "600",
    color: DesignTokens.colors.neutral.white,
    letterSpacing: DesignTokens.typography.letterSpacing.wide,
  },
  cardDescription: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: DesignTokens.colors.neutral.white,
    marginBottom: DesignTokens.spacing["1.5"],
    lineHeight: DesignTokens.typography.sizes.base * DesignTokens.typography.lineHeights.snug,
  },
  matchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing[1],
    backgroundColor: DesignTokens.colors.brand.terracotta,
    paddingHorizontal: DesignTokens.spacing[2],
    paddingVertical: DesignTokens.spacing["0.5"],
    borderRadius: DesignTokens.borderRadius.full,
    alignSelf: "flex-start",
  },
  matchText: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "700",
    color: DesignTokens.colors.neutral.white,
  },
});

interface SceneCardItemProps {
  card: SceneCard;
  colorPair: [string, string];
  onPress: (card: SceneCard) => void;
}

const SceneCardItem = memo(({ card, colorPair, onPress }: SceneCardItemProps) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 150 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  }, []);

  return (
    <Animated.View style={[cardStyles.cardWrapper, animatedStyle]}>
      <TouchableOpacity
        style={cardStyles.card}
        onPress={() => onPress(card)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        accessibilityLabel={`${card.scene}场景推荐，匹配度${card.matchScore}%`}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={colorPair}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={cardStyles.cardImage}
        >
          <Ionicons name="shirt-outline" size={40} color={DesignTokens.colors.text.inverse} />
        </LinearGradient>
        <LinearGradient
          colors={["transparent", DesignTokens.colors.backgrounds.overlay]}
          style={cardStyles.cardOverlay}
        >
          <View style={cardStyles.sceneTag}>
            <Text style={cardStyles.sceneText}>{card.scene}</Text>
          </View>
          <Text style={cardStyles.cardDescription} numberOfLines={2}>
            {card.description}
          </Text>
          <View style={cardStyles.matchBadge}>
            <Ionicons name="sparkles" size={10} color={DesignTokens.colors.neutral.white} />
            <Text style={cardStyles.matchText}>{card.matchScore}% 匹配</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

SceneCardItem.displayName = "SceneCardItem";

const SceneCarousel = memo(({ cards, onCardPress, onSeeAll }: SceneCarouselProps) => {
  const scrollX = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleMomentumScrollEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / SNAP_INTERVAL);
      setActiveIndex(Math.max(0, Math.min(index, cards.length - 1)));
    },
    [cards.length]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>为你推荐</Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
            <Text style={styles.seeAll}>查看全部</Text>
          </TouchableOpacity>
        )}
      </View>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
      >
        {cards.map((card, index) => (
          <SceneCardItem
            key={card.id}
            card={card}
            colorPair={PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length]}
            onPress={onCardPress}
          />
        ))}
      </Animated.ScrollView>
      <View style={styles.dots}>
        {cards.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
});

SceneCarousel.displayName = "SceneCarousel";

const useStyles = createStyles((colors) => ({
  container: {
    marginBottom: DesignTokens.spacing[5],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: DesignTokens.spacing[4],
  },
  title: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: DesignTokens.typography.fontWeights.bold as TextStyle["fontWeight"],
    color: colors.textPrimary,
    letterSpacing: DesignTokens.typography.letterSpacing.tight,
  },
  seeAll: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.primary,
    fontWeight: DesignTokens.typography.fontWeights.medium as TextStyle["fontWeight"],
  },
  scrollContent: {
    paddingHorizontal: DesignTokens.spacing[4],
    gap: CARD_GAP,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: DesignTokens.spacing["1.5"],
    marginTop: DesignTokens.spacing[3],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderLight,
  },
  dotActive: {
    width: 18,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
}));

export { SceneCarousel };
export type { SceneCarouselProps };

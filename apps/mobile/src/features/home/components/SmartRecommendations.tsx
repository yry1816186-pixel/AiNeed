import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  Animated,
  StyleProp,
  ViewStyle,
} from "react-native";

import * as Haptics from "@/src/polyfills/expo-haptics";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
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
  useAnimatedScrollHandler,
  measure,
  useAnimatedRef,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import { Colors } from '../../../design-system/theme';
import { DesignTokens } from "../../theme/tokens/design-tokens";

const { width: _SCREEN_WIDTH, height: _SCREEN_HEIGHT } = Dimensions.get("window");
const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);
const _AnimatedText = AnimatedReanimated.createAnimatedComponent(Text);
const AnimatedImage = AnimatedReanimated.createAnimatedComponent(Image);
const _AnimatedTouchableOpacity = AnimatedReanimated.createAnimatedComponent(TouchableOpacity);

/** Ionicons 图标名称联合类型 */
type IoniconsIconName =
  | "palette-outline"
  | "copy-outline"
  | "trending-up-outline"
  | "sunny-outline"
  | "person-outline"
  | "checkmark-circle"
  | "body-outline"
  | "color-palette"
  | "trending-up"
  | "sunny"
  | "pricetag"
  | "ribbon"
  | "bulb"
  | "eye"
  | "sparkles"
  | "alert"
  | "chevron-forward"
  | "close"
  | "arrow-forward";

const springConfig = {
  damping: 15,
  stiffness: 200,
  mass: 0.5,
};

interface RecommendationItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  image: string;
  matchScore?: number;
  reason?: string;
  tags?: string[];
}

interface SectionData {
  id: string;
  type: "style" | "similar" | "trending" | "seasonal" | "personalized";
  title: string;
  subtitle?: string;
  items: RecommendationItem[];
}

interface HistoryItem {
  style: string;
  date: string;
  image: string;
}

const RecommendationItemCard: React.FC<{
  item: RecommendationItem;
  index: number;
  onItemPress?: (item: RecommendationItem) => void;
}> = ({ item, index, onItemPress }) => {
  const itemOpacity = useSharedValue(0);
  const itemTranslateX = useSharedValue(30);
  const imageScale = useSharedValue(0.95);
  const isPressed = useSharedValue(false);

  useEffect(() => {
    itemOpacity.value = withDelay(index * 100, withTiming(1, { duration: 300 }));
    itemTranslateX.value = withDelay(index * 100, withSpring(0, springConfig));
    imageScale.value = withDelay(index * 100 + 50, withSpring(1, springConfig));
  }, []);

  const itemAnimatedStyle = useAnimatedStyle(() => ({
    opacity: itemOpacity.value,
    transform: [{ translateX: itemTranslateX.value }],
  }));

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imageScale.value }],
  }));

  const handlePressIn = () => {
    isPressed.value = true;
    imageScale.value = withSpring(0.98, { damping: 10, stiffness: 300 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    isPressed.value = false;
    imageScale.value = withSpring(1, springConfig);
  };

  return (
    <AnimatedView style={[styles.recommendationItem, itemAnimatedStyle]}>
      <TouchableOpacity
        style={styles.itemTouchable}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onItemPress?.(item)}
        activeOpacity={0.9}
      >
        <AnimatedImage
          source={{ uri: item.image }}
          style={[styles.itemImage, imageAnimatedStyle]}
        />

        {item.matchScore && (
          <View style={styles.matchBadge}>
            <Text style={styles.matchText}>{item.matchScore}%</Text>
          </View>
        )}

        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.itemBrand}>{item.brand}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.itemPrice}>¥{item.price}</Text>
            {item.originalPrice && <Text style={styles.originalPrice}>¥{item.originalPrice}</Text>}
          </View>
          {item.reason && <Text style={styles.itemReason}>{item.reason}</Text>}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.itemTags}>
              {item.tags.slice(0, 2).map((tag, i) => (
                <View key={i} style={styles.itemTag}>
                  <Text style={styles.itemTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </AnimatedView>
  );
};

const FeedSectionCard: React.FC<{
  section: SectionData;
  sectionIndex: number;
  onItemPress?: (item: RecommendationItem, sectionId: string) => void;
  onSeeAll?: (sectionId: string) => void;
}> = ({ section, sectionIndex, onItemPress, onSeeAll }) => {
  const sectionOpacity = useSharedValue(0);
  const sectionTranslateY = useSharedValue(50);

  useEffect(() => {
    sectionOpacity.value = withDelay(sectionIndex * 150, withTiming(1, { duration: 400 }));
    sectionTranslateY.value = withDelay(sectionIndex * 150, withSpring(0, springConfig));
  }, []);

  const sectionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sectionOpacity.value,
    transform: [{ translateY: sectionTranslateY.value }],
  }));

  return (
    <AnimatedView style={[styles.feedSection, sectionAnimatedStyle]}>
      <SmartRecommendationCard
        type={section.type}
        title={section.title}
        subtitle={section.subtitle}
        items={section.items}
        onItemPress={(item) => onItemPress?.(item, section.id)}
        onSeeAll={() => onSeeAll?.(section.id)}
      />
    </AnimatedView>
  );
};

const TimelineHistoryItem: React.FC<{
  item: HistoryItem;
  index: number;
  totalItems: number;
  currentStyle: string;
}> = ({ item, index, totalItems, currentStyle }) => {
  const dotScale = useSharedValue(0);

  useEffect(() => {
    dotScale.value = withDelay(index * 100, withSpring(1, springConfig));
  }, []);

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

  const isCurrent = item.style === currentStyle;

  return (
    <View style={[styles.timelineItem, { left: `${(index / (totalItems - 1)) * 100}%` }]}>
      <AnimatedView
        style={[styles.timelineDot, isCurrent && styles.timelineDotActive, dotAnimatedStyle]}
      />
      <Text style={[styles.timelineDate, isCurrent && styles.timelineDateActive]}>{item.date}</Text>
      <Text style={[styles.timelineStyle, isCurrent && styles.timelineStyleActive]}>
        {item.style}
      </Text>
      <Image source={{ uri: item.image }} style={styles.timelineImage} />
    </View>
  );
};

const TypeIconHeader: React.FC<{
  type: "style" | "similar" | "trending" | "seasonal" | "personalized";
  typeConfig: Record<string, { icon: string; label: string; color: string }>;
}> = ({ type, typeConfig }) => {
  const config = typeConfig[type];
  const iconScale = useSharedValue(0);

  useEffect(() => {
    iconScale.value = withSpring(1, springConfig);
  }, []);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <AnimatedView
      style={[styles.typeIcon, { backgroundColor: `${config.color}20` }, iconAnimatedStyle]}
    >
      <Ionicons name={config.icon as IoniconsIconName} size={20} color={config.color} />
    </AnimatedView>
  );
};

export interface SmartRecommendationCardProps {
  type: "style" | "similar" | "trending" | "seasonal" | "personalized";
  title: string;
  subtitle?: string;
  items: {
    id: string;
    image: string;
    name: string;
    brand: string;
    price: number;
    originalPrice?: number;
    matchScore?: number;
    reason?: string;
    tags?: string[];
  }[];
  onItemPress?: (item: RecommendationItem) => void;
  onSeeAll?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const SmartRecommendationCard: React.FC<SmartRecommendationCardProps> = ({
  type,
  title,
  subtitle,
  items,
  onItemPress,
  onSeeAll,
  style,
}) => {
  const scrollX = useSharedValue(0);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 400 });
  }, []);

  const typeConfig = {
    style: {
      icon: "palette-outline",
      color: DesignTokens.colors.brand.slateLight,
      label: "风格匹配",
    },
    similar: {
      icon: "copy-outline",
      color: "#10B981", // custom color
      label: "相似推荐",
    },
    trending: {
      icon: "trending-up-outline",
      color: "#F59E0B", // custom color
      label: "热门趋势",
    },
    seasonal: {
      icon: "sunny-outline",
      color: "#EC4899", // custom color
      label: "当季推荐",
    },
    personalized: {
      icon: "person-outline",
      color: "#8B5CF6", // custom color
      label: "为你定制",
    },
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, [0, 50], [1, 0.8], Extrapolate.CLAMP),
  }));

  const renderHeader = () => {
    const config = typeConfig[type];

    return (
      <AnimatedView style={[styles.cardHeader, headerAnimatedStyle]}>
        <View style={styles.typeIndicator}>
          <TypeIconHeader type={type} typeConfig={typeConfig} />
          <Text style={styles.typeLabel}>{config.label}</Text>
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.cardTitle}>{title}</Text>
          {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
        </View>
        {onSeeAll && (
          <TouchableOpacity style={styles.seeAllButton} onPress={onSeeAll}>
            <Text style={styles.seeAllText}>查看全部</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.primary[500]} />
          </TouchableOpacity>
        )}
      </AnimatedView>
    );
  };

  const renderItem = (item: RecommendationItem, index: number) => {
    return (
      <RecommendationItemCard key={item.id} item={item} index={index} onItemPress={onItemPress} />
    );
  };

  return (
    <AnimatedView style={[styles.container, cardOpacity as any, style]}>
      {renderHeader()}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.itemsContainer}
        onScroll={scrollHandler}
      >
        {items.map((item, index) => renderItem(item, index))}
        <View style={{ width: 20 }} />
      </ScrollView>
    </AnimatedView>
  );
};

export interface PersonalizedFeedProps {
  sections: {
    id: string;
    type: SmartRecommendationCardProps["type"];
    title: string;
    subtitle?: string;
    items: SmartRecommendationCardProps["items"];
  }[];
  onItemPress?: (item: RecommendationItem, section: string) => void;
  onSeeAll?: (section: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const PersonalizedFeed: React.FC<PersonalizedFeedProps> = ({
  sections,
  onItemPress,
  onSeeAll,
  onRefresh,
  _refreshing = false,
  style,
}) => {
  const scrollY = useSharedValue(0);
  const headerOpacity = useSharedValue(0);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 500 });
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 100], [1, 0.3], Extrapolate.CLAMP),
  }));

  const renderSection = (section: SectionData, sectionIndex: number) => {
    return (
      <FeedSectionCard
        key={section.id}
        section={section}
        sectionIndex={sectionIndex}
        onItemPress={onItemPress}
        onSeeAll={onSeeAll}
      />
    );
  };

  return (
    <AnimatedView style={[styles.feedContainer, style]}>
      <Animated.ScrollView
        style={StyleSheet.absoluteFill}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.feedHeader}>
          <AnimatedView style={[styles.feedHeaderContent, headerAnimatedStyle]}>
            <Text style={styles.feedGreeting}>Hi, 潮流达人 👋</Text>
            <Text style={styles.feedSubGreeting}>
              今日为你精选了 {sections.reduce((sum, s) => sum + s.items.length, 0)} 件好物
            </Text>
          </AnimatedView>
        </View>

        {sections.map((section, index) => renderSection(section, index))}

        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </AnimatedView>
  );
};

export interface RecommendationReasonProps {
  type:
    | "style_match"
    | "body_shape"
    | "color_harmony"
    | "trending"
    | "seasonal"
    | "price"
    | "brand";
  title: string;
  description: string;
  confidence: number;
  style?: StyleProp<ViewStyle>;
}

export const RecommendationReason: React.FC<RecommendationReasonProps> = ({
  type,
  title,
  description,
  confidence,
  style,
}) => {
  const scale = useSharedValue(0);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, springConfig);
    checkScale.value = withDelay(200, withSpring(1, { damping: 10, stiffness: 300 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const typeConfig = {
    style_match: {
      icon: "checkmark-circle",
      color: DesignTokens.colors.brand.slateLight,
      bgColor: "rgba(102, 126, 234, 0.1)",
    },
    body_shape: {
      icon: "body-outline",
      color: "#10B981", // custom color
      bgColor: "rgba(16, 185, 129, 0.1)",
    },
    color_harmony: {
      icon: "color-palette",
      color: "#EC4899", // custom color
      bgColor: "rgba(236, 72, 153, 0.1)",
    },
    trending: {
      icon: "trending-up",
      color: "#F59E0B", // custom color
      bgColor: "rgba(245, 158, 11, 0.1)",
    },
    seasonal: {
      icon: "sunny",
      color: "#3B82F6", // custom color
      bgColor: "rgba(59, 130, 246, 0.1)",
    },
    price: {
      icon: "pricetag",
      color: "#10B981", // custom color
      bgColor: "rgba(16, 185, 129, 0.1)",
    },
    brand: {
      icon: "ribbon",
      color: "#8B5CF6", // custom color
      bgColor: "rgba(139, 92, 246, 0.1)",
    },
  };

  const config = typeConfig[type];

  return (
    <AnimatedView style={[styles.reasonContainer, animatedStyle, style]}>
      <View style={[styles.reasonIcon, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon as IoniconsIconName} size={20} color={config.color} />
      </View>
      <View style={styles.reasonContent}>
        <Text style={styles.reasonTitle}>{title}</Text>
        <Text style={styles.reasonDescription}>{description}</Text>
      </View>
      <View style={styles.confidenceContainer}>
        <Text style={styles.confidenceText}>{confidence}%</Text>
        <AnimatedView style={[styles.checkIcon, checkAnimatedStyle]}>
          <Ionicons name="checkmark-circle" size={16} color={config.color} />
        </AnimatedView>
      </View>
    </AnimatedView>
  );
};

export interface AIInsightCardProps {
  insight: {
    type: "tip" | "observation" | "suggestion" | "warning";
    title: string;
    message: string;
    action?: {
      label: string;
      onPress: () => void;
    };
  };
  dismissible?: boolean;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({
  insight,
  dismissible = true,
  onDismiss,
  style,
}) => {
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, springConfig);
    opacity.value = withTiming(1, { duration: 300 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const typeConfig = {
    tip: { icon: "bulb", color: "#F59E0B", bgColor: "#FFFBEB" }, // custom color
    observation: { icon: "eye", color: "#3B82F6", bgColor: "#EFF6FF" }, // custom color
    suggestion: { icon: "sparkles", color: "#8B5CF6", bgColor: "#F5F3FF" }, // custom color
    warning: { icon: "alert", color: "#EF4444", bgColor: "#FEF2F2" }, // custom color
  };

  const config = typeConfig[insight.type];

  return (
    <AnimatedView
      style={[styles.insightCard, animatedStyle, { backgroundColor: config.bgColor }, style]}
    >
      <View style={styles.insightHeader}>
        <View style={[styles.insightIcon, { backgroundColor: `${config.color}20` }]}>
          <Ionicons name={config.icon as IoniconsIconName} size={18} color={config.color} />
        </View>
        <Text style={[styles.insightTitle, { color: config.color }]}>{insight.title}</Text>
        {dismissible && (
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Ionicons name="close" size={16} color={Colors.neutral[400]} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.insightMessage}>{insight.message}</Text>
      {insight.action && (
        <TouchableOpacity
          style={[styles.insightAction, { borderColor: config.color }]}
          onPress={insight.action.onPress}
        >
          <Text style={[styles.insightActionText, { color: config.color }]}>
            {insight.action.label}
          </Text>
          <Ionicons name="arrow-forward" size={14} color={config.color} />
        </TouchableOpacity>
      )}
    </AnimatedView>
  );
};

export interface StyleEvolutionProps {
  history: {
    date: string;
    style: string;
    image: string;
  }[];
  currentStyle: string;
  style?: StyleProp<ViewStyle>;
}

export const StyleEvolution: React.FC<StyleEvolutionProps> = ({ history, currentStyle, style }) => {
  const _scrollX = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(1, { damping: 15, stiffness: 80 });
  }, []);

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={[styles.evolutionContainer, style]}>
      <View style={styles.evolutionHeader}>
        <Text style={styles.evolutionTitle}>风格进化</Text>
        <Text style={styles.evolutionSubtitle}>你的穿搭风格演变历程</Text>
      </View>

      <View style={styles.timelineContainer}>
        <View style={styles.timelineLine}>
          <AnimatedView style={[styles.timelineProgress, progressAnimatedStyle]} />
        </View>
        {history.map((item, index) => (
          <TimelineHistoryItem
            key={index}
            item={item}
            index={index}
            totalItems={history.length}
            currentStyle={currentStyle}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  typeIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  typeLabel: {
    marginLeft: 8,
    fontSize: 12,
    color: Colors.neutral[500],
    fontWeight: "500",
  },
  headerContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.neutral[800],
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  seeAllText: {
    fontSize: 13,
    color: Colors.primary[500],
    fontWeight: "500",
    marginRight: 4,
  },
  itemsContainer: {
    paddingHorizontal: 16,
  },
  recommendationItem: {
    width: 140,
    marginRight: 12,
  },
  itemTouchable: {
    borderRadius: 16,
    overflow: "hidden",
  },
  itemImage: {
    width: 140,
    height: 175,
    borderRadius: 16,
  },
  matchBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(102, 126, 234, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  matchText: {
    fontSize: 11,
    color: DesignTokens.colors.text.inverse,
    fontWeight: "600",
  },
  itemInfo: {
    padding: 12,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.neutral[800],
  },
  itemBrand: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  price: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.primary[500],
  },
  originalPrice: {
    fontSize: 12,
    color: Colors.neutral[400],
    textDecorationLine: "line-through",
    marginLeft: 6,
  },
  itemReason: {
    fontSize: 11,
    color: Colors.neutral[500],
    marginTop: 4,
    fontStyle: "italic",
  },
  itemTags: {
    flexDirection: "row",
    marginTop: 6,
    gap: 4,
  },
  itemTag: {
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemTagText: {
    fontSize: 10,
    color: Colors.neutral[600],
  },
  feedContainer: {
    flex: 1,
  },
  feedHeader: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  feedHeaderContent: {
    alignItems: "center",
  },
  feedGreeting: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.neutral[800],
  },
  feedSubGreeting: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginTop: 4,
  },
  feedSection: {
    marginBottom: 24,
  },
  reasonContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  reasonIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  reasonContent: {
    flex: 1,
    marginLeft: 12,
  },
  reasonTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.neutral[800],
  },
  reasonDescription: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  confidenceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary[500],
    marginRight: 4,
  },
  checkIcon: {},
  insightCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  insightTitle: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  dismissButton: {
    padding: 4,
  },
  insightMessage: {
    fontSize: 13,
    color: Colors.neutral[600],
    lineHeight: 20,
  },
  insightAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 12,
    gap: 4,
  },
  insightActionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  evolutionContainer: {
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  evolutionHeader: {
    marginBottom: 24,
  },
  evolutionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.neutral[800],
  },
  evolutionSubtitle: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginTop: 4,
  },
  timelineContainer: {
    height: 120,
    position: "relative",
  },
  timelineLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 20,
    height: 3,
    backgroundColor: Colors.neutral[200],
    borderRadius: 1.5,
  },
  timelineProgress: {
    height: "100%",
    backgroundColor: Colors.primary[500],
    borderRadius: 1.5,
  },
  timelineItem: {
    position: "absolute",
    alignItems: "center",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.neutral[300],
    marginTop: 14,
  },
  timelineDotActive: {
    backgroundColor: Colors.primary[500],
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  timelineDate: {
    fontSize: 10,
    color: Colors.neutral[400],
    marginTop: 8,
  },
  timelineDateActive: {
    color: Colors.primary[500],
    fontWeight: "600",
  },
  timelineStyle: {
    fontSize: 11,
    color: Colors.neutral[600],
    fontWeight: "500",
    marginTop: 2,
  },
  timelineStyleActive: {
    color: Colors.primary[600],
    fontWeight: "600",
  },
  timelineImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginTop: 8,
  },
});

export default {
  SmartRecommendationCard,
  PersonalizedFeed,
  RecommendationReason,
  AIInsightCard,
  StyleEvolution,
};

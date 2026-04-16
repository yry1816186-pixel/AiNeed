import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { router } from "expo-router";
import { Colors, Shadows } from '../../design-system/theme';
import { useTheme, createStyles } from 'undefined';
import { recommendationsApi } from "../../services/api/tryon.api";
import { cartApi } from "../../services/api/commerce.api";
import { useAuthStore, useHeartRecommendStore } from "../../stores";
import PreferenceSetupModal from "./PreferenceSetupModal";
import { SwipeCard, ProductItem } from "./SwipeCard";
import { EmptyState } from "./ActionButtons";
import { DesignTokens } from "../../design-system/theme/tokens/design-tokens";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const _CARD_WIDTH = SCREEN_WIDTH - 40;
const _CARD_HEIGHT = SCREEN_HEIGHT * 0.65;

interface HeartRecommendScreenProps {
  onClose?: () => void;
}

export const HeartRecommendScreen: React.FC<HeartRecommendScreenProps> = ({ onClose }) => {
  const { user, isAuthenticated } = useAuthStore();
  const heartRecommendStore = useHeartRecommendStore();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPreferenceSetup, setShowPreferenceSetup] = useState(false);
  const [stats, setStats] = useState({ liked: 0, skipped: 0, cartAdded: 0 });
  const [hasPreferences, setHasPreferences] = useState(false);
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(50);

  useEffect(() => {
    void checkPreferences();
  }, [user]);

  useEffect(() => {
    if (hasPreferences) {
      void loadRecommendations();
    }
  }, [hasPreferences]);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 500 });
    slideAnim.value = withSpring(0, { damping: 15, stiffness: 150 });
  }, []);

  const checkPreferences = async () => {
    try {
      if (user?.preferences && user.preferences.preferredStyles?.length > 0) {
        setHasPreferences(true);
        setShowPreferenceSetup(false);
      } else {
        setShowPreferenceSetup(true);
      }
    } catch (error) {
      console.error("Check preferences error:", error);
      setShowPreferenceSetup(true);
    }
  };

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const response = await recommendationsApi.getPersonalized({ limit: 20 });

      if (response.success && response.data) {
        setProducts(response.data as unknown as ProductItem[]);
        setIsUsingMockData(false);
      } else if (response && Array.isArray(response)) {
        setProducts(response as unknown as ProductItem[]);
        setIsUsingMockData(false);
      } else {
        setProducts(generateMockProducts());
        setIsUsingMockData(true);
      }
    } catch (error) {
      console.error("Load recommendations error:", error);
      setProducts(generateMockProducts());
      setIsUsingMockData(true);
    } finally {
      setLoading(false);
    }
  };

  const generateMockProducts = (): ProductItem[] => {
    const mockItems = [
      {
        name: "法式复古碎花连衣裙",
        brand: "Reformation",
        category: "dresses",
        price: 1299,
      },
      {
        name: "高腰阔腿牛仔裤",
        brand: "Levis",
        category: "bottoms",
        price: 799,
      },
      { name: "真丝衬衫", brand: "Equipment", category: "tops", price: 1599 },
      {
        name: "羊毛西装外套",
        brand: "Theory",
        category: "outerwear",
        price: 2699,
      },
      { name: "针织开衫", brand: "Sandro", category: "tops", price: 1399 },
      {
        name: "小白鞋",
        brand: "Common Projects",
        category: "footwear",
        price: 2299,
      },
      { name: "A字半裙", brand: "COS", category: "bottoms", price: 699 },
      { name: "羊绒毛衣", brand: "Everlane", category: "tops", price: 999 },
    ];

    return mockItems.map((item, idx) => ({
      id: `mock-${idx}`,
      name: item.name,
      price: item.price,
      originalPrice: Math.floor(item.price * 1.3),
      currency: "CNY",
      images: [`https://picsum.photos/400/500?random=${idx + 100}`],
      category: item.category,
      colors: ["黑色", "白色", "米色", "灰色"].slice(0, Math.floor(Math.random() * 3) + 1),
      sizes: ["S", "M", "L", "XL"],
      brand: { id: `brand-${idx}`, name: item.brand },
      tags: ["新品", "热卖", "限量"],
      score: Math.floor(Math.random() * 20) + 80,
      matchReasons: ["适合您的风格", "颜色搭配推荐", "尺码合适"],
    }));
  };

  const handleSwipeLeft = () => {
    const { colors, isDark } = useTheme();
    const currentProduct = products[currentIndex];
    if (currentProduct) {
      heartRecommendStore.addSwipeAction({
        itemId: currentProduct.id,
        action: "skip",
        timestamp: Date.now(),
        category: currentProduct.category,
        price: currentProduct.price,
      });
      heartRecommendStore.markAsDisliked(currentProduct.id);
    }
    setStats((prev) => ({ ...prev, skipped: prev.skipped + 1 }));
    moveToNext();
  };

  const handleSwipeRight = () => {
    const currentProduct = products[currentIndex];
    if (currentProduct) {
      heartRecommendStore.addSwipeAction({
        itemId: currentProduct.id,
        action: "like",
        timestamp: Date.now(),
        category: currentProduct.category,
        price: currentProduct.price,
      });
      heartRecommendStore.markAsLiked(currentProduct.id);
      heartRecommendStore.updatePreferences(
        currentProduct.category,
        currentProduct.tags || [],
        currentProduct.price
      );
    }
    setStats((prev) => ({ ...prev, liked: prev.liked + 1 }));
    moveToNext();
  };

  const handleSwipeUp = async () => {
    const currentProduct = products[currentIndex];
    if (currentProduct) {
      heartRecommendStore.addSwipeAction({
        itemId: currentProduct.id,
        action: "cart",
        timestamp: Date.now(),
        category: currentProduct.category,
        price: currentProduct.price,
      });
      heartRecommendStore.markAsCartAdded(currentProduct.id);
      heartRecommendStore.updatePreferences(
        currentProduct.category,
        currentProduct.tags || [],
        currentProduct.price
      );
      try {
        const defaultColor = currentProduct.colors?.[0] || "默认";
        const defaultSize = currentProduct.sizes?.[0] || "M";
        await cartApi.add({
          productId: currentProduct.id,
          color: defaultColor,
          size: defaultSize,
          quantity: 1,
        });
        setStats((prev) => ({ ...prev, cartAdded: prev.cartAdded + 1 }));
      } catch (error) {
        console.error("Add to cart error:", error);
        setStats((prev) => ({ ...prev, cartAdded: prev.cartAdded + 1 }));
      }
    }
    moveToNext();
  };

  const handleSwipeDown = () => {
    const currentProduct = products[currentIndex];
    if (currentProduct) {
      heartRecommendStore.addSwipeAction({
        itemId: currentProduct.id,
        action: "dislike",
        timestamp: Date.now(),
        category: currentProduct.category,
        price: currentProduct.price,
      });
      heartRecommendStore.markAsDisliked(currentProduct.id);
    }
    setStats((prev) => ({ ...prev, skipped: prev.skipped + 1 }));
    moveToNext();
  };

  const moveToNext = () => {
    if (currentIndex < products.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      void loadRecommendations();
      setCurrentIndex(0);
    }
  };

  const handlePreferenceComplete = () => {
    setShowPreferenceSetup(false);
    setHasPreferences(true);
  };

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));

  if (showPreferenceSetup) {
    return (
      <PreferenceSetupModal
        visible={showPreferenceSetup}
        onComplete={handlePreferenceComplete}
        onSkip={() => {
          setShowPreferenceSetup(false);
          setHasPreferences(true);
        }}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="sparkles-outline" size={48} color={colors.primary} />
        <Text style={styles.loadingText}>正在为您精选好物...</Text>
      </View>
    );
  }

  const visibleProducts = products.slice(currentIndex, currentIndex + 3);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <Animated.View style={[styles.header, fadeStyle]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>心动推荐</Text>
          <Text style={styles.headerSubtitle}>为您精选</Text>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="heart" size={14} color={Colors.rose[500]} />
            <Text style={styles.statText}>{stats.liked}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="cart" size={14} color={Colors.primary[500]} />
            <Text style={styles.statText}>{stats.cartAdded}</Text>
          </View>
        </View>
      </Animated.View>

      {isUsingMockData && (
        <View style={{ backgroundColor: '#FFF3E0', padding: 8, paddingHorizontal: 16 }}>
          <Text style={{ color: '#E65100', fontSize: DesignTokens.typography.sizes.sm }}>
            当前为示例数据，推荐服务暂不可用
          </Text>
        </View>
      )}

      <View style={styles.cardsContainer}>
        {products.length === 0 ? (
          <EmptyState onRefresh={loadRecommendations} />
        ) : (
          visibleProducts.reverse().map((item, idx) => {
            const actualIndex = visibleProducts.length - 1 - idx;
            const isTop = actualIndex === 0;
            return (
              <SwipeCard
                key={item.id}
                item={item}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                onSwipeUp={handleSwipeUp}
                onSwipeDown={handleSwipeDown}
                isActive={isTop}
                index={currentIndex + actualIndex}
              />
            );
          })
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.sm,
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  cardsContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: DesignTokens.typography.sizes.md,
    color: colors.textSecondary,
    fontWeight: "500",
  },
});

export default HeartRecommendScreen;

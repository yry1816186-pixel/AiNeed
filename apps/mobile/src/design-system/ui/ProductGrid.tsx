import React, { useCallback, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { router } from "expo-router";
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../../design-system/theme';
import { Rating } from "./Rating";
import { OptimizedImage } from "../../shared/components/common/OptimizedImage";
import { DesignTokens } from '../../design-system/theme/tokens/design-tokens';
import { useTheme } from '../../shared/contexts/ThemeContext';
import { flatColors as colors } from '../theme';


const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - Spacing[4] * 2 - Spacing[3]) / 2;

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount?: number;
  sales?: number;
  image?: string | null;
  category?: string;
  colors?: string[];
  discount?: number;
}

interface ProductCardProps {
  item: Product;
  onPress?: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
}

const ProductCard = memo(function ProductCard({
  item,
  onPress,
  onFavorite,
  isFavorite = false,
}: ProductCardProps) {
  const discount = item.originalPrice
    ? Math.round((1 - item.price / item.originalPrice) * 100)
    : item.discount || 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.() || router.push(`/clothing/${item.id}`)}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        {item.image ? (
          <OptimizedImage source={item.image} style={styles.image} resizeMode="cover" />
        ) : (
          <LinearGradient colors={[DesignTokens.colors.backgrounds.tertiary, DesignTokens.colors.neutral[200], DesignTokens.colors.neutral[100]]} style={styles.image}>
            <Ionicons name="shirt-outline" size={48} color={Colors.neutral[300]} />
          </LinearGradient>
        )}
        {onFavorite && (
          <TouchableOpacity style={styles.favoriteButton} onPress={onFavorite} activeOpacity={0.7}>
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={16}
              color={isFavorite ? Colors.rose[500] : Colors.neutral[400]}
            />
          </TouchableOpacity>
        )}
        {discount > 0 && (
          <View style={styles.discountTag}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {item.category && <Text style={styles.category}>{item.category}</Text>}
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.ratingRow}>
          <Rating value={item.rating} variant="compact" />
          {item.reviewCount !== undefined && (
            <Text style={styles.reviewCount}>({item.reviewCount})</Text>
          )}
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>¥{item.price}</Text>
          {item.originalPrice && item.originalPrice > item.price && (
            <Text style={styles.originalPrice}>¥{item.originalPrice}</Text>
          )}
        </View>
        {item.colors && item.colors.length > 0 && (
          <View style={styles.colorRow}>
            {item.colors.slice(0, 4).map((color, index) => (
              <View key={index} style={[styles.colorDot, { backgroundColor: color }]} />
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

interface ProductGridProps {
  products: Product[];
  onItemPress?: (item: Product) => void;
  onFavorite?: (item: Product) => void;
  favorites?: Set<string>;
  loading?: boolean;
  onEndReached?: () => void;
}

export const ProductGrid = memo(function ProductGrid({
  products,
  onItemPress,
  onFavorite,
  favorites,
  _loading = false,
  onEndReached,
}: ProductGridProps) {
  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard
        item={item}
        onPress={() => onItemPress?.(item)}
        onFavorite={() => onFavorite?.(item)}
        isFavorite={favorites?.has(item.id)}
      />
    ),
    [onItemPress, onFavorite, favorites]
  );

  const keyExtractor = useCallback((item: Product) => item.id, []);

  return (
    <FlatList
      data={products}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={2}
      contentContainerStyle={styles.listContent}
      columnWrapperStyle={styles.row}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
    />
  );
});

interface HorizontalProductListProps {
  products: Product[];
  onItemPress?: (item: Product) => void;
}

export const HorizontalProductList = memo(function HorizontalProductList({ products, onItemPress }: HorizontalProductListProps) {
  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <TouchableOpacity
        style={styles.horizontalCard}
        onPress={() => onItemPress?.(item) || router.push(`/clothing/${item.id}`)}
        activeOpacity={0.9}
      >
        <View style={styles.horizontalImageContainer}>
          {item.image ? (
            <OptimizedImage source={item.image} style={styles.horizontalImage} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={[DesignTokens.colors.backgrounds.tertiary, DesignTokens.colors.neutral[200], DesignTokens.colors.neutral[100]]}
              style={styles.horizontalImage}
            >
              <Ionicons name="shirt-outline" size={40} color={Colors.neutral[300]} />
            </LinearGradient>
          )}
        </View>
        <Text style={styles.horizontalName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.horizontalPrice}>¥{item.price}</Text>
      </TouchableOpacity>
    ),
    [onItemPress]
  );

  return (
    <FlatList
      data={products}
      renderItem={renderItem}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalListContent}
    />
  );
});

const styles = StyleSheet.create({
  listContent: {
    padding: Spacing[4],
  },
  row: {
    justifyContent: "space-between",
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    marginBottom: Spacing[3],
    ...Shadows.md,
  },
  imageContainer: {
    position: "relative",
    height: 180,
  },
  image: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteButton: {
    position: "absolute",
    top: Spacing[2],
    right: Spacing[2],
    width: Spacing.xl,
    height: Spacing.xl,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.sm,
  },
  discountTag: {
    position: "absolute",
    top: Spacing[2],
    left: Spacing[2],
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[0.5],
    borderRadius: BorderRadius.sm,
  },
  discountText: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: Colors.neutral[0],
    fontWeight: "700",
  },
  content: {
    padding: Spacing[3],
    gap: Spacing[1],
  },
  category: {
    ...Typography.caption.sm,
    color: Colors.neutral[400],
    fontWeight: "500",
  },
  name: {
    ...Typography.body.sm,
    color: Colors.neutral[800],
    fontWeight: "600",
    height: DesignTokens.spacing[10],
    lineHeight: 20,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[1],
  },
  reviewCount: {
    ...Typography.caption.sm,
    color: Colors.neutral[400],
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing[2],
  },
  price: {
    ...Typography.heading.sm,
    color: Colors.primary[600],
    fontWeight: "800",
  },
  originalPrice: {
    ...Typography.caption.sm,
    color: Colors.neutral[400],
    textDecorationLine: "line-through",
  },
  colorRow: {
    flexDirection: "row",
    gap: Spacing[1],
    marginTop: Spacing[1],
  },
  colorDot: {
    width: DesignTokens.spacing[3],
    height: DesignTokens.spacing[3],
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  horizontalListContent: {
    paddingHorizontal: Spacing[4],
    gap: Spacing[3],
  },
  horizontalCard: {
    width: 140,
    marginRight: Spacing[3],
  },
  horizontalImageContainer: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing[2],
  },
  horizontalImage: {
    width: 140,
    height: 180,
    justifyContent: "center",
    alignItems: "center",
  },
  horizontalName: {
    ...Typography.body.sm,
    color: Colors.neutral[800],
    fontWeight: "500",
  },
  horizontalPrice: {
    ...Typography.body.sm,
    color: Colors.primary[600],
    fontWeight: "700",
    marginTop: Spacing[1],
  },
});

export { ProductCard };
export type { Product };

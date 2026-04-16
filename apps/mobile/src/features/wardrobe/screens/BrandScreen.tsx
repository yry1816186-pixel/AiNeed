import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { clothingApi } from '../../../services/api/clothing.api';
import type { ClothingItem } from '../../types/clothing';

import type { ProfileStackParamList } from '../../../navigation/types';
import type { RootStackParamList } from '../../../types/navigation';
import { DesignTokens , flatColors as colors, Spacing } from '../../../design-system/theme';

type BrandRoute = RouteProp<ProfileStackParamList, "Brand">;
type Navigation = NativeStackNavigationProp<RootStackParamList>;

export const BrandScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<BrandRoute>();
  const brandId = route.params?.brandId;

  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchItems = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        if (pageNum === 1) {
          setLoading(true);
        }
        setError(null);

        const response = await clothingApi.getAll({
          brandId,
          page: pageNum,
          limit: 20,
        });

        if (response.success && response.data) {
          const newItems = response.data.items;
          setItems((prev) => (append ? [...prev, ...newItems] : newItems));
          setPage(pageNum);
          setHasMore(response.data.hasMore ?? newItems.length >= 20);
        } else {
          setError("Failed to load brand products");
        }
      } catch {
        setError("Network error, please retry");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [brandId]
  );

  useEffect(() => {
    if (brandId) {
      void fetchItems(1, false);
    }
  }, [brandId, fetchItems]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchItems(1, false);
  }, [fetchItems]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      void fetchItems(page + 1, true);
    }
  }, [hasMore, loading, page, fetchItems]);

  const handleQRScan = useCallback(async () => {
    Alert.alert("QR Scanner", "Camera would open to scan brand QR codes");
  }, []);

  const handleItemPress = useCallback(
    (item: ClothingItem) => {
      navigation.navigate("Product", { clothingId: item.id });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: ClothingItem }) => (
      <TouchableOpacity
        style={s.productCard}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.85}
      >
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={s.productImage} resizeMode="cover" />
        ) : (
          <View style={s.productImagePlaceholder}>
            <Ionicons name="image-outline" size={28} color={colors.textTertiary} />
          </View>
        )}
        <View style={s.productInfo}>
          <Text style={s.productName} numberOfLines={2}>
            {item.name ?? "Product"}
          </Text>
          {item.brand && <Text style={s.productBrand}>{item.brand}</Text>}
          {item.price !== null && (
            <View style={s.priceRow}>
              <Text style={s.productPrice}>¥{(item.price ?? 0).toFixed(2)}</Text>
              {item.colors && item.colors.length > 0 && (
                <Text style={s.productColors}>{item.colors.length} colors</Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    ),
    [handleItemPress]
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Brand</Text>
        <TouchableOpacity style={s.iconBtn} onPress={handleQRScan}>
          <Ionicons name="qr-code-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* QR import banner */}
      <TouchableOpacity style={s.qrBanner} onPress={handleQRScan} activeOpacity={0.8}>
        <View style={s.qrBannerIcon}>
          <Ionicons name="scan-outline" size={20} color={colors.primary} />
        </View>
        <View style={s.qrBannerText}>
          <Text style={s.qrBannerTitle}>Scan Brand QR Code</Text>
          <Text style={s.qrBannerDesc}>Quickly import products by scanning</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </TouchableOpacity>

      {loading && items.length === 0 ? (
        <View style={s.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading products...</Text>
        </View>
      ) : error && items.length === 0 ? (
        <View style={s.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => fetchItems(1, false)}>
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{ paddingBottom: Spacing.lg}}
          ListEmptyComponent={
            <View style={s.centerContent}>
              <Ionicons name="shirt-outline" size={48} color={colors.textTertiary} />
              <Text style={s.emptyTitle}>No products found</Text>
              <Text style={s.emptySubtitle}>This brand has not listed any products yet</Text>
            </View>
          }
          ListFooterComponent={
            loading && items.length > 0 ? (
              <View style={s.loadingMore}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={s.loadingMoreText}>Loading more...</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "700", color: colors.text },
  iconBtn: { width: DesignTokens.spacing[9], height: DesignTokens.spacing[9], alignItems: "center", justifyContent: "center" },
  qrBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.md,
    marginVertical: DesignTokens.spacing[3],
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: DesignTokens.spacing['3.5'],
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: DesignTokens.spacing['0.5'] },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  qrBannerIcon: {
    width: DesignTokens.spacing[10],
    height: DesignTokens.spacing[10],
    borderRadius: 10,
    backgroundColor: colors.subtleBg,
    alignItems: "center",
    justifyContent: "center",
  },
  qrBannerText: { flex: 1, marginLeft: DesignTokens.spacing[3]},
  qrBannerTitle: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: colors.text },
  qrBannerDesc: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textTertiary, marginTop: DesignTokens.spacing['0.5']},
  centerContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.xl},
  loadingText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textSecondary, marginTop: DesignTokens.spacing[3]},
  errorText: { fontSize: DesignTokens.typography.sizes.base, color: colors.error, marginTop: DesignTokens.spacing[3]},
  retryBtn: {
    marginTop: Spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: DesignTokens.spacing['2.5'],
    borderRadius: 20,
  },
  retryBtnText: { color: colors.surface, fontSize: DesignTokens.typography.sizes.base, fontWeight: "600" },
  emptyTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600", color: colors.textPrimary, marginTop: Spacing.md},
  emptySubtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textTertiary,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['3.5'],
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  productImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: colors.placeholderBg,
  },
  productImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: colors.subtleBg,
    alignItems: "center",
    justifyContent: "center",
  },
  productInfo: { flex: 1, marginLeft: DesignTokens.spacing['3.5']},
  productName: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "500", color: colors.textPrimary, lineHeight: 20 },
  productBrand: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textTertiary, marginTop: 3 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginTop: DesignTokens.spacing['1.5']},
  productPrice: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "700", color: colors.primary },
  productColors: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textTertiary },
  loadingMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  loadingMoreText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textTertiary },
});

export default BrandScreen;

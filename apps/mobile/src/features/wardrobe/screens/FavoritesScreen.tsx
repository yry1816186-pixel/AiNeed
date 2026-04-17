import React, { useCallback, useState, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { useTranslation } from '../../../i18n';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { favoriteApi } from '../../../services/api/commerce.api';
import { useAuthStore } from '../stores/index';
import type { ClothingItem } from '../../../types/clothing';
import type { RootStackParamList } from '../../../types/navigation';
import { ImageWithPlaceholder } from '../../../shared/components/common/ImageWithPlaceholder';
import { Spacing, flatColors as colors } from '../../../design-system/theme';


type NavProp = NativeStackNavigationProp<RootStackParamList>;

// 列表项高度常量
const LIST_ITEM_HEIGHT = 100;

/**
 * 收藏项组件 - 使用 React.memo 优化
 * 避免不必要的重渲染
 */
interface FavoriteItemProps {
  item: ClothingItem;
  onPress: (id: string) => void;
  onRemove: (id: string) => void;
}

const FavoriteItem = memo(function FavoriteItem({ item, onPress, onRemove }: FavoriteItemProps) {
    const { colors } = useTheme();
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item.id)} activeOpacity={0.7}>
      {item.imageUri ? (
        <ImageWithPlaceholder source={{ uri: item.imageUri }} style={styles.image} />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="shirt-outline" size={40} color={colors.textTertiary} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name || item.category}
        </Text>
        {item.brand ? <Text style={styles.brand}>{item.brand}</Text> : null}
        {/* eslint-disable-next-line eqeqeq */}
        {item.price != null ? <Text style={styles.price}>¥{item.price.toFixed(0)}</Text> : null}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => onRemove(item.id)}
          accessibilityLabel="删除"
          accessibilityRole="button"
        >
          <Ionicons name="heart" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

export const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const isAuthenticated = useAuthStore((state: any) => state.isAuthenticated);
  const authLoading = useAuthStore((state: any) => state.isLoading);
  const t = useTranslation();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = useCallback(async () => {
    try {
      const response = await favoriteApi.getAll();
      if (response.success && response.data) {
        setItems(response.data);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        if (!authLoading) {
          setItems([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      void fetchFavorites();
    }, [authLoading, fetchFavorites, isAuthenticated])
  );

  const handleRemove = useCallback(async (id: string) => {
    try {
      await favoriteApi.remove(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Favorites operation failed:', error);
      Alert.alert("操作失败", "取消收藏失败，请重试");
    }
  }, []);

  const handleNavigate = useCallback(
    (id: string) => {
      navigation.navigate("Product", { clothingId: id });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: ClothingItem }) => (
      <FavoriteItem item={item} onPress={handleNavigate} onRemove={handleRemove} />
    ),
    [handleNavigate, handleRemove]
  );

  const keyExtractor = useCallback((item: ClothingItem) => item.id, []);

  // 使用 getItemLayout 优化 FlatList 性能
  const getItemLayout = useCallback(
    (_data: unknown, index: number) => ({
      length: LIST_ITEM_HEIGHT,
      offset: LIST_ITEM_HEIGHT * index + 12 * index, // 12 是 marginBottom
      index,
    }),
    []
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t.common.loading}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.profile.myFavorites}</Text>
        <View style={styles.backBtn} />
      </View>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void fetchFavorites();
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>暂无收藏</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.emptyAction}>去逛逛</Text>
            </TouchableOpacity>
          </View>
        }
        // FlatList 性能优化参数
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "700", color: colors.text },
  backBtn: { width: Spacing.xl, height: Spacing.xl, alignItems: "center", justifyContent: "center" },
  list: { padding: Spacing.md},
  emptyList: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: DesignTokens.spacing[3],
    overflow: "hidden",
    flexDirection: "row",
    elevation: 2,
  },
  image: { width: 100, height: 100 },
  placeholder: {
    width: 100,
    height: 100,
    backgroundColor: DesignTokens.colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, padding: DesignTokens.spacing[3], justifyContent: "center" },
  name: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: colors.text },
  brand: { fontSize: DesignTokens.typography.sizes.sm, color: colors.primary, marginTop: DesignTokens.spacing['0.5']},
  price: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "700", color: colors.primary, marginTop: Spacing.xs},
  actions: { justifyContent: "center", paddingRight: DesignTokens.spacing[3]},
  removeBtn: { padding: Spacing.sm},
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textSecondary, marginTop: Spacing.sm},
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textTertiary, marginTop: Spacing.sm},
  emptyAction: { fontSize: DesignTokens.typography.sizes.base, color: colors.primary, marginTop: DesignTokens.spacing[3]},
});

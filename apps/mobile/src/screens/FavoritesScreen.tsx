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
import { theme } from '../design-system/theme';
import { useTranslation } from "../i18n";
import { DesignTokens } from "../theme/tokens/design-tokens";
import { favoriteApi } from "../services/api/commerce.api";
import { useAuthStore } from "../stores/index";
import type { ClothingItem } from "../types/clothing";
import type { RootStackParamList } from "../types/navigation";
import { ImageWithPlaceholder } from "../shared/components/common/ImageWithPlaceholder";

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
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item.id)} activeOpacity={0.7}>
      {item.imageUri ? (
        <ImageWithPlaceholder source={{ uri: item.imageUri }} style={styles.image} />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="shirt-outline" size={40} color={theme.colors.textTertiary} />
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
          <Ionicons name="heart" size={20} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

export const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authLoading = useAuthStore((state) => state.isLoading);
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
    } catch {
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
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t.common.loading}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
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
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={48} color={theme.colors.textTertiary} />
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
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  list: { padding: 16 },
  emptyList: { flex: 1 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 12,
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
  info: { flex: 1, padding: 12, justifyContent: "center" },
  name: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  brand: { fontSize: 12, color: theme.colors.primary, marginTop: 2 },
  price: { fontSize: 14, fontWeight: "700", color: theme.colors.primary, marginTop: 4 },
  actions: { justifyContent: "center", paddingRight: 12 },
  removeBtn: { padding: 8 },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 8 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: { fontSize: 14, color: theme.colors.textTertiary, marginTop: 8 },
  emptyAction: { fontSize: 14, color: theme.colors.primary, marginTop: 12 },
});

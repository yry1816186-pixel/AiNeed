import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Animated,
  Alert,
  PanResponder,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { cartApi, cartEnhancementApi } from "../services/api/commerce.api";
import { useCartStore } from "../stores/index";
import { useCouponStore } from "../stores/couponStore";

import { useScreenTracking } from "../hooks/useAnalytics";
import { useTranslation } from "../i18n";
import { theme } from '../design-system/theme';
import { DesignTokens } from "../theme/tokens/design-tokens";
import { haptics } from "../utils/haptics";
import { withErrorBoundary } from "../shared/components/ErrorBoundary";
import { EmptyCartView } from "../components/EmptyCartView";
import { FreeShippingProgress } from "../components/FreeShippingProgress";
import { CouponSelector } from "../components/CouponSelector";
import type { RootStackParamList } from "../types/navigation";
import type { ClothingItem } from "../types/clothing";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const SWIPE_THRESHOLD = -80;

export const CartScreenComponent: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  useScreenTracking("Cart");
  const t = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);
  const [showCouponSelector, setShowCouponSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const couponStore = useCouponStore();

  const { items, setItems, removeItem, updateItem, totalItems } = useCartStore();

  const fetchCart = useCallback(async () => {
    try {
      setError(null);
      const response = await cartApi.get();
      if (response.success && response.data) {
        const selected = new Set(
          response.data.filter((item) => item.selected).map((item) => item.id)
        );

        setItems(
          response.data.map((item) => ({
            id: item.id,
            item: item as unknown as ClothingItem,
            color: item.color,
            size: item.size,
            quantity: item.quantity,
            selected: item.selected ?? false,
          }))
        );
        setSelectedIds(selected);
      }
    } catch {
      setError("Failed to load cart");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setItems]);

  useEffect(() => {
    void fetchCart();
  }, [fetchCart]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchCart();
  }, [fetchCart]);

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const selectedTotal = useMemo(() => {
    return items
      .filter((item) => selectedIds.has(item.id))
      .reduce((sum, item) => sum + (item.item?.price || 0) * item.quantity, 0);
  }, [items, selectedIds]);

  const selectedCount = useMemo(() => {
    return items
      .filter((item) => selectedIds.has(item.id))
      .reduce((sum, item) => sum + item.quantity, 0);
  }, [items, selectedIds]);

  const toggleSelect = useCallback(
    async (id: string) => {
      haptics.selection();
      const currentlySelected = selectedIds.has(id);
      const nextSelected = !currentlySelected;

      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (nextSelected) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
      updateItem(id, { selected: nextSelected });

      try {
        await cartApi.update(id, { selected: nextSelected });
      } catch {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (currentlySelected) {
            next.add(id);
          } else {
            next.delete(id);
          }
          return next;
        });
        updateItem(id, { selected: currentlySelected });
        Alert.alert("提示", "更新勾选状态失败，请重试");
      }
    },
    [selectedIds, updateItem]
  );

  const toggleSelectAll = useCallback(async () => {
    const nextSelected = !allSelected;
    const previousSelectedIds = new Set(selectedIds);
    const nextSelectedIds = nextSelected
      ? new Set(items.map((item) => item.id))
      : new Set<string>();

    setSelectedIds(nextSelectedIds);
    items.forEach((item) => {
      updateItem(item.id, { selected: nextSelected });
    });

    try {
      await cartApi.selectAll(nextSelected);
    } catch {
      setSelectedIds(previousSelectedIds);
      items.forEach((item) => {
        updateItem(item.id, { selected: previousSelectedIds.has(item.id) });
      });
      Alert.alert("提示", "更新全选状态失败，请重试");
    }
  }, [allSelected, items, selectedIds, updateItem]);

  const handleQuantityChange = useCallback(
    async (id: string, newQuantity: number) => {
      if (newQuantity < 1) {
        return;
      }

      haptics.light();
      setUpdatingIds((prev) => new Set([...prev, id]));
      updateItem(id, { quantity: newQuantity });

      try {
        await cartApi.update(id, { quantity: newQuantity });
      } catch {
        updateItem(id, {
          quantity: items.find((i) => i.id === id)?.quantity ?? newQuantity - 1,
        });
        Alert.alert("提示", "更新数量失败，请重试");
      } finally {
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [items, updateItem]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      Alert.alert("确认删除", "确定要从购物车中移除该商品吗？", [
        { text: "取消", style: "cancel" },
        {
          text: "删除",
          style: "destructive",
          onPress: async () => {
            removeItem(id);
            setSelectedIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            try {
              await cartApi.remove(id);
            } catch {
              // Item removed from local store; server sync failure is non-critical
            }
          },
        },
      ]);
    },
    [removeItem]
  );

  const handleCheckout = useCallback(() => {
    if (selectedIds.size === 0) {
      Alert.alert("提示", "请选择要结算的商品");
      return;
    }
    navigation.navigate("Checkout");
  }, [selectedIds, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t.cart.title}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t.common.loading}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.cart.title}</Text>
        {totalItems > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{totalItems > 99 ? "99+" : totalItems}</Text>
            </View>
            <TouchableOpacity onPress={() => setEditMode((prev) => !prev)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.editToggleText}>{editMode ? t.common.done : t.common.edit}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item: cartItem }) => (
          <CartItemCard
            item={cartItem}
            isSelected={selectedIds.has(cartItem.id)}
            isUpdating={updatingIds.has(cartItem.id)}
            onToggleSelect={() => toggleSelect(cartItem.id)}
            onQuantityChange={(qty) => handleQuantityChange(cartItem.id, qty)}
            onDelete={() => handleDelete(cartItem.id)}
          />
        )}
        ListHeaderComponent={
          <View style={styles.selectAllRow}>
            <TouchableOpacity
              style={styles.checkboxTouchable}
              onPress={toggleSelectAll}
              activeOpacity={0.7}
              accessibilityLabel={allSelected ? "取消全选" : t.cart.selectAll}
            >
              <View
                style={[
                  styles.checkbox,
                  allSelected && styles.checkboxChecked,
                  someSelected && styles.checkboxIndeterminate,
                ]}
              >
                {allSelected && (
                  <Ionicons name="checkmark" size={14} color={theme.colors.surface} />
                )}
                {someSelected && !allSelected && (
                  <Ionicons name="remove" size={14} color={theme.colors.surface} />
                )}
              </View>
              <Text style={styles.selectAllText}>{t.cart.selectAll}</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textTertiary} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <EmptyCartView
              onGoShopping={() => navigation.navigate("MainTabs", { screen: "Home" } as never)}
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={[styles.scrollContent, items.length === 0 && { flex: 1 }]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={8}
        windowSize={5}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.couponEntry}
          onPress={() => {
            void couponStore.fetchUserCoupons();
            setShowCouponSelector(true);
          }}
        >
          <Text style={styles.couponEntryText}>
            {couponStore.availableCoupons.length > 0
              ? `${couponStore.availableCoupons.length}张优惠券可用`
              : "使用优惠券"}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={DesignTokens.colors.neutral[400]} />
        </TouchableOpacity>

        <FreeShippingProgress currentAmount={selectedTotal} />

        {editMode ? (
          <View style={styles.batchRow}>
            <TouchableOpacity
              style={styles.selectAllFooter}
              onPress={toggleSelectAll}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, allSelected && styles.checkboxChecked]}>
                {allSelected && (
                  <Ionicons name="checkmark" size={14} color={theme.colors.surface} />
                )}
              </View>
              <Text style={styles.selectAllText}>{t.cart.selectAll}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.batchButton}
              onPress={() => {
                const ids = Array.from(selectedIds);
                if (ids.length === 0) {
                  return;
                }
                Alert.alert("确认删除", `确定要删除选中的 ${ids.length} 件商品吗？`, [
                  { text: "取消", style: "cancel" },
                  {
                    text: "删除",
                    style: "destructive",
                    onPress: async () => {
                      await cartEnhancementApi.batchDeleteCartItems(ids);
                      ids.forEach((id) => removeItem(id));
                      setSelectedIds(new Set());
                    },
                  },
                ]);
              }}
            >
              <Text style={styles.batchButtonText}>{t.common.delete}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.batchButton}
              onPress={async () => {
                const ids = Array.from(selectedIds);
                if (ids.length === 0) {
                  return;
                }
                await cartEnhancementApi.moveCartToFavorites(ids);
                ids.forEach((id) => removeItem(id));
                setSelectedIds(new Set());
              }}
            >
              <Text style={styles.batchButtonText}>移入收藏</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.selectAllFooter}
              onPress={toggleSelectAll}
              activeOpacity={0.7}
              accessibilityLabel={allSelected ? "取消全选" : t.cart.selectAll}
            >
              <View
                style={[
                  styles.checkbox,
                  allSelected && styles.checkboxChecked,
                  someSelected && styles.checkboxIndeterminate,
                ]}
              >
                {allSelected && (
                  <Ionicons name="checkmark" size={14} color={theme.colors.surface} />
                )}
                {someSelected && !allSelected && (
                  <Ionicons name="remove" size={14} color={theme.colors.surface} />
                )}
              </View>
              <Text style={styles.selectAllText}>{t.cart.selectAll}</Text>
            </TouchableOpacity>

            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>{t.cart.total}：</Text>
              <Text style={styles.totalPrice}>¥{selectedTotal.toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.checkoutButton,
                selectedIds.size === 0 && styles.checkoutButtonDisabled,
              ]}
              onPress={handleCheckout}
              disabled={selectedIds.size === 0}
              activeOpacity={0.8}
            >
              <Text style={styles.checkoutButtonText}>
                {t.cart.checkout}{selectedCount > 0 ? `(${selectedCount})` : ""}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <CouponSelector
        visible={showCouponSelector}
        coupons={couponStore.availableCoupons}
        selectedCouponId={couponStore.selectedCoupon?.id ?? null}
        onSelect={(coupon) => couponStore.selectCoupon(coupon)}
        onClose={() => setShowCouponSelector(false)}
      />
    </SafeAreaView>
  );
};

interface CartItemCardProps {
  item: {
    id: string;
    item: {
      name?: string;
      price?: number;
      imageUri?: string;
      originalPrice?: number;
    };
    color: string;
    size: string;
    quantity: number;
  };
  isSelected: boolean;
  isUpdating: boolean;
  onToggleSelect: () => void;
  onQuantityChange: (quantity: number) => void;
  onDelete: () => void;
}

const CartItemCard: React.FC<CartItemCardProps> = ({
  item,
  isSelected,
  isUpdating,
  onToggleSelect,
  onQuantityChange,
  onDelete,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const itemPrice = item.item?.price ?? 0;
  const lineTotal = itemPrice * item.quantity;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -160));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < SWIPE_THRESHOLD) {
          Animated.spring(translateX, {
            toValue: -120,
            useNativeDriver: true,
            overshootClamping: true,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const resetSwipe = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [translateX]);

  return (
    <View style={styles.cardOuter}>
      <Animated.View
        style={[styles.cardSwipeable, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.checkboxTouchable}
          onPress={onToggleSelect}
          activeOpacity={0.7}
          accessibilityLabel={isSelected ? "取消选择" : "选择商品"}
        >
          <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
            {isSelected && <Ionicons name="checkmark" size={14} color={theme.colors.surface} />}
          </View>
        </TouchableOpacity>

        <View style={styles.cardImageWrap}>
          {item.item?.imageUri ? (
            <Image
              source={{ uri: item.item.imageUri }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Ionicons name="image-outline" size={24} color={theme.colors.textTertiary} />
            </View>
          )}
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={2}>
            {item.item?.name || "商品"}
          </Text>
          <View style={styles.cardSpecs}>
            {item.color ? (
              <View style={styles.specChip}>
                <Text style={styles.specText}>{item.color}</Text>
              </View>
            ) : null}
            {item.size ? (
              <View style={styles.specChip}>
                <Text style={styles.specText}>{item.size}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.cardBottom}>
            <Text style={styles.cardPrice}>¥{lineTotal.toFixed(2)}</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => onQuantityChange(item.quantity - 1)}
                disabled={item.quantity <= 1 || isUpdating}
                activeOpacity={0.7}
                accessibilityLabel="减少数量"
              >
                <Ionicons
                  name="remove"
                  size={16}
                  color={item.quantity <= 1 ? theme.colors.border : theme.colors.primary}
                />
              </TouchableOpacity>
              <View style={styles.quantityDisplay}>
                {isUpdating ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => onQuantityChange(item.quantity + 1)}
                disabled={isUpdating}
                activeOpacity={0.7}
                accessibilityLabel="增加数量"
              >
                <Ionicons name="add" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>

      <View style={styles.deleteAction}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            resetSwipe();
            onDelete();
          }}
          activeOpacity={0.7}
          accessibilityLabel="删除商品"
        >
          <Ionicons name="trash-outline" size={22} color={theme.colors.surface} />
          <Text style={styles.deleteText}>{t.common.delete}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: { fontSize: 24, fontWeight: "700", color: theme.colors.text },
  badge: {
    marginLeft: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: theme.colors.surface, fontSize: 11, fontWeight: "600" },
  content: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { marginTop: 12, fontSize: 14, color: theme.colors.textSecondary },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginTop: 16,
  },
  emptySubtext: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 8 },
  emptyButton: {
    marginTop: 24,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: { color: theme.colors.surface, fontSize: 15, fontWeight: "600" },

  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  selectAllFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectAllText: { fontSize: 14, color: theme.colors.textSecondary, marginLeft: 8 },

  checkboxTouchable: {
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkboxIndeterminate: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },

  cardOuter: {
    overflow: "hidden",
    marginBottom: 8,
  },
  cardSwipeable: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  deleteAction: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 120,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.error,
  },
  deleteButton: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    width: "100%",
  },
  deleteText: { color: theme.colors.surface, fontSize: 12, marginTop: 4 },

  cardImageWrap: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: "hidden",
    marginLeft: 4,
    backgroundColor: theme.colors.placeholderBg,
  },
  cardImage: { width: "100%", height: "100%" },
  cardImagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.placeholderBg,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
    minHeight: 80,
  },
  cardName: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  cardSpecs: { flexDirection: "row", marginTop: 6 },
  specChip: {
    backgroundColor: theme.colors.placeholderBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  specText: { fontSize: 12, color: theme.colors.textSecondary },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  cardPrice: { fontSize: 15, fontWeight: "600", color: theme.colors.primary },

  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.placeholderBg,
    borderRadius: 8,
    overflow: "hidden",
  },
  quantityButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DesignTokens.colors.neutral[50],
  },
  quantityDisplay: {
    width: 36,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.colors.placeholderBg,
  },
  quantityText: { fontSize: 14, fontWeight: "500", color: theme.colors.text },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    ...({
      shadowColor: DesignTokens.colors.neutral.black,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 12,
    } as ViewStyle),
  },
  totalSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginRight: 12,
  },
  totalLabel: { fontSize: 14, color: theme.colors.textSecondary },
  totalPrice: { fontSize: 20, fontWeight: "700", color: theme.colors.primary },

  checkoutButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 110,
    alignItems: "center",
  },
  checkoutButtonDisabled: { backgroundColor: "#C7D2FE" }, // custom color
  checkoutButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: "600",
  },
  editToggleText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  couponEntry: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[100],
  },
  couponEntryText: {
    fontSize: 14,
    color: "#FF4D4F", // custom color
  },
  batchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  batchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  batchButtonText: {
    fontSize: 14,
    color: DesignTokens.colors.neutral[700],
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 15,
    color: theme.colors.textTertiary,
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: DesignTokens.colors.neutral.white,
    fontSize: 14,
    fontWeight: "600",
  },
});

const CartScreen = withErrorBoundary(CartScreenComponent, {
  screenName: "CartScreen",
  maxRetries: 3,
  onError: (error, errorInfo, structuredError) => {
    console.error("[CartScreen] Error:", structuredError);
  },
  onReset: () => {
    console.log("[CartScreen] Error boundary reset");
  },
});

export { CartScreen };
export default CartScreen;

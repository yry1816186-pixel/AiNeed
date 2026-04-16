import React, { useCallback, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import BottomSheet, {
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetFlatList,
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProvider,
  useBottomSheetModal,
  BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";

import { Colors, Spacing, BorderRadius, Typography } from '../../design-system/theme';
import { DesignTokens } from "../theme/tokens/design-tokens";
import { useTheme } from '../../shared/contexts/ThemeContext';

type _ViewStyle = import("react-native").ViewStyle;
type _ViewProps = import("react-native").ViewProps;

const { height: _SCREEN_HEIGHT } = Dimensions.get("window");

interface SizeOption {
  id: string;
  label: string;
  available?: boolean;
}

interface ColorOption {
  id: string;
  label: string;
  hex: string;
}

interface ProductBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  product?: {
    id: string;
    name: string;
    price: number;
    image?: string;
    sizes?: SizeOption[];
    colors?: ColorOption[];
  };
  selectedSize?: string;
  selectedColor?: string;
  onSizeSelect?: (sizeId: string) => void;
  onColorSelect?: (colorId: string) => void;
  onAddToCart?: () => void;
  onBuyNow?: () => void;
}

export function ProductBottomSheet({
  visible,
  onClose,
  product,
  selectedSize,
  selectedColor,
  onSizeSelect,
  onColorSelect,
  onAddToCart,
  onBuyNow,
}: ProductBottomSheetProps) {
  const { colors } = useTheme();
  const snapPoints = useMemo(() => ["60%", "80%"], []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleAnimate = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (toIndex === -1) {
        onClose();
      }
    },
    [onClose]
  );

  if (!visible) {
    return null;
  }

  return (
    <BottomSheetModal
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      onAnimate={handleAnimate}
      enablePanDownToClose
      handleIndicatorStyle={styles.handleIndicator}
      backgroundStyle={styles.background}
    >
      <BottomSheetScrollView style={styles.content}>
        {product && (
          <>
            <View style={styles.productHeader}>
              <View style={styles.productImage}>
                <Text style={styles.productImageEmoji}>👗</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={styles.productPrice}>¥{product.price}</Text>
              </View>
            </View>

            {product.sizes && product.sizes.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>选择尺码</Text>
                <View style={styles.optionsGrid}>
                  {product.sizes.map((size) => {
                    const isSelected = selectedSize === size.id;
                    const isUnavailable = size.available === false;
                    return (
                      <TouchableOpacity
                        key={size.id}
                        style={[
                          styles.sizeOption,
                          isSelected && styles.sizeOptionSelected,
                          isUnavailable && styles.sizeOptionUnavailable,
                        ]}
                        onPress={() => !isUnavailable && onSizeSelect?.(size.id)}
                        disabled={isUnavailable}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.sizeOptionText,
                            isSelected && styles.sizeOptionTextSelected,
                            isUnavailable && styles.sizeOptionTextUnavailable,
                          ]}
                        >
                          {size.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {product.colors && product.colors.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>选择颜色</Text>
                <View style={styles.optionsGrid}>
                  {product.colors.map((color) => {
                    const isSelected = selectedColor === color.id;
                    return (
                      <TouchableOpacity
                        key={color.id}
                        style={[styles.colorOption, isSelected && styles.colorOptionSelected]}
                        onPress={() => onColorSelect?.(color.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.colorDot, { backgroundColor: color.hex }]} />
                        <Text
                          style={[
                            styles.colorOptionText,
                            isSelected && styles.colorOptionTextSelected,
                          ]}
                        >
                          {color.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.addToCartButton}
                onPress={onAddToCart}
                activeOpacity={0.8}
              >
                <Text style={styles.addToCartText}>加入购物车</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.buyNowButton} onPress={onBuyNow} activeOpacity={0.8}>
                <LinearGradient
                  colors={[Colors.primary[500], Colors.primary[600]]}
                  style={styles.buyNowGradient}
                >
                  <Text style={styles.buyNowText}>立即购买</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

interface FilterBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onReset?: () => void;
  onApply?: () => void;
  children?: React.ReactNode;
}

export function FilterBottomSheet({
  visible,
  onClose,
  onReset,
  onApply,
  children,
}: FilterBottomSheetProps) {
  const snapPoints = useMemo(() => ["70%"], []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleAnimate = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (toIndex === -1) {
        onClose();
      }
    },
    [onClose]
  );

  if (!visible) {
    return null;
  }

  return (
    <BottomSheetModal
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      onAnimate={handleAnimate}
      enablePanDownToClose
      handleIndicatorStyle={styles.handleIndicator}
      backgroundStyle={styles.background}
    >
      <BottomSheetView style={styles.filterContent}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>筛选</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.filterClose}>✕</Text>
          </TouchableOpacity>
        </View>

        {children}

        <View style={styles.filterActions}>
          <TouchableOpacity style={styles.resetButton} onPress={onReset}>
            <Text style={styles.resetText}>重置</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyButton} onPress={onApply}>
            <LinearGradient
              colors={[Colors.primary[500], Colors.primary[600]]}
              style={styles.applyGradient}
            >
              <Text style={styles.applyText}>确定</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

interface ShareBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onShare?: (platform: string) => void;
}

export function ShareBottomSheet({ visible, onClose, onShare }: ShareBottomSheetProps) {
  const snapPoints = useMemo(() => ["35%"], []);

  const platforms = [
    { id: "wechat", name: "微信", icon: "💬" },
    { id: "moments", name: "朋友圈", icon: "📱" },
    { id: "weibo", name: "微博", icon: "📢" },
    { id: "qq", name: "QQ", icon: "🐧" },
    { id: "copy", name: "复制链接", icon: "🔗" },
    { id: "more", name: "更多", icon: "➕" },
  ];

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleAnimate = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (toIndex === -1) {
        onClose();
      }
    },
    [onClose]
  );

  if (!visible) {
    return null;
  }

  return (
    <BottomSheetModal
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      onAnimate={handleAnimate}
      enablePanDownToClose
      handleIndicatorStyle={styles.handleIndicator}
      backgroundStyle={styles.background}
    >
      <BottomSheetView style={styles.shareContent}>
        <Text style={styles.shareTitle}>分享到</Text>
        <View style={styles.shareGrid}>
          {platforms.map((platform) => (
            <TouchableOpacity
              key={platform.id}
              style={styles.shareItem}
              onPress={() => onShare?.(platform.id)}
              activeOpacity={0.7}
            >
              <View style={styles.shareIconContainer}>
                <Text style={styles.shareIcon}>{platform.icon}</Text>
              </View>
              <Text style={styles.shareName}>{platform.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelText}>取消</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: Colors.neutral[0],
    borderTopLeftRadius: BorderRadius["3xl"],
    borderTopRightRadius: BorderRadius["3xl"],
  },
  handleIndicator: {
    backgroundColor: Colors.neutral[300],
    width: DesignTokens.spacing[10],
    height: Spacing.xs,
  },
  content: {
    flex: 1,
    padding: Spacing[5],
  },
  productHeader: {
    flexDirection: "row",
    marginBottom: Spacing[5],
  },
  productImage: {
    width: Spacing['4xl'],
    height: Spacing['4xl'],
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing[4],
  },
  productImageEmoji: {
    fontSize: DesignTokens.typography.sizes['3xl'],
  },
  productInfo: {
    flex: 1,
    justifyContent: "center",
  },
  productName: {
    ...Typography.body.md,
    color: Colors.neutral[900],
    fontWeight: "600",
    marginBottom: Spacing[1],
  },
  productPrice: {
    ...Typography.heading.lg,
    color: Colors.primary[600],
    fontWeight: "800",
  },
  section: {
    marginBottom: Spacing[5],
  },
  sectionTitle: {
    ...Typography.body.md,
    color: Colors.neutral[700],
    fontWeight: "600",
    marginBottom: Spacing[3],
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[2],
  },
  sizeOption: {
    minWidth: Spacing['2xl'],
    height: DesignTokens.spacing[10],
    paddingHorizontal: Spacing[3],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  sizeOptionSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  sizeOptionUnavailable: {
    borderColor: Colors.neutral[100],
    backgroundColor: Colors.neutral[50],
  },
  sizeOptionText: {
    ...Typography.body.sm,
    color: Colors.neutral[600],
  },
  sizeOptionTextSelected: {
    color: Colors.primary[600],
    fontWeight: "600",
  },
  sizeOptionTextUnavailable: {
    color: Colors.neutral[300],
    textDecorationLine: "line-through",
  },
  colorOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[3],
    height: DesignTokens.spacing[9],
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    gap: Spacing[2],
  },
  colorOptionSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  colorDot: {
    width: Spacing.md,
    height: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  colorOptionText: {
    ...Typography.body.sm,
    color: Colors.neutral[600],
  },
  colorOptionTextSelected: {
    color: Colors.primary[600],
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: Spacing[3],
    marginTop: Spacing[4],
    paddingBottom: Spacing[4],
  },
  addToCartButton: {
    flex: 1,
    height: Spacing['2xl'],
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary[100],
    borderRadius: BorderRadius.xl,
  },
  addToCartText: {
    ...Typography.body.md,
    color: Colors.primary[700],
    fontWeight: "600",
  },
  buyNowButton: {
    flex: 1,
    height: Spacing['2xl'],
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  buyNowGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buyNowText: {
    ...Typography.body.md,
    color: Colors.neutral[0],
    fontWeight: "700",
  },
  filterContent: {
    flex: 1,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  filterTitle: {
    ...Typography.heading.md,
    color: Colors.neutral[900],
  },
  filterClose: {
    ...Typography.heading.sm,
    color: Colors.neutral[500],
  },
  filterActions: {
    flexDirection: "row",
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
    gap: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  resetButton: {
    flex: 1,
    height: Spacing['2xl'],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.neutral[300],
  },
  resetText: {
    ...Typography.body.md,
    color: Colors.neutral[600],
    fontWeight: "600",
  },
  applyButton: {
    flex: 1,
    height: Spacing['2xl'],
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  applyGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  applyText: {
    ...Typography.body.md,
    color: Colors.neutral[0],
    fontWeight: "600",
  },
  shareContent: {
    padding: Spacing[5],
  },
  shareTitle: {
    ...Typography.heading.md,
    color: Colors.neutral[900],
    textAlign: "center",
    marginBottom: Spacing[5],
  },
  shareGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: Spacing[5],
  },
  shareItem: {
    width: "30%",
    alignItems: "center",
    marginBottom: Spacing[4],
  },
  shareIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.neutral[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[2],
  },
  shareIcon: {
    fontSize: DesignTokens.typography.sizes['3xl'],
  },
  shareName: {
    ...Typography.caption.md,
    color: Colors.neutral[600],
  },
  cancelButton: {
    height: Spacing['2xl'],
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.xl,
  },
  cancelText: {
    ...Typography.body.md,
    color: Colors.neutral[600],
    fontWeight: "500",
  },
});

export { BottomSheetModalProvider };

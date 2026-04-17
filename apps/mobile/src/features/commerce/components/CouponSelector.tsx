import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import type { UserCoupon } from '../../../services/api/commerce.api';
import { DesignTokens, Spacing, flatColors as colors } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

interface CouponSelectorProps {
  visible: boolean;
  coupons: UserCoupon[];
  selectedCouponId: string | null;
  onSelect: (coupon: UserCoupon | null) => void;
  onClose: () => void;
}

export const CouponSelector: React.FC<CouponSelectorProps> = ({
  visible,
  coupons,
  selectedCouponId,
  onSelect,
  onClose,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const formatDiscount = (coupon: UserCoupon["coupon"]): string => {
    if (coupon.type === "PERCENTAGE") {
      return `${coupon.value}%`;
    }
    if (coupon.type === "SHIPPING") {
      return "免运费";
    }
    return `¥${coupon.value}`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>选择优惠券</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>关闭</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.noCouponRow}
            onPress={() => {
              onSelect(null);
              onClose();
            }}
          >
            <Text style={styles.noCouponText}>不使用优惠券</Text>
            {selectedCouponId === null && <Ionicons name="checkmark" size={20} color="colors.error" />}
          </TouchableOpacity>

          <FlatList
            data={coupons}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = selectedCouponId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.couponRow, isSelected && styles.couponRowSelected]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <View style={styles.couponLeft}>
                    <Text style={styles.couponDiscount}>{formatDiscount(item.coupon)}</Text>
                    <Text style={styles.couponCondition}>满¥{item.coupon.minOrderAmount}可用</Text>
                  </View>
                  <View style={styles.couponRight}>
                    <Text style={styles.couponDesc}>{item.coupon.description}</Text>
                    <Text style={styles.couponExpiry}>
                      有效期至 {item.coupon.endDate.slice(0, 10)}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="colors.error"
                      style={styles.checkIcon}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

const useStyles = createStyles((colors) => ({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "70%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "colors.backgroundTertiary",
  },
  title: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: colors.textPrimary },
  close: { fontSize: DesignTokens.typography.sizes.base, color: colors.textTertiary },
  noCouponRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['3.5'],
    borderBottomWidth: 1,
    borderBottomColor: "colors.backgroundTertiary",
  },
  noCouponText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textSecondary },
  couponRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['3.5'],
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundTertiary,
  },
  couponRowSelected: { backgroundColor: DesignTokens.colors.neutral[50] },
  couponLeft: {
    width: Spacing['4xl'],
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "colors.backgroundTertiary",
    marginRight: DesignTokens.spacing[3],
  },
  couponDiscount: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: "colors.error",
  },
  couponCondition: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.textTertiary,
    marginTop: DesignTokens.spacing['0.5'],
  },
  couponRight: { flex: 1 },
  couponDesc: { fontSize: DesignTokens.typography.sizes.base, color: colors.textPrimary },
  couponExpiry: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textTertiary, marginTop: Spacing.xs},
  checkIcon: { marginLeft: Spacing.sm},
}))

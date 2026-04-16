import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import type { UserCoupon } from "../services/api/commerce.api";
import { DesignTokens } from "../../../design-system/theme";

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
            {selectedCouponId === null && <Ionicons name="checkmark" size={20} color="#FF4D4F" />}
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
                      color="#FF4D4F"
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "70%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  title: { fontSize: 16, fontWeight: "600", color: DesignTokens.colors.text.primary },
  close: { fontSize: 14, color: DesignTokens.colors.text.tertiary },
  noCouponRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  noCouponText: { fontSize: 14, color: DesignTokens.colors.text.secondary },
  couponRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.backgrounds.tertiary,
  },
  couponRowSelected: { backgroundColor: "#FFF8F8" },
  couponLeft: {
    width: 80,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#F0F0F0",
    marginRight: 12,
  },
  couponDiscount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FF4D4F",
  },
  couponCondition: {
    fontSize: 11,
    color: DesignTokens.colors.text.tertiary,
    marginTop: 2,
  },
  couponRight: { flex: 1 },
  couponDesc: { fontSize: 14, color: DesignTokens.colors.text.primary },
  couponExpiry: { fontSize: 12, color: DesignTokens.colors.text.tertiary, marginTop: 4 },
  checkIcon: { marginLeft: 8 },
});

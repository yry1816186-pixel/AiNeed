import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { useScreenTracking } from '../../../hooks/useAnalytics';
import { useTranslation } from '../../../i18n';
import { useFeatureFlags } from '../../../shared/contexts/FeatureFlagContext';
import { FeatureFlagKeys } from '../../../constants/feature-flags';
import { addressApi, cartApi, orderApi, paymentApi } from '../../../services/api/commerce.api';
import { useCartStore } from '../stores/index';
import { useCouponStore } from '../stores/couponStore';
import type { Address } from '../../../types';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { flatColors as colors, Spacing } from '../../../design-system/theme';
import { CouponSelector } from '../components/CouponSelector';
import { PaymentWaitingScreen } from '../components/PaymentWaitingScreen';
import { AreaCascadingPicker } from '../../../components/address/AreaCascadingPicker';
import type { RootStackParamList } from '../../../types/navigation';


type Navigation = NativeStackNavigationProp<RootStackParamList>;

type CheckoutStep = "summary" | "address" | "payment" | "success";

interface CheckoutItem {
  id: string;
  productId: string;
  name: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
}

type AddressDraft = Omit<Address, "id">;

const EMPTY_ADDRESS: AddressDraft = {
  name: "",
  phone: "",
  province: "",
  city: "",
  district: "",
  detail: "",
  isDefault: true,
};

export const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  useScreenTracking("Checkout");
  const t = useTranslation();
  const { isEnabled } = useFeatureFlags();
  const isV2Checkout = isEnabled(FeatureFlagKeys.V2_CHECKOUT);
  const { items, clear } = useCartStore();

  const [step, setStep] = useState<CheckoutStep>("summary");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [cartItems, setCartItems] = useState<CheckoutItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [orderId, setOrderId] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [draftAddress, setDraftAddress] = useState<AddressDraft>(EMPTY_ADDRESS);
  const [showCouponSelector, setShowCouponSelector] = useState(false);
  const [showPaymentWaiting, setShowPaymentWaiting] = useState(false);
  const [paymentOrderId, setPaymentOrderId] = useState("");
  const [areaPickerVisible, setAreaPickerVisible] = useState(false);
  const couponStore = useCouponStore();

  const loadCheckoutData = useCallback(async () => {
    setLoading(true);
    try {
      const [cartResponse, addressResponse] = await Promise.all([
        cartApi.get(),
        addressApi.getAll(),
      ]);

      const selectedFromApi =
        cartResponse.success && cartResponse.data
          ? cartResponse.data.filter((item) => item.selected)
          : [];
      const selectedFromStore = items
        .filter((item: any) => item.selected)
        .map((item: any) => ({
          id: item.id,
          productId: item.item?.id ?? "",
          name: item.item?.name ?? "",
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          price: item.item?.price ?? 0,
        }));

      setCartItems(
        (selectedFromApi.length > 0 ? selectedFromApi : selectedFromStore).map((item: any) => ({
          id: item.id,
          productId: item.productId,
          name: item.name,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          price: item.price,
        }))
      );

      if (addressResponse.success && addressResponse.data) {
        setAddresses(addressResponse.data);
        const defaultAddress =
          addressResponse.data.find((address) => address.isDefault) ??
          addressResponse.data[0] ??
          null;
        setSelectedAddress(defaultAddress);
        setShowAddressForm(addressResponse.data.length === 0);
      } else {
        setAddresses([]);
        setSelectedAddress(null);
        setShowAddressForm(true);
      }
    } catch {
      setCartItems(
        items
          .filter((item: any) => item.selected)
          .map((item: any) => ({
            id: item.id,
            productId: item.item?.id ?? "",
            name: item.item?.name ?? "",
            color: item.color,
            size: item.size,
            quantity: item.quantity,
            price: item.item?.price ?? 0,
          }))
      );
      setAddresses([]);
      setSelectedAddress(null);
      setShowAddressForm(true);
    } finally {
      setLoading(false);
    }
  }, [items]);

  useEffect(() => {
    void loadCheckoutData();
  }, [loadCheckoutData]);

  const itemsTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );
  const shippingFee = itemsTotal >= 99 ? 0 : 10;
  const orderTotal = itemsTotal + shippingFee;

  const updateDraft = useCallback((field: keyof AddressDraft, value: string | boolean) => {
    setDraftAddress((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSaveAddress = useCallback(async () => {
    if (
      !draftAddress.name.trim() ||
      !draftAddress.phone.trim() ||
      !draftAddress.province.trim() ||
      !draftAddress.city.trim() ||
      !draftAddress.district.trim() ||
      !draftAddress.detail.trim()
    ) {
      Alert.alert("信息不完整", "请填写完整的收货地址信息。");
      return;
    }

    setSavingAddress(true);
    try {
      const response = await addressApi.create(draftAddress);
      if (response.success && response.data) {
        setAddresses((prev) => [...prev, response.data as Address]);
        setSelectedAddress(response.data);
        setDraftAddress(EMPTY_ADDRESS);
        setShowAddressForm(false);
      } else {
        Alert.alert("保存失败", response.error?.message ?? "地址保存失败。");
      }
    } catch {
      Alert.alert("保存失败", "网络异常，请稍后重试。");
    } finally {
      setSavingAddress(false);
    }
  }, [draftAddress]);

  const handlePlaceOrder = useCallback(async (): Promise<string | null> => {
    if (cartItems.length === 0) {
      Alert.alert("暂无可结算商品", "请先从购物车中选择商品。");
      return null;
    }

    if (!selectedAddress) {
      Alert.alert("请选择地址", "请先选择或新增收货地址。");
      setStep("address");
      return null;
    }

    setSubmitting(true);
    try {
      const response = await orderApi.create({
        addressId: selectedAddress.id,
        items: cartItems.map((item) => ({
          itemId: item.productId,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
        })),
      });

      if (response.success && response.data) {
        const newOrderId = response.data.id;
        setOrderId(newOrderId);
        setCartItems([]);
        clear();
        setStep("success");
        return newOrderId;
      } else {
        Alert.alert("提交订单失败", response.error?.message ?? "请稍后重试。");
        return null;
      }
    } catch {
      Alert.alert("提交订单失败", "网络异常，请稍后重试。");
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [cartItems, clear, selectedAddress]);

  const steps = [t.checkout.confirmItems, t.checkout.shippingAddress, t.checkout.paymentPreference];

  return (
    <SafeAreaView style={styles.container}>
      {step !== "success" ? (
        <>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                if (step === "summary") {
                  navigation.goBack();
                } else if (step === "address") {
                  setStep("summary");
                } else {
                  setStep("address");
                }
              }}
              accessibilityLabel="返回"
            >
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t.checkout.title}</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          <View style={styles.progressRow}>
            {steps.map((label, index) => {
              const activeIndex = step === "summary" ? 0 : step === "address" ? 1 : 2;
              return (
                <View key={label} style={styles.progressItem}>
                  <View
                    style={[styles.progressDot, index <= activeIndex && styles.progressDotActive]}
                  />
                  <Text
                    style={[styles.progressText, index <= activeIndex && styles.progressTextActive]}
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {step === "summary" ? (
              <>
                {isV2Checkout ? (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>快速结算</Text>
                    {cartItems.length === 0 ? (
                      <Text style={styles.muted}>当前没有勾选任何商品。</Text>
                    ) : (
                      <>
                        <Text style={styles.muted}>
                          共 {cartItems.length} 件商品
                        </Text>
                        <View style={[styles.spaceRow, styles.totalRow]}>
                          <Text style={styles.totalLabel}>应付总额</Text>
                          <Text style={styles.totalValue}>
                            {"\u00A5"}
                            {orderTotal.toFixed(2)}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                ) : (
                <>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{t.checkout.confirmItems}</Text>
                  {cartItems.length === 0 ? (
                    <Text style={styles.muted}>当前没有勾选任何商品。</Text>
                  ) : (
                    cartItems.map((item) => (
                      <View key={item.id} style={styles.row}>
                        <View style={styles.flex}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <Text style={styles.muted}>
                            {item.color || "默认色"} / {item.size || "默认尺码"} x{item.quantity}
                          </Text>
                        </View>
                        <Text style={styles.price}>
                          {"\u00A5"}
                          {(item.price * item.quantity).toFixed(2)}
                        </Text>
                      </View>
                    ))
                  )}
                </View>

                <View style={styles.card}>
                  <View style={styles.spaceRow}>
                    <Text style={styles.muted}>商品小计</Text>
                    <Text style={styles.value}>
                      {"\u00A5"}
                      {itemsTotal.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.spaceRow}>
                    <Text style={styles.muted}>运费</Text>
                    <Text style={styles.value}>
                      {shippingFee === 0 ? "免运费" : `\u00A5${shippingFee.toFixed(2)}`}
                    </Text>
                  </View>
                  <View style={[styles.spaceRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>应付总额</Text>
                    <Text style={styles.totalValue}>
                      {"\u00A5"}
                      {orderTotal.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => setStep("address")}
                  accessibilityLabel="进入地址选择"
                >
                  <Text style={styles.primaryText}>选择收货地址</Text>
                </TouchableOpacity>
                </>
                )}
              </>
            ) : null}

            {step === "address" ? (
              <>
                <View style={styles.card}>
                  <View style={styles.spaceRow}>
                    <Text style={styles.cardTitle}>{t.checkout.shippingAddress}</Text>
                    <TouchableOpacity
                      onPress={() => setShowAddressForm((prev) => !prev)}
                      accessibilityLabel={t.checkout.addAddress}
                    >
                      <Text style={styles.link}>{t.checkout.addAddress}</Text>
                    </TouchableOpacity>
                  </View>

                  {showAddressForm ? (
                    <View style={styles.form}>
                      <TextInput
                        style={styles.input}
                        value={draftAddress.name}
                        onChangeText={(value) => updateDraft("name", value)}
                        placeholder={t.checkout.recipientName}
                        placeholderTextColor={colors.textTertiary}
                      />
                      <TextInput
                        style={styles.input}
                        value={draftAddress.phone}
                        onChangeText={(value) => updateDraft("phone", value)}
                        placeholder={t.checkout.phoneNumber}
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="phone-pad"
                      />
                      <TouchableOpacity
                        style={styles.areaRow}
                        onPress={() => setAreaPickerVisible(true)}
                        accessibilityLabel="选择地区"
                      >
                        <Text
                          style={[
                            styles.areaText,
                            !draftAddress.province && styles.areaPlaceholder,
                          ]}
                          numberOfLines={1}
                        >
                          {draftAddress.province && draftAddress.city && draftAddress.district
                            ? `${draftAddress.province} ${draftAddress.city} ${draftAddress.district}`
                            : t.checkout.province}
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={colors.textTertiary}
                        />
                      </TouchableOpacity>
                      <TextInput
                        style={[styles.input, styles.multiline]}
                        value={draftAddress.detail}
                        onChangeText={(value) => updateDraft("detail", value)}
                        placeholder={t.checkout.detailAddress}
                        placeholderTextColor={colors.textTertiary}
                        multiline
                      />
                      <TouchableOpacity
                        style={styles.primaryButtonInline}
                        onPress={handleSaveAddress}
                        disabled={savingAddress}
                        accessibilityLabel="保存地址"
                      >
                        {savingAddress ? (
                          <ActivityIndicator size="small" color={colors.surface} />
                        ) : (
                          <Text style={styles.primaryText}>{t.common.save}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {addresses.length === 0 ? (
                    <Text style={styles.muted}>当前没有可用地址，请先新增地址。</Text>
                  ) : (
                    addresses.map((address) => (
                      <TouchableOpacity
                        key={address.id}
                        style={[
                          styles.addressCard,
                          selectedAddress?.id === address.id && styles.addressCardActive,
                        ]}
                        onPress={() => setSelectedAddress(address)}
                        accessibilityLabel={`选择地址 ${address.province}${address.city}${address.district}${address.detail}`}
                      >
                        <Text style={styles.itemName}>
                          {address.name} {address.phone}
                        </Text>
                        <Text style={styles.muted}>
                          {address.province}
                          {address.city}
                          {address.district}
                          {address.detail}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setStep("summary")}
                    accessibilityLabel="返回确认商品"
                  >
                    <Text style={styles.secondaryText}>上一步</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.primaryButtonFlex}
                    onPress={() => {
                      if (!selectedAddress) {
                        Alert.alert("请选择地址", "请先选择或新增收货地址。");
                        return;
                      }
                      setStep("payment");
                    }}
                    accessibilityLabel="进入支付偏好"
                  >
                    <Text style={styles.primaryText}>继续提交</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}

            {step === "payment" ? (
              <>
                <View style={styles.card}>
                  <View style={styles.spaceRow}>
                    <Text style={styles.cardTitle}>优惠券</Text>
                    <TouchableOpacity
                      onPress={() => {
                        void couponStore.fetchUserCoupons();
                        setShowCouponSelector(true);
                      }}
                    >
                      <Text style={styles.link}>
                        {couponStore.selectedCoupon ? "更换" : "选择优惠券"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {couponStore.selectedCoupon ? (
                    <Text style={styles.muted}>
                      {couponStore.selectedCoupon.coupon.description} -
                      {couponStore.selectedCoupon.coupon.type === "PERCENTAGE"
                        ? ` ${couponStore.selectedCoupon.coupon.value}%`
                        : ` -¥${couponStore.selectedCoupon.coupon.value}`}
                    </Text>
                  ) : (
                    <Text style={styles.muted}>未使用优惠券</Text>
                  )}
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>订单确认</Text>
                  {selectedAddress ? (
                    <Text style={styles.muted}>
                      {selectedAddress.name} {selectedAddress.phone} · {selectedAddress.province}
                      {selectedAddress.city}
                      {selectedAddress.district}
                      {selectedAddress.detail}
                    </Text>
                  ) : null}
                  <View style={styles.spaceRow}>
                    <Text style={styles.muted}>商品合计</Text>
                    <Text style={styles.value}>
                      {"\u00A5"}
                      {itemsTotal.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.spaceRow}>
                    <Text style={styles.muted}>运费</Text>
                    <Text style={styles.value}>
                      {shippingFee === 0 ? "免运费" : `\u00A5${shippingFee.toFixed(2)}`}
                    </Text>
                  </View>
                  {couponStore.selectedCoupon && (
                    <View style={styles.spaceRow}>
                      <Text style={styles.muted}>优惠</Text>
                      <Text style={[styles.value, { color: "colors.success" /* custom color */ }]}>
                        -{"\u00A5"}
                        {couponStore.selectedCoupon.coupon.type === "PERCENTAGE"
                          ? ((itemsTotal * couponStore.selectedCoupon.coupon.value) / 100).toFixed(
                              2
                            )
                          : couponStore.selectedCoupon.coupon.value.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.spaceRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>实付</Text>
                    <Text style={styles.totalValue}>
                      {"\u00A5"}
                      {orderTotal.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.paymentButtonsRow}>
                  <TouchableOpacity
                    style={styles.alipayButton}
                    onPress={async () => {
                      const newOrderId = await handlePlaceOrder();
                      if (newOrderId) {
                        const res = await paymentApi.createPayment(newOrderId, "alipay");
                        if (res.success) {
                          setPaymentOrderId(newOrderId);
                          setShowPaymentWaiting(true);
                        }
                      }
                    }}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color={colors.surface} />
                    ) : (
                      <Text style={styles.paymentButtonText}>支付宝支付</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.wechatButton}
                    onPress={async () => {
                      const newOrderId = await handlePlaceOrder();
                      if (newOrderId) {
                        const res = await paymentApi.createPayment(newOrderId, "wechat");
                        if (res.success) {
                          setPaymentOrderId(newOrderId);
                          setShowPaymentWaiting(true);
                        }
                      }
                    }}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color={colors.surface} />
                    ) : (
                      <Text style={styles.paymentButtonText}>微信支付</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : null}

            {step === "success" ? (
              <View style={styles.successCard}>
                <Ionicons name="checkmark-circle" size={72} color={colors.success} />
                <Text style={styles.successTitle}>{t.checkout.orderPlaced}</Text>
                <Text style={styles.muted}>订单号：{orderId}</Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate("Orders")}
                  accessibilityLabel="查看订单"
                >
                  <Text style={styles.primaryText}>{t.checkout.viewOrder}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButtonWide}
                  onPress={() => navigation.navigate("MainTabs", { screen: "Home", params: {} })}
                  accessibilityLabel={t.checkout.backToHome}
                >
                  <Text style={styles.secondaryText}>{t.checkout.backToHome}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      <CouponSelector
        visible={showCouponSelector}
        coupons={couponStore.availableCoupons}
        selectedCouponId={couponStore.selectedCoupon?.id ?? null}
        onSelect={(coupon) => couponStore.selectCoupon(coupon)}
        onClose={() => setShowCouponSelector(false)}
      />

      <AreaCascadingPicker
        visible={areaPickerVisible}
        onClose={() => setAreaPickerVisible(false)}
        onSelect={(area) => {
          updateDraft("province", area.province);
          updateDraft("city", area.city);
          updateDraft("district", area.district);
        }}
        initialValue={{
          province: draftAddress.province || undefined,
          city: draftAddress.city || undefined,
          district: draftAddress.district || undefined,
        }}
      />

      {showPaymentWaiting && paymentOrderId ? (
        <PaymentWaitingScreen
          orderId={paymentOrderId}
          onSuccess={() => {
            setShowPaymentWaiting(false);
            setStep("success");
          }}
          onTimeout={() => {
            setShowPaymentWaiting(false);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingBottom: DesignTokens.spacing[7]},
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: DesignTokens.spacing[5],
    paddingVertical: Spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconButton: {
    width: DesignTokens.spacing[10],
    height: DesignTokens.spacing[10],
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  headerTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600", color: colors.text },
  headerPlaceholder: { width: DesignTokens.spacing[10] },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: DesignTokens.spacing['3.5'],
    backgroundColor: colors.surface,
  },
  progressItem: { alignItems: "center" },
  progressDot: {
    width: DesignTokens.spacing['2.5'],
    height: DesignTokens.spacing['2.5'],
    borderRadius: 5,
    backgroundColor: DesignTokens.colors.neutral[300],
    marginBottom: DesignTokens.spacing['1.5'],
  },
  progressDotActive: { backgroundColor: colors.primary },
  progressText: { fontSize: DesignTokens.typography.sizes.xs, color: colors.textTertiary },
  progressTextActive: { color: colors.primary, fontWeight: "600" },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: DesignTokens.spacing[5],
    marginTop: Spacing.md,
    borderRadius: 18,
    padding: Spacing.md,
  },
  cardTitle: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: colors.textPrimary, marginBottom: DesignTokens.spacing[3]},
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: DesignTokens.spacing['2.5'],
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[100],
    gap: DesignTokens.spacing[3],
  },
  spaceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: DesignTokens.spacing[3],
  },
  itemName: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: colors.text },
  muted: { fontSize: DesignTokens.typography.sizes.sm, lineHeight: 20, color: colors.textSecondary },
  price: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "700", color: colors.text },
  value: { fontSize: DesignTokens.typography.sizes.base, color: colors.text },
  totalRow: { marginTop: DesignTokens.spacing[3], paddingTop: DesignTokens.spacing[3], borderTopWidth: 1, borderTopColor: DesignTokens.colors.neutral[100] },
  totalLabel: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: colors.text },
  totalValue: { fontSize: DesignTokens.typography.sizes.xl, fontWeight: "700", color: colors.primary },
  primaryButton: {
    marginHorizontal: DesignTokens.spacing[5],
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  primaryButtonInline: {
    marginTop: Spacing.xs,
    paddingVertical: DesignTokens.spacing['3.5'],
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  primaryButtonFlex: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  primaryText: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: colors.surface },
  secondaryButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: DesignTokens.spacing[5],
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryButtonWide: {
    width: "100%",
    marginTop: DesignTokens.spacing[3],
    paddingVertical: Spacing.md,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryText: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: colors.textSecondary },
  actionRow: { flexDirection: "row", gap: DesignTokens.spacing[3], marginHorizontal: DesignTokens.spacing[5], marginTop: Spacing.md},
  link: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: colors.primary },
  form: { gap: DesignTokens.spacing['2.5'], marginBottom: DesignTokens.spacing['2.5']},
  areaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: Spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: DesignTokens.spacing['3.5'],
    backgroundColor: colors.background,
  },
  areaText: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textPrimary,
  },
  areaPlaceholder: {
    color: colors.textTertiary,
  },
  input: {
    height: Spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: DesignTokens.spacing['3.5'],
    backgroundColor: colors.background,
    color: colors.textPrimary,
  },
  multiline: { height: 84, textAlignVertical: "top", paddingTop: DesignTokens.spacing[3]},
  addressCard: {
    marginTop: DesignTokens.spacing['2.5'],
    padding: DesignTokens.spacing['3.5'],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  addressCardActive: { borderColor: colors.primary, backgroundColor: "colors.backgroundTertiary" }, // custom color
  paymentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing[3],
    padding: DesignTokens.spacing['3.5'],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: DesignTokens.spacing['2.5'],
  },
  paymentLabel: { fontSize: DesignTokens.typography.sizes.base, color: colors.text },
  successCard: {
    marginHorizontal: DesignTokens.spacing[5],
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    gap: DesignTokens.spacing['2.5'],
  },
  successTitle: { fontSize: DesignTokens.typography.sizes['2xl'], fontWeight: "700", color: colors.text },
  paymentButtonsRow: {
    flexDirection: "row",
    gap: DesignTokens.spacing[3],
    marginHorizontal: DesignTokens.spacing[5],
    marginTop: Spacing.md,
  },
  alipayButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "colors.info", // custom color
  },
  wechatButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "colors.success", // custom color
  },
  paymentButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.surface,
  },
});

export default CheckoutScreen;

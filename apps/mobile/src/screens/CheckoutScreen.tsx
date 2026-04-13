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
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { addressApi, cartApi, orderApi } from "../services/api/commerce.api";
import { useCartStore } from "../stores/index";
import type { Address } from "../types";
import { theme } from "../theme";

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

const PAYMENT_METHODS = [
  { id: "wechat", label: "微信支付", icon: "logo-wechat" as const },
  { id: "alipay", label: "支付宝", icon: "wallet-outline" as const },
  { id: "card", label: "银行卡", icon: "card-outline" as const },
];

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
  const navigation = useNavigation();
  const { items, clear } = useCartStore();

  const [step, setStep] = useState<CheckoutStep>("summary");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [cartItems, setCartItems] = useState<CheckoutItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedPayment, setSelectedPayment] = useState("wechat");
  const [orderId, setOrderId] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [draftAddress, setDraftAddress] = useState<AddressDraft>(EMPTY_ADDRESS);

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
        .filter((item) => item.selected)
        .map((item) => ({
          id: item.id,
          productId: item.item?.id ?? "",
          name: item.item?.name ?? "",
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          price: item.item?.price ?? 0,
        }));

      setCartItems(
        (selectedFromApi.length > 0 ? selectedFromApi : selectedFromStore).map(
          (item) => ({
            id: item.id,
            productId: item.productId,
            name: item.name,
            color: item.color,
            size: item.size,
            quantity: item.quantity,
            price: item.price,
          }),
        ),
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
          .filter((item) => item.selected)
          .map((item) => ({
            id: item.id,
            productId: item.item?.id ?? "",
            name: item.item?.name ?? "",
            color: item.color,
            size: item.size,
            quantity: item.quantity,
            price: item.item?.price ?? 0,
          })),
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
    [cartItems],
  );
  const shippingFee = itemsTotal >= 99 ? 0 : 10;
  const orderTotal = itemsTotal + shippingFee;

  const updateDraft = useCallback(
    (field: keyof AddressDraft, value: string | boolean) => {
      setDraftAddress((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

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
        setAddresses((prev) => [response.data!, ...prev]);
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

  const handlePlaceOrder = useCallback(async () => {
    if (cartItems.length === 0) {
      Alert.alert("暂无可结算商品", "请先从购物车中选择商品。");
      return;
    }

    if (!selectedAddress) {
      Alert.alert("请选择地址", "请先选择或新增收货地址。");
      setStep("address");
      return;
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
        setOrderId(response.data.id);
        setCartItems([]);
        clear();
        setStep("success");
      } else {
        Alert.alert("提交订单失败", response.error?.message ?? "请稍后重试。");
      }
    } catch {
      Alert.alert("提交订单失败", "网络异常，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  }, [cartItems, clear, selectedAddress]);

  const steps = ["确认商品", "收货地址", "支付偏好"];

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
              <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>结算</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          <View style={styles.progressRow}>
            {steps.map((label, index) => {
              const activeIndex =
                step === "summary" ? 0 : step === "address" ? 1 : 2;
              return (
                <View key={label} style={styles.progressItem}>
                  <View
                    style={[
                      styles.progressDot,
                      index <= activeIndex && styles.progressDotActive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.progressText,
                      index <= activeIndex && styles.progressTextActive,
                    ]}
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
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {step === "summary" ? (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>结算商品</Text>
                  {cartItems.length === 0 ? (
                    <Text style={styles.muted}>当前没有勾选任何商品。</Text>
                  ) : (
                    cartItems.map((item) => (
                      <View key={item.id} style={styles.row}>
                        <View style={styles.flex}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <Text style={styles.muted}>
                            {item.color || "默认色"} / {item.size || "默认尺码"} x
                            {item.quantity}
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
                    <Text style={styles.value}>{"\u00A5"}{itemsTotal.toFixed(2)}</Text>
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
            ) : null}

            {step === "address" ? (
              <>
                <View style={styles.card}>
                  <View style={styles.spaceRow}>
                    <Text style={styles.cardTitle}>收货地址</Text>
                    <TouchableOpacity
                      onPress={() => setShowAddressForm((prev) => !prev)}
                      accessibilityLabel="新增地址"
                    >
                      <Text style={styles.link}>新增地址</Text>
                    </TouchableOpacity>
                  </View>

                  {showAddressForm ? (
                    <View style={styles.form}>
                      <TextInput style={styles.input} value={draftAddress.name} onChangeText={(value) => updateDraft("name", value)} placeholder="收货人姓名" placeholderTextColor={theme.colors.textTertiary} />
                      <TextInput style={styles.input} value={draftAddress.phone} onChangeText={(value) => updateDraft("phone", value)} placeholder="手机号" placeholderTextColor={theme.colors.textTertiary} keyboardType="phone-pad" />
                      <TextInput style={styles.input} value={draftAddress.province} onChangeText={(value) => updateDraft("province", value)} placeholder="省份" placeholderTextColor={theme.colors.textTertiary} />
                      <TextInput style={styles.input} value={draftAddress.city} onChangeText={(value) => updateDraft("city", value)} placeholder="城市" placeholderTextColor={theme.colors.textTertiary} />
                      <TextInput style={styles.input} value={draftAddress.district} onChangeText={(value) => updateDraft("district", value)} placeholder="区县" placeholderTextColor={theme.colors.textTertiary} />
                      <TextInput style={[styles.input, styles.multiline]} value={draftAddress.detail} onChangeText={(value) => updateDraft("detail", value)} placeholder="详细地址" placeholderTextColor={theme.colors.textTertiary} multiline />
                      <TouchableOpacity style={styles.primaryButtonInline} onPress={handleSaveAddress} disabled={savingAddress} accessibilityLabel="保存地址">
                        {savingAddress ? <ActivityIndicator size="small" color={theme.colors.surface} /> : <Text style={styles.primaryText}>保存地址</Text>}
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
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep("summary")} accessibilityLabel="返回确认商品">
                    <Text style={styles.secondaryText}>上一步</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryButtonFlex} onPress={() => {
                    if (!selectedAddress) {
                      Alert.alert("请选择地址", "请先选择或新增收货地址。");
                      return;
                    }
                    setStep("payment");
                  }} accessibilityLabel="进入支付偏好">
                    <Text style={styles.primaryText}>继续提交</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}

            {step === "payment" ? (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>支付偏好</Text>
                  <Text style={styles.muted}>
                    当前先验证真实下单链路，这里记录支付方式偏好，完整支付链路后续继续接入。
                  </Text>
                  {PAYMENT_METHODS.map((method) => (
                    <TouchableOpacity
                      key={method.id}
                      style={[
                        styles.paymentItem,
                        selectedPayment === method.id && styles.addressCardActive,
                      ]}
                      onPress={() => setSelectedPayment(method.id)}
                      accessibilityLabel={`支付方式 ${method.label}`}
                    >
                      <Ionicons name={method.icon} size={20} color={theme.colors.primary} />
                      <Text style={styles.paymentLabel}>{method.label}</Text>
                    </TouchableOpacity>
                  ))}
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
                  <View style={[styles.spaceRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>应付金额</Text>
                    <Text style={styles.totalValue}>
                      {"\u00A5"}
                      {orderTotal.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep("address")} accessibilityLabel="返回地址选择">
                    <Text style={styles.secondaryText}>上一步</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryButtonFlex} onPress={handlePlaceOrder} disabled={submitting} accessibilityLabel={`提交订单 ${orderTotal.toFixed(2)} 元`}>
                    {submitting ? <ActivityIndicator size="small" color={theme.colors.surface} /> : <Text style={styles.primaryText}>提交订单 {"\u00A5"}{orderTotal.toFixed(2)}</Text>}
                  </TouchableOpacity>
                </View>
              </>
            ) : null}

            {step === "success" ? (
              <View style={styles.successCard}>
                <Ionicons name="checkmark-circle" size={72} color={theme.colors.success} />
                <Text style={styles.successTitle}>订单已提交</Text>
                <Text style={styles.muted}>订单号：{orderId}</Text>
                <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("Orders" as never)} accessibilityLabel="查看订单">
                  <Text style={styles.primaryText}>查看订单</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButtonWide} onPress={() => (navigation as any).navigate("MainTabs", { screen: "Home" })} accessibilityLabel="返回首页">
                  <Text style={styles.secondaryText}>返回首页</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingBottom: 28 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F3F4",
  },
  headerTitle: { fontSize: 18, fontWeight: "600", color: theme.colors.text },
  headerPlaceholder: { width: 40 },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
  },
  progressItem: { alignItems: "center" },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#CBD5E1", marginBottom: 6 },
  progressDotActive: { backgroundColor: theme.colors.primary },
  progressText: { fontSize: 11, color: theme.colors.textTertiary },
  progressTextActive: { color: theme.colors.primary, fontWeight: "600" },
  card: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 18,
    padding: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.text, marginBottom: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F4",
    gap: 12,
  },
  spaceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  itemName: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  muted: { fontSize: 13, lineHeight: 20, color: theme.colors.textSecondary },
  price: { fontSize: 15, fontWeight: "700", color: theme.colors.text },
  value: { fontSize: 14, color: theme.colors.text },
  totalRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F3F4" },
  totalLabel: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  totalValue: { fontSize: 20, fontWeight: "700", color: theme.colors.primary },
  primaryButton: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: theme.colors.primary,
  },
  primaryButtonInline: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: theme.colors.primary,
  },
  primaryButtonFlex: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: theme.colors.primary,
  },
  primaryText: { fontSize: 15, fontWeight: "600", color: theme.colors.surface },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  secondaryButtonWide: {
    width: "100%",
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  secondaryText: { fontSize: 15, fontWeight: "600", color: theme.colors.textSecondary },
  actionRow: { flexDirection: "row", gap: 12, marginHorizontal: 20, marginTop: 16 },
  link: { fontSize: 14, fontWeight: "600", color: theme.colors.primary },
  form: { gap: 10, marginBottom: 10 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
  },
  multiline: { height: 84, textAlignVertical: "top", paddingTop: 12 },
  addressCard: {
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  addressCardActive: { borderColor: theme.colors.primary, backgroundColor: "#F6F8FF" },
  paymentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 10,
  },
  paymentLabel: { fontSize: 15, color: theme.colors.text },
  successCard: {
    marginHorizontal: 20,
    marginTop: 32,
    padding: 24,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    gap: 10,
  },
  successTitle: { fontSize: 24, fontWeight: "700", color: theme.colors.text },
});

export default CheckoutScreen;

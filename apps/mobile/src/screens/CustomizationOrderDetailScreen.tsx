import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "../polyfills/expo-vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { theme, Colors, Spacing, BorderRadius, Shadows } from '../design-system/theme';
import customizationApi from "../services/api/customization.api";
import type { RootStackParamList } from "../types/navigation";

type Navigation = import("@react-navigation/native").NavigationProp<RootStackParamList>;
type OrderDetailRoute = RouteProp<RootStackParamList, "CustomizationOrderDetail">;

interface OrderDetail {
  id: string;
  type: string;
  title?: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDeliveryDate?: string;
  quotes?: {
    id: string;
    providerName: string;
    price: number;
    currency: string;
    estimatedDays: number;
    description: string;
  }[];
  design?: {
    previewUrl?: string;
    template?: { name: string };
    layers?: { type: string; content: string }[];
  };
}

const STATUS_STEPS = [
  { key: "draft", label: "草稿", icon: "create-outline" },
  { key: "submitted", label: "已提交", icon: "paper-plane-outline" },
  { key: "quoting", label: "报价中", icon: "pricetag-outline" },
  { key: "confirmed", label: "已确认", icon: "checkmark-circle-outline" },
  { key: "in_progress", label: "制作中", icon: "construct-outline" },
  { key: "shipped", label: "已发货", icon: "car-outline" },
  { key: "completed", label: "已完成", icon: "checkmark-done-outline" },
];

export const CustomizationOrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<OrderDetailRoute>();
  const { requestId } = route.params;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    void loadOrder();
  }, [requestId]);

  const loadOrder = useCallback(async () => {
    try {
      const response = await customizationApi.getById(requestId);
      if (response.success && response.data) {
        setOrder(response.data as unknown as OrderDetail);
      }
    } catch (error) {
      console.error('Failed to load order detail:', error);
    } finally {
      setIsLoading(false);
    }
  }, [requestId]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadOrder();
    setIsRefreshing(false);
  }, [loadOrder]);

  const handleCancel = useCallback(async () => {
    Alert.alert("取消定制", "确定要取消此定制需求吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "确定取消",
        style: "destructive",
        onPress: async () => {
          const response = await customizationApi.cancel(requestId);
          if (response.success) {
            Alert.alert("已取消", "定制需求已取消");
            void loadOrder();
          }
        },
      },
    ]);
  }, [requestId, loadOrder]);

  const handleConfirmDelivery = useCallback(async () => {
    Alert.alert("确认收货", "确认已收到定制商品？", [
      { text: "取消", style: "cancel" },
      {
        text: "确认",
        onPress: async () => {
          Alert.alert("已确认", "感谢您的定制，期待您的下次光临");
          void loadOrder();
        },
      },
    ]);
  }, [loadOrder]);

  const currentStepIndex = order ? STATUS_STEPS.findIndex((s) => s.key === order.status) : -1;

  const renderStatusTimeline = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>订单状态</Text>
      <View style={styles.timeline}>
        {STATUS_STEPS.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          return (
            <View key={step.key} style={styles.timelineStep}>
              <View
                style={[
                  styles.timelineDot,
                  isCompleted && styles.timelineDotCompleted,
                  isCurrent && styles.timelineDotCurrent,
                ]}
              >
                <Ionicons
                  name={step.icon}
                  size={14}
                  color={isCompleted ? theme.colors.surface : Colors.neutral[400]}
                />
              </View>
              <Text
                style={[
                  styles.timelineLabel,
                  isCompleted && styles.timelineLabelCompleted,
                  isCurrent && styles.timelineLabelCurrent,
                ]}
              >
                {step.label}
              </Text>
              {index < STATUS_STEPS.length - 1 && (
                <View
                  style={[
                    styles.timelineLine,
                    index < currentStepIndex && styles.timelineLineCompleted,
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.neutral[300]} />
          <Text style={styles.errorText}>订单不存在</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.errorButton}>返回</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canCancel = ["draft", "submitted"].includes(order.status);
  const canConfirmDelivery = order.status === "shipped";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>定制订单</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Order Info */}
        <View style={styles.orderInfoCard}>
          <Text style={styles.orderTitle}>{order.title || "定制需求"}</Text>
          <Text style={styles.orderDate}>
            {new Date(order.createdAt).toLocaleDateString("zh-CN")}
          </Text>
          {order.design?.template && (
            <Text style={styles.templateName}>模板：{order.design.template.name}</Text>
          )}
        </View>

        {renderStatusTimeline()}

        {/* Tracking Info */}
        {order.trackingNumber && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>物流信息</Text>
            <View style={styles.trackingCard}>
              <Text style={styles.trackingLabel}>快递单号</Text>
              <Text style={styles.trackingValue}>{order.trackingNumber}</Text>
              {order.carrier && (
                <>
                  <Text style={styles.trackingLabel}>承运商</Text>
                  <Text style={styles.trackingValue}>{order.carrier}</Text>
                </>
              )}
            </View>
          </View>
        )}

        {/* Packaging */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>专属包装</Text>
          <View style={styles.packagingCard}>
            <View style={styles.packagingItem}>
              <Ionicons name="gift-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.packagingText}>AiNeed 专属包装盒</Text>
            </View>
            <View style={styles.packagingItem}>
              <Ionicons name="heart-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.packagingText}>感谢卡 + 品牌贴纸</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {canCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>取消定制</Text>
            </TouchableOpacity>
          )}
          {canConfirmDelivery && (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirmDelivery}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmButtonText}>确认收货</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: Spacing[3],
  },
  errorButton: {
    fontSize: 14,
    color: theme.colors.primary,
    marginTop: Spacing[4],
  },
  scrollContent: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[8],
  },
  orderInfoCard: {
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    marginBottom: Spacing[4],
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: Spacing[1],
  },
  orderDate: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  templateName: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: Spacing[1],
  },
  section: {
    marginBottom: Spacing[4],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: Spacing[3],
  },
  timeline: {
    flexDirection: "row",
    justifyContent: "space-between",
    position: "relative",
  },
  timelineStep: {
    alignItems: "center",
    flex: 1,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[1],
  },
  timelineDotCompleted: {
    backgroundColor: theme.colors.primary,
  },
  timelineDotCurrent: {
    backgroundColor: theme.colors.primary,
    ...Shadows.sm,
  },
  timelineLabel: {
    fontSize: 10,
    color: Colors.neutral[400],
    textAlign: "center",
  },
  timelineLabelCompleted: {
    color: theme.colors.textSecondary,
  },
  timelineLabelCurrent: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  timelineLine: {
    position: "absolute",
    top: 14,
    left: "50%",
    right: "-50%",
    height: 1,
    backgroundColor: Colors.neutral[200],
  },
  timelineLineCompleted: {
    backgroundColor: theme.colors.primary,
  },
  trackingCard: {
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing[3],
    gap: Spacing[1],
  },
  trackingLabel: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  trackingValue: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: "500",
    marginBottom: Spacing[1],
  },
  packagingCard: {
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing[3],
    gap: Spacing[2],
  },
  packagingItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
  },
  packagingText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  actions: {
    gap: Spacing[3],
    marginTop: Spacing[4],
  },
  cancelButton: {
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing[4],
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  confirmButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing[4],
    alignItems: "center",
    ...Shadows.brand,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.surface,
  },
});

export default CustomizationOrderDetailScreen;

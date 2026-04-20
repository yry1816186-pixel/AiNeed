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
import { Ionicons } from "../../../polyfills/expo-vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Spacing, BorderRadius, Shadows } from "../../../design-system/theme";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import customizationApi from "../../../services/api/customization.api";
import type { RootStackParamList } from "../../../types/navigation";

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
  { key: "draft", label: "\u8349\u7A3F", icon: "create-outline" },
  { key: "submitted", label: "\u5DF2\u63D0\u4EA4", icon: "paper-plane-outline" },
  { key: "quoting", label: "\u62A5\u4EF7\u4E2D", icon: "pricetag-outline" },
  { key: "confirmed", label: "\u5DF2\u786E\u8BA4", icon: "checkmark-circle-outline" },
  { key: "in_progress", label: "\u5236\u4F5C\u4E2D", icon: "construct-outline" },
  { key: "shipped", label: "\u5DF2\u53D1\u8D27", icon: "car-outline" },
  { key: "completed", label: "\u5DF2\u5B8C\u6210", icon: "checkmark-done-outline" },
];

export const CustomizationOrderDetailScreen: React.FC = () => {
  const { colors } = useTheme();
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
      console.error("Failed to load order detail:", error);
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
    Alert.alert(
      "\u53D6\u6D88\u5B9A\u5236",
      "\u786E\u5B9A\u8981\u53D6\u6D88\u6B64\u5B9A\u5236\u9700\u6C42\u5417\uFF1F",
      [
        { text: "\u53D6\u6D88", style: "cancel" },
        {
          text: "\u786E\u5B9A\u53D6\u6D88",
          style: "destructive",
          onPress: async () => {
            const response = await customizationApi.cancel(requestId);
            if (response.success) {
              Alert.alert("\u5DF2\u53D6\u6D88", "\u5B9A\u5236\u9700\u6C42\u5DF2\u53D6\u6D88");
              void loadOrder();
            }
          },
        },
      ]
    );
  }, [requestId, loadOrder]);

  const handleConfirmDelivery = useCallback(async () => {
    Alert.alert(
      "\u786E\u8BA4\u6536\u8D27",
      "\u786E\u8BA4\u5DF2\u6536\u5230\u5B9A\u5236\u5546\u54C1\uFF1F",
      [
        { text: "\u53D6\u6D88", style: "cancel" },
        {
          text: "\u786E\u8BA4",
          onPress: async () => {
            Alert.alert(
              "\u5DF2\u786E\u8BA4",
              "\u611F\u8C22\u60A8\u7684\u5B9A\u5236\uFF0C\u671F\u5F85\u60A8\u7684\u4E0B\u6B21\u5149\u4E34"
            );
            void loadOrder();
          },
        },
      ]
    );
  }, [loadOrder]);

  const currentStepIndex = order ? STATUS_STEPS.findIndex((s) => s.key === order.status) : -1;

  const renderStatusTimeline = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{"\u8BA2\u5355\u72B6\u6001"}</Text>
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
                  color={isCompleted ? colors.surface : colors.neutral[400]}
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
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.neutral[300]} />
          <Text style={styles.errorText}>{"\u8BA2\u5355\u4E0D\u5B58\u5728"}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.errorButton}>{"\u8FD4\u56DE"}</Text>
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
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{"\u5B9A\u5236\u8BA2\u5355"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.orderInfoCard}>
          <Text style={styles.orderTitle}>{order.title || "\u5B9A\u5236\u9700\u6C42"}</Text>
          <Text style={styles.orderDate}>
            {new Date(order.createdAt).toLocaleDateString("zh-CN")}
          </Text>
          {order.design?.template && (
            <Text style={styles.templateName}>
              {"\u6A21\u677F\uFF1A"}
              {order.design.template.name}
            </Text>
          )}
        </View>

        {renderStatusTimeline()}

        {order.trackingNumber && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{"\u7269\u6D41\u4FE1\u606F"}</Text>
            <View style={styles.trackingCard}>
              <Text style={styles.trackingLabel}>{"\u5FEB\u9012\u5355\u53F7"}</Text>
              <Text style={styles.trackingValue}>{order.trackingNumber}</Text>
              {order.carrier && (
                <>
                  <Text style={styles.trackingLabel}>{"\u627F\u8FD0\u5546"}</Text>
                  <Text style={styles.trackingValue}>{order.carrier}</Text>
                </>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{"\u4E13\u5C5E\u5305\u88C5"}</Text>
          <View style={styles.packagingCard}>
            <View style={styles.packagingItem}>
              <Ionicons name="gift-outline" size={18} color={colors.primary} />
              <Text style={styles.packagingText}>AiNeed {"\u4E13\u5C5E\u5305\u88C5\u76D2"}</Text>
            </View>
            <View style={styles.packagingItem}>
              <Ionicons name="heart-outline" size={18} color={colors.primary} />
              <Text style={styles.packagingText}>
                {"\u611F\u8C22\u5361 + \u54C1\u724C\u8D34\u7EB8"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          {canCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>{"\u53D6\u6D88\u5B9A\u5236"}</Text>
            </TouchableOpacity>
          )}
          {canConfirmDelivery && (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirmDelivery}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmButtonText}>{"\u786E\u8BA4\u6536\u8D27"}</Text>
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
    backgroundColor: colors.surface,
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
    backgroundColor: colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.textPrimary,
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
    fontSize: DesignTokens.typography.sizes.md,
    color: colors.textSecondary,
    marginTop: Spacing[3],
  },
  errorButton: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.primary,
    marginTop: Spacing[4],
  },
  scrollContent: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[8],
  },
  orderInfoCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    marginBottom: Spacing[4],
  },
  orderTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: Spacing[1],
  },
  orderDate: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
  },
  templateName: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: Spacing[1],
  },
  section: {
    marginBottom: Spacing[4],
  },
  sectionTitle: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.textPrimary,
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
    backgroundColor: colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[1],
  },
  timelineDotCompleted: {
    backgroundColor: colors.primary,
  },
  timelineDotCurrent: {
    backgroundColor: colors.primary,
    ...Shadows.sm,
  },
  timelineLabel: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.neutral[400],
    textAlign: "center",
  },
  timelineLabelCompleted: {
    color: colors.textSecondary,
  },
  timelineLabelCurrent: {
    color: colors.primary,
    fontWeight: "600",
  },
  timelineLine: {
    position: "absolute",
    top: 14,
    left: "50%",
    right: "-50%",
    height: 1,
    backgroundColor: colors.neutral[200],
  },
  timelineLineCompleted: {
    backgroundColor: colors.primary,
  },
  trackingCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing[3],
    gap: Spacing[1],
  },
  trackingLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
  },
  trackingValue: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textPrimary,
    fontWeight: "500",
    marginBottom: Spacing[1],
  },
  packagingCard: {
    backgroundColor: colors.neutral[50],
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
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textPrimary,
  },
  actions: {
    gap: Spacing[3],
    marginTop: Spacing[4],
  },
  cancelButton: {
    backgroundColor: colors.neutral[100],
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing[4],
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing[4],
    alignItems: "center",
    ...Shadows.brand,
  },
  confirmButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.surface,
  },
});

export default CustomizationOrderDetailScreen;

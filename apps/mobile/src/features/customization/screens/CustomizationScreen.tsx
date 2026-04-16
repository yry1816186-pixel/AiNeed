import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '../../../polyfills/expo-vector-icons';
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { Colors, Spacing, BorderRadius, Shadows, flatColors as colors } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { customizationApi } from '../../../services/api/customization.api';
import type {
  CustomizationType,
  CustomizationStatus,
  CustomizationRequest,
} from '../../types/customization';
import type { RootStackParamList } from '../../../types/navigation';
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";

type Navigation = NavigationProp<RootStackParamList>;

interface ServiceType {
  id: CustomizationType;
  label: string;
  description: string;
  icon: string;
}

const SERVICE_TYPES: ServiceType[] = [
  {
    id: "tailored",
    label: "量体裁衣",
    description: "根据您的身材数据精准裁剪，打造完美贴合的服装",
    icon: "cut-outline",
  },
  {
    id: "bespoke",
    label: "高级定制",
    description: "从面料到版型全程定制，独一无二的专属设计",
    icon: "ribbon-outline",
  },
  {
    id: "alteration",
    label: "改制服务",
    description: "对现有服装进行尺寸调整和风格改造",
    icon: "construct-outline",
  },
  {
    id: "design",
    label: "设计定制",
    description: "提供设计草图或概念，由专业设计师落地实现",
    icon: "color-palette-outline",
  },
];

const STATUS_CONFIG: Record<CustomizationStatus, { label: string; color: string }> = {
  draft: { label: "草稿", color: Colors.neutral[500] },
  submitted: { label: "已提交", color: colors.info },
  quoting: { label: "报价中", color: colors.warning },
  confirmed: { label: "已确认", color: colors.success },
  in_progress: { label: "进行中", color: colors.primary },
  shipped: { label: "已发货", color: colors.info },
  completed: { label: "已完成", color: Colors.emerald[600] },
  cancelled: { label: "已取消", color: Colors.neutral[400] },
};

type TabId = "new" | "list";

export const CustomizationScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const [activeTab, setActiveTab] = useState<TabId>("new");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedType, setSelectedType] = useState<CustomizationType | null>(null);
  const [description, setDescription] = useState("");
  const [fabricPreference, setFabricPreference] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const [requests, setRequests] = useState<CustomizationRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  const loadRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    try {
      const response = await customizationApi.getAll({ limit: 20 });
      if (response.success && response.data) {
        setRequests(response.data.items);
      }
    } catch (error) {
      console.error('Customization operation failed:', error);
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "list") {
      void loadRequests();
    }
  }, [activeTab, loadRequests]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadRequests();
    setIsRefreshing(false);
  }, [loadRequests]);

  const handleSubmit = useCallback(async () => {
    if (!selectedType) {
      Alert.alert("提示", "请选择定制服务类型");
      return;
    }
    if (!description.trim()) {
      Alert.alert("提示", "请描述您的定制需求");
      return;
    }
    if (description.trim().length < 10) {
      Alert.alert("提示", "需求描述至少需要10个字符");
      return;
    }

    setIsSubmitting(true);
    try {
      const preferences: Record<string, string> = {};
      if (fabricPreference.trim()) {
        preferences.fabric = fabricPreference.trim();
      }
      if (budgetRange.trim()) {
        preferences.budget = budgetRange.trim();
      }
      if (additionalNotes.trim()) {
        preferences.notes = additionalNotes.trim();
      }

      const response = await customizationApi.create({
        type: selectedType,
        description: description.trim(),
        preferences,
      });

      if (response.success) {
        Alert.alert("提交成功", "您的定制需求已提交，我们将尽快为您报价", [
          {
            text: "查看列表",
            onPress: () => {
              setSelectedType(null);
              setDescription("");
              setFabricPreference("");
              setBudgetRange("");
              setAdditionalNotes("");
              setActiveTab("list");
            },
          },
        ]);
      } else {
        Alert.alert("提交失败", response.error?.message || "请稍后重试");
      }
    } catch {
      Alert.alert("提交失败", "网络错误，请检查网络后重试");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedType, description, fabricPreference, budgetRange, additionalNotes]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerBack}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>定制服务</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabs}>
      <TouchableOpacity
        style={[styles.tab, activeTab === "new" && styles.tabActive]}
        onPress={() => setActiveTab("new")}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, activeTab === "new" && styles.tabTextActive]}>发起定制</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === "list" && styles.tabActive]}
        onPress={() => setActiveTab("list")}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, activeTab === "list" && styles.tabTextActive]}>我的定制</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNewRequest = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.formContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* Quick Action Cards */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => navigation.navigate("CustomizationEditor")}
          activeOpacity={0.7}
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="color-palette-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.quickActionTitle}>设计定制</Text>
          <Text style={styles.quickActionDesc}>选择模板，上传图案，创建专属定制</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => navigation.navigate("BrandQRScan")}
          activeOpacity={0.7}
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="qr-code-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.quickActionTitle}>品牌扫码</Text>
          <Text style={styles.quickActionDesc}>扫描品牌二维码，一键导入衣橱</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>选择服务类型</Text>
      <View style={styles.serviceGrid}>
        {SERVICE_TYPES.map((service) => {
          const isSelected = selectedType === service.id;
          return (
            <TouchableOpacity
              key={service.id}
              style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
              onPress={() => setSelectedType(isSelected ? null : service.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.serviceIconContainer,
                  isSelected && styles.serviceIconContainerSelected,
                ]}
              >
                <Ionicons
                  name={service.icon}
                  size={24}
                  color={isSelected ? colors.surface : colors.primary}
                />
              </View>
              <Text style={[styles.serviceLabel, isSelected && styles.serviceLabelSelected]}>
                {service.label}
              </Text>
              <Text style={styles.serviceDescription} numberOfLines={2}>
                {service.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>定制需求描述</Text>
      <View style={styles.textAreaContainer}>
        <TextInput
          style={styles.textArea}
          placeholder="请详细描述您的定制需求，包括款式、用途、特殊要求等..."
          placeholderTextColor={colors.textTertiary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={styles.charCount}>{description.length}/500</Text>
      </View>

      <Text style={styles.sectionTitle}>偏好与预算 (选填)</Text>
      <View style={styles.optionalFields}>
        <View style={styles.inputField}>
          <Ionicons name="shirt-outline" size={18} color={colors.textTertiary} />
          <TextInput
            style={styles.textInput}
            placeholder="面料偏好 (如：真丝、羊毛、亚麻)"
            placeholderTextColor={colors.textTertiary}
            value={fabricPreference}
            onChangeText={setFabricPreference}
            maxLength={50}
          />
        </View>
        <View style={styles.inputField}>
          <Ionicons name="wallet-outline" size={18} color={colors.textTertiary} />
          <TextInput
            style={styles.textInput}
            placeholder="预算范围 (如：2000-5000)"
            placeholderTextColor={colors.textTertiary}
            value={budgetRange}
            onChangeText={setBudgetRange}
            maxLength={30}
          />
        </View>
        <View style={styles.inputField}>
          <Ionicons name="document-text-outline" size={18} color={colors.textTertiary} />
          <TextInput
            style={styles.textInput}
            placeholder="其他补充说明"
            placeholderTextColor={colors.textTertiary}
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            maxLength={200}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
        activeOpacity={0.7}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color={colors.surface} />
        ) : (
          <Text style={styles.submitButtonText}>提交定制需求</Text>
        )}
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  const renderRequestList = () => {
    const { colors } = useTheme();
    if (isLoadingRequests) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      );
    }

    if (requests.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={48} color={Colors.neutral[300]} />
          <Text style={styles.emptyTitle}>暂无定制需求</Text>
          <Text style={styles.emptySubtitle}>点击"发起定制"开始您的第一个定制服务</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setActiveTab("new")}
            activeOpacity={0.7}
          >
            <Text style={styles.emptyButtonText}>发起定制</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContainer}
      >
        {requests.map((request) => {
          const statusConfig = STATUS_CONFIG[request.status] || {
            label: request.status,
            color: Colors.neutral[500],
          };
          return (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestCardHeader}>
                <View style={styles.requestTypeTag}>
                  <Ionicons
                    name={SERVICE_TYPES.find((s) => s.id === request.type)?.icon ?? "help-outline"}
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={styles.requestTypeText}>
                    {SERVICE_TYPES.find((s) => s.id === request.type)?.label || request.type}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}18` }]}>
                  <Text style={[styles.statusText, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>
              </View>
              <Text style={styles.requestDescription} numberOfLines={2}>
                {request.description}
              </Text>
              <View style={styles.requestFooter}>
                <Text style={styles.requestDate}>
                  {new Date(request.createdAt).toLocaleDateString("zh-CN")}
                </Text>
                {request.quotes && request.quotes.length > 0 && (
                  <View style={styles.quoteInfo}>
                    <Ionicons name="pricetag-outline" size={14} color={colors.textTertiary} />
                    <Text style={styles.quoteText}>{request.quotes.length} 个报价</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderTabs()}
      <View style={styles.content}>
        {activeTab === "new" ? renderNewRequest() : renderRequestList()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
  },
  headerBack: {
    width: DesignTokens.spacing[10],
    height: DesignTokens.spacing[10],
    borderRadius: 20,
    backgroundColor: Colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: DesignTokens.spacing[10],
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[4],
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.xl,
    padding: Spacing[1],
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing[3],
    alignItems: "center",
    borderRadius: BorderRadius.lg,
  },
  tabActive: {
    backgroundColor: colors.surface,
    ...Shadows.sm,
  },
  tabText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[8],
  },
  sectionTitle: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: Spacing[5],
    marginBottom: Spacing[3],
  },
  serviceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[3],
  },
  serviceCard: {
    width: "47%",
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  serviceCardSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(198, 123, 92, 0.06)",
  },
  serviceIconContainer: {
    width: DesignTokens.spacing[11],
    height: DesignTokens.spacing[11],
    borderRadius: 22,
    backgroundColor: Colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[3],
  },
  serviceIconContainerSelected: {
    backgroundColor: colors.primary,
  },
  serviceLabel: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: Spacing[1],
  },
  serviceLabelSelected: {
    color: colors.primary,
  },
  serviceDescription: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  textAreaContainer: {
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    minHeight: 140,
  },
  textArea: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textPrimary,
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
    textAlign: "right",
    marginTop: Spacing[2],
  },
  optionalFields: {
    gap: Spacing[3],
  },
  inputField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing[4],
    height: Spacing['2xl'],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    gap: Spacing[2],
  },
  textInput: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textPrimary,
    padding: 0,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing[4],
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing[8],
    minHeight: 52,
    ...Shadows.brand,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.surface,
  },
  bottomSpacer: {
    height: Spacing[8],
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
    marginTop: Spacing[3],
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing[8],
  },
  emptyTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: Spacing[4],
  },
  emptySubtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing[2],
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: Spacing[5],
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
  },
  emptyButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.surface,
  },
  listContainer: {
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[6],
  },
  requestCard: {
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    marginBottom: Spacing[3],
  },
  requestCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing[3],
  },
  requestTypeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[1],
    backgroundColor: "rgba(198, 123, 92, 0.1)",
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.sm,
  },
  requestTypeText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "500",
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "500",
  },
  requestDescription: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: Spacing[3],
  },
  requestFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  requestDate: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
  },
  quoteInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[1],
  },
  quoteText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
  },
  quickActions: {
    flexDirection: "row",
    gap: Spacing[3],
    marginBottom: Spacing[4],
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    borderWidth: 1.5,
    borderColor: Colors.neutral[200],
  },
  quickActionIcon: {
    width: Spacing['2xl'],
    height: Spacing['2xl'],
    borderRadius: 24,
    backgroundColor: "rgba(198, 123, 92, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[2],
  },
  quickActionTitle: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: Spacing[1],
  },
  quickActionDesc: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

export default CustomizationScreen;

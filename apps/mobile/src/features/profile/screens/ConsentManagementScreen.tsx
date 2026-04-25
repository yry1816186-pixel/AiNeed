import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "../../../polyfills/expo-vector-icons";
import apiClient from "../../../services/api/client";
import { DesignTokens } from "../../../design-system/theme";
import { flatColors as colors } from "../../../design-system/theme";
import { Spacing, BorderRadius, Shadows } from "../../../design-system/theme";

import type { RootStackParamList } from "../../../types/navigation";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

// --- Consent type definitions (aligned with backend ConsentType enum) ---

type ConsentTypeKey =
  | "tracking"
  | "analytics"
  | "marketing"
  | "body_metrics"
  | "photos"
  | "body_fat"
  | "ai_domestic_no_crossborder"
  | "data_export"
  | "account_deletion";

interface ConsentConfig {
  key: ConsentTypeKey;
  label: string;
  description: string;
  affectedFeatures: string[];
  category: "sensitive" | "general";
}

const ALL_CONSENT_CONFIGS: ConsentConfig[] = [
  // Sensitive consents (PIPL Article 29 separate consent required)
  {
    key: "body_metrics",
    label: "三围数据使用",
    description: "使用身高、体重、三围等数据提供精准穿搭推荐",
    affectedFeatures: ["个性化推荐", "尺码匹配", "体型分析"],
    category: "sensitive",
  },
  {
    key: "photos",
    label: "照片使用",
    description: "上传照片用于虚拟试穿和风格分析",
    affectedFeatures: ["虚拟试穿", "风格评估", "AI造型师"],
    category: "sensitive",
  },
  {
    key: "body_fat",
    label: "体脂率数据",
    description: "使用体脂率数据优化推荐精准度",
    affectedFeatures: ["精准体型分类", "版型推荐"],
    category: "sensitive",
  },
  {
    key: "ai_domestic_no_crossborder",
    label: "国产AI服务确认",
    description: "确认AI服务由国内服务商提供，数据不出境",
    affectedFeatures: ["AI对话", "智能推荐", "虚拟试穿"],
    category: "sensitive",
  },
  // General consents
  {
    key: "tracking",
    label: "行为追踪",
    description: "分析使用行为以改善推荐精度",
    affectedFeatures: ["个性化推荐", "内容排序"],
    category: "general",
  },
  {
    key: "analytics",
    label: "使用分析",
    description: "收集匿名使用数据用于产品改进",
    affectedFeatures: ["产品优化", "功能改进"],
    category: "general",
  },
  {
    key: "marketing",
    label: "营销推送",
    description: "接收个性化的时尚推荐和优惠信息",
    affectedFeatures: ["优惠通知", "新品推送"],
    category: "general",
  },
  {
    key: "data_export",
    label: "数据导出",
    description: "授权导出您的个人数据",
    affectedFeatures: ["数据导出功能"],
    category: "general",
  },
  {
    key: "account_deletion",
    label: "账户删除",
    description: "授权删除您的账户及关联数据",
    affectedFeatures: ["账户注销功能"],
    category: "general",
  },
];

interface ConsentStatus {
  consentType: ConsentTypeKey;
  granted: boolean;
  grantedAt: string | null;
  revokedAt: string | null;
  version: string;
}

export const ConsentManagementScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const [consentStatuses, setConsentStatuses] = useState<Map<ConsentTypeKey, ConsentStatus>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [togglingKey, setTogglingKey] = useState<ConsentTypeKey | null>(null);

  // Load consent statuses from backend
  useEffect(() => {
    const loadConsents = async () => {
      try {
        const response = await apiClient.get<{ consents: ConsentStatus[] }>("/consent/status");
        if (response.success && response.data) {
          const statusMap = new Map<ConsentTypeKey, ConsentStatus>();
          for (const consent of response.data.consents) {
            statusMap.set(consent.consentType as ConsentTypeKey, consent);
          }
          setConsentStatuses(statusMap);
        }
      } catch {
        // Silently fail — show default unchecked state
      } finally {
        setLoading(false);
      }
    };
    void loadConsents();
  }, []);

  const handleToggle = useCallback(
    (key: ConsentTypeKey, currentValue: boolean) => {
      const config = ALL_CONSENT_CONFIGS.find((c) => c.key === key);
      if (!config) return;

      if (currentValue) {
        // Revoking consent — show confirmation
        Alert.alert(
          "撤回授权",
          `撤回「${config.label}」后，以下功能将不可用：\n\n${config.affectedFeatures
            .map((f) => `  - ${f}`)
            .join("\n")}\n\n确定要撤回吗？`,
          [
            { text: "取消", style: "cancel" },
            {
              text: "确认撤回",
              style: "destructive",
              onPress: () => performToggle(key, false),
            },
          ]
        );
      } else {
        // Granting consent
        performToggle(key, true);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const performToggle = useCallback(async (key: ConsentTypeKey, granted: boolean) => {
    setTogglingKey(key);
    try {
      await apiClient.post("/consent/record", {
        consentType: key,
        granted,
      });

      // Update local state
      setConsentStatuses((prev) => {
        const next = new Map(prev);
        const existing = next.get(key);
        next.set(key, {
          consentType: key,
          granted,
          grantedAt: granted ? new Date().toISOString() : existing?.grantedAt ?? null,
          revokedAt: !granted ? new Date().toISOString() : null,
          version: existing?.version ?? "1.0",
        });
        return next;
      });
    } catch {
      Alert.alert("错误", "授权操作失败，请重试");
    } finally {
      setTogglingKey(null);
    }
  }, []);

  const renderConsentSection = (title: string, category: "sensitive" | "general") => {
    const items = ALL_CONSENT_CONFIGS.filter((c) => c.category === category);
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {items.map((config) => {
          const status = consentStatuses.get(config.key);
          const isGranted = status?.granted ?? false;
          const isToggling = togglingKey === config.key;

          return (
            <View key={config.key} style={styles.consentItem}>
              <View style={styles.consentItemContent}>
                <View style={styles.consentItemHeader}>
                  <Text style={styles.consentItemLabel}>{config.label}</Text>
                  {category === "sensitive" && (
                    <View style={styles.sensitiveBadge}>
                      <Text style={styles.sensitiveBadgeText}>敏感</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.consentItemDescription}>{config.description}</Text>

                {/* Affected features */}
                <View style={styles.featureTags}>
                  {config.affectedFeatures.map((feature) => (
                    <View key={feature} style={styles.featureTag}>
                      <Text style={styles.featureTagText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                {/* Version and date info */}
                {status && (
                  <Text style={styles.versionInfo}>
                    版本 {status.version}
                    {status.grantedAt &&
                      ` | 授权于 ${new Date(status.grantedAt).toLocaleDateString("zh-CN")}`}
                    {status.revokedAt &&
                      !isGranted &&
                      ` | 撤回于 ${new Date(status.revokedAt).toLocaleDateString("zh-CN")}`}
                  </Text>
                )}
              </View>

              <View style={styles.toggleContainer}>
                {isToggling ? (
                  <ActivityIndicator size="small" color={colors.primary[500]} />
                ) : (
                  <Switch
                    value={isGranted}
                    onValueChange={() => handleToggle(config.key, isGranted)}
                    trackColor={{ false: colors.neutral[300], true: colors.primary[300] }}
                    thumbColor={isGranted ? colors.primary[500] : colors.neutral[100]}
                  />
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>加载授权设置...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral[800]} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>隐私授权管理</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Legal notice */}
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary[500]} />
          <Text style={styles.noticeText}>
            依据《个人信息保护法》第29条，敏感个人信息处理需取得您单独同意。您可以随时撤回授权，撤回不影响之前基于同意的处理效力。
          </Text>
        </View>

        {renderConsentSection("敏感信息授权", "sensitive")}
        {renderConsentSection("一般信息授权", "general")}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  backButton: {
    padding: Spacing.xs,
  },
  navTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: colors.neutral[800],
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.neutral[500],
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  noticeCard: {
    flexDirection: "row",
    backgroundColor: colors.primary[50],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  noticeText: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.neutral[600],
    lineHeight: 18,
    marginLeft: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "700",
    color: colors.neutral[800],
    marginBottom: Spacing.md,
  },
  consentItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  consentItemContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  consentItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  consentItemLabel: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.neutral[800],
  },
  sensitiveBadge: {
    backgroundColor: colors.error[50],
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: Spacing.sm,
  },
  sensitiveBadgeText: {
    fontSize: DesignTokens.typography.sizes.xxs,
    color: colors.error[500],
    fontWeight: "500",
  },
  consentItemDescription: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.neutral[500],
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  featureTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  featureTag: {
    backgroundColor: colors.neutral[100],
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  featureTagText: {
    fontSize: DesignTokens.typography.sizes.xxs,
    color: colors.neutral[600],
  },
  versionInfo: {
    fontSize: DesignTokens.typography.sizes.xxs,
    color: colors.neutral[400],
    marginTop: Spacing.xs,
  },
  toggleContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
});

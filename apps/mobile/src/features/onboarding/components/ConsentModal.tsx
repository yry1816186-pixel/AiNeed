import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "../../../polyfills/expo-vector-icons";
import { LinearGradient } from "../../../polyfills/expo-linear-gradient";
import apiClient from "../../../services/api/client";
import { DesignTokens } from "../../../design-system/theme";
import { flatColors as colors } from "../../../design-system/theme";
import { Spacing, BorderRadius, Shadows } from "../../../design-system/theme";

// --- Consent type definitions (aligned with backend ConsentType enum) ---

export type ConsentTypeKey = "body_metrics" | "photos" | "body_fat" | "ai_domestic_no_crossborder";

interface ConsentItem {
  key: ConsentTypeKey;
  label: string;
  description: string;
  detailText: string;
  required: boolean;
}

const CONSENT_ITEMS: ConsentItem[] = [
  {
    key: "body_metrics",
    label: "允许使用三围数据推荐",
    description: "使用您的身高、体重、三围等数据提供精准穿搭推荐",
    detailText:
      "我们将收集您的身高、体重、肩宽、胸围、腰围、臀围等体型数据，用于：\n1. 计算最适合您的服装尺码\n2. 推荐与体型匹配的穿搭方案\n3. 优化推荐算法的个性化精度\n\n数据仅用于推荐服务，不会分享给第三方。",
    required: true,
  },
  {
    key: "photos",
    label: "允许使用照片进行试穿",
    description: "上传照片用于虚拟试穿和风格分析",
    detailText:
      "我们将处理您上传的个人照片，用于：\n1. 虚拟试穿功能 — 将服装叠加到您的照片上\n2. 体型分析 — 从照片中提取体型特征\n3. 风格评估 — 分析您的穿搭风格\n\n照片存储在加密服务器上，仅您本人可见，30天后自动删除。",
    required: true,
  },
  {
    key: "body_fat",
    label: "允许使用体脂率数据",
    description: "使用体脂率数据优化推荐精准度",
    detailText:
      "我们将使用您的体脂率数据，用于：\n1. 更精准地判断体型分类\n2. 推荐更适合的服装版型\n3. 提供健康穿搭建议\n\n体脂率数据属于敏感个人信息，依据《个人信息保护法》需单独授权。",
    required: false,
  },
  {
    key: "ai_domestic_no_crossborder",
    label: "确认使用国产AI服务，数据不跨境",
    description: "确认AI服务由国内服务商提供，数据不出境",
    detailText:
      "本应用使用的AI服务（包括智能推荐、对话交互、虚拟试穿）均由国内服务商提供：\n\n1. 大语言模型：智谱AI (GLM-4) — 服务器位于中国境内\n2. 向量检索：Marqo FashionSigLIP — 服务器位于中国境内\n3. 语音合成：Edge-TTS — 微软中国节点\n\n依据《个人信息保护法》和《数据出境安全评估办法》，您的数据不会被传输至境外。此确认保障您的数据主权。",
    required: true,
  },
];

interface ConsentModalProps {
  visible: boolean;
  onComplete: (grantedConsents: ConsentTypeKey[]) => void;
  onSkip?: () => void;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({ visible, onComplete, onSkip }) => {
  const [checkedItems, setCheckedItems] = useState<Set<ConsentTypeKey>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<ConsentTypeKey>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const allRequiredChecked = CONSENT_ITEMS.filter((item) => item.required).every((item) =>
    checkedItems.has(item.key)
  );

  const toggleCheck = useCallback((key: ConsentTypeKey) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleExpand = useCallback((key: ConsentTypeKey) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!allRequiredChecked) return;

    setSubmitting(true);
    try {
      // Record each checked consent type
      const grantedConsents = Array.from(checkedItems);
      const results = await Promise.allSettled(
        grantedConsents.map((consentType) =>
          apiClient.post("/consent/record", {
            consentType,
            granted: true,
          })
        )
      );

      // Also explicitly revoke unchecked optional items
      const uncheckedOptional = CONSENT_ITEMS.filter(
        (item) => !item.required && !checkedItems.has(item.key)
      );
      await Promise.allSettled(
        uncheckedOptional.map((item) =>
          apiClient.post("/consent/record", {
            consentType: item.key,
            granted: false,
          })
        )
      );

      const failedCount = results.filter((r) => r.status === "rejected").length;
      if (failedCount > 0) {
        Alert.alert("提示", `${failedCount} 项授权记录失败，可在设置中重新授权`);
      }

      onComplete(grantedConsents);
    } catch {
      Alert.alert("错误", "授权提交失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }, [allRequiredChecked, checkedItems, onComplete]);

  const handleSkip = useCallback(() => {
    Alert.alert(
      "稍后设置",
      "跳过授权后，部分功能将受到限制。您可以随时在「我的 → 设置 → 隐私授权」中重新设置。",
      [
        { text: "取消", style: "cancel" },
        {
          text: "确认跳过",
          style: "default",
          onPress: () => {
            onSkip?.();
          },
        },
      ]
    );
  }, [onSkip]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="shield-checkmark-outline" size={28} color={colors.primary[500]} />
          <Text style={styles.headerTitle}>隐私授权设置</Text>
        </View>

        <Text style={styles.subtitle}>
          依据《个人信息保护法》，以下敏感信息需要您单独授权。我们承诺仅用于提升您的使用体验。
        </Text>

        {/* Consent items */}
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {CONSENT_ITEMS.map((item) => (
            <View key={item.key} style={styles.consentCard}>
              {/* Checkbox row */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => toggleCheck(item.key)}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.checkbox, checkedItems.has(item.key) && styles.checkboxChecked]}
                >
                  {checkedItems.has(item.key) && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
                <View style={styles.checkboxLabelContainer}>
                  <Text style={styles.checkboxLabel}>
                    {item.label}
                    {item.required && <Text style={styles.requiredBadge}> *必选</Text>}
                  </Text>
                  <Text style={styles.checkboxDescription}>{item.description}</Text>
                </View>
              </TouchableOpacity>

              {/* Expand detail */}
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => toggleExpand(item.key)}
                activeOpacity={0.6}
              >
                <Text style={styles.expandButtonText}>
                  {expandedItems.has(item.key) ? "收起详情" : "查看详情"}
                </Text>
                <Ionicons
                  name={expandedItems.has(item.key) ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={colors.primary[500]}
                />
              </TouchableOpacity>

              {/* Detail text */}
              {expandedItems.has(item.key) && (
                <View style={styles.detailContainer}>
                  <Text style={styles.detailText}>{item.detailText}</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Action buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, !allRequiredChecked && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={!allRequiredChecked || submitting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                allRequiredChecked
                  ? [DesignTokens.colors.brand.slateLight, DesignTokens.colors.brand.slateDark]
                  : [colors.neutral[300], colors.neutral[400]]
              }
              style={styles.primaryButtonGradient}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>同意并继续</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {onSkip && (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.6}>
              <Text style={styles.skipButtonText}>稍后设置</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: colors.neutral[900],
    marginLeft: Spacing.sm,
  },
  subtitle: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.neutral[500],
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  consentCard: {
    backgroundColor: "#fff",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    marginRight: Spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  checkboxLabelContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.neutral[800],
  },
  requiredBadge: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.error[500],
    fontWeight: "400",
  },
  checkboxDescription: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.neutral[500],
    marginTop: 4,
    lineHeight: 18,
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    marginLeft: 30,
  },
  expandButtonText: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.primary[500],
    marginRight: 4,
  },
  detailContainer: {
    marginTop: Spacing.sm,
    marginLeft: 30,
    padding: Spacing.sm,
    backgroundColor: colors.neutral[50],
    borderRadius: BorderRadius.md,
  },
  detailText: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.neutral[600],
    lineHeight: 18,
  },
  actionContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  primaryButton: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: "#fff",
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  skipButtonText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.neutral[400],
  },
});

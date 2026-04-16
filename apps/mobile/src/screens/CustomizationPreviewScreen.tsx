import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "../polyfills/expo-vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { theme, Colors, Spacing, BorderRadius, Shadows } from '../design-system/theme';
import { useCustomizationEditorStore } from "../stores/customizationEditorStore";
import customizationApi from "../services/api/customization.api";
import type { RootStackParamList } from "../types/navigation";

type Navigation = import("@react-navigation/native").NavigationProp<RootStackParamList>;
type PreviewRoute = RouteProp<RootStackParamList, "CustomizationPreview">;

export const CustomizationPreviewScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<PreviewRoute>();
  const { designId } = route.params;
  const store = useCustomizationEditorStore();

  const [printSide, setPrintSide] = useState<"front" | "back" | "both">("front");
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [_designData, setDesignData] = useState<any>(null);

  useEffect(() => {
    void loadDesign();
  }, [designId]);

  const loadDesign = async () => {
    try {
      const response = await customizationApi.getDesign(designId);
      if (response.success && response.data) {
        setDesignData(response.data);
      }
    } catch {
      // handle
    }
  };

  const handleCalculateQuote = useCallback(async () => {
    setIsCalculating(true);
    try {
      await store.calculateQuote(printSide);
    } finally {
      setIsCalculating(false);
    }
  }, [printSide, store]);

  const handleSubmit = useCallback(async () => {
    if (!store.quote) {
      Alert.alert("提示", "请先计算报价");
      return;
    }

    setIsSubmitting(true);
    try {
      const requestId = await store.submitCustomization(store.quote.quoteId);
      if (requestId) {
        Alert.alert("提交成功", "定制需求已提交，即将进入订单详情", [
          {
            text: "查看订单",
            onPress: () => {
              (navigation as any).replace("CustomizationOrderDetail", { requestId });
            },
          },
        ]);
      } else {
        Alert.alert("提交失败", "请稍后重试");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [store, navigation]);

  const renderPrintSideSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>打印面</Text>
      <View style={styles.sideOptions}>
        {(["front", "back", "both"] as const).map((side) => {
          const labels = { front: "正面", back: "背面", both: "双面" };
          const isSelected = printSide === side;
          return (
            <TouchableOpacity
              key={side}
              style={[styles.sideOption, isSelected && styles.sideOptionSelected]}
              onPress={() => setPrintSide(side)}
              activeOpacity={0.7}
            >
              <Text style={[styles.sideOptionText, isSelected && styles.sideOptionTextSelected]}>
                {labels[side]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderQuoteDetails = () => {
    if (!store.quote) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>报价明细</Text>
        <View style={styles.quoteCard}>
          <View style={styles.quoteRow}>
            <Text style={styles.quoteLabel}>基础价格</Text>
            <Text style={styles.quoteValue}>{store.quote.basePrice} CNY</Text>
          </View>
          {store.quote.complexitySurcharge > 0 && (
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>复杂度附加</Text>
              <Text style={styles.quoteValue}>+{store.quote.complexitySurcharge} CNY</Text>
            </View>
          )}
          {store.quote.textSurcharge > 0 && (
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>文字附加</Text>
              <Text style={styles.quoteValue}>+{store.quote.textSurcharge} CNY</Text>
            </View>
          )}
          {store.quote.sideSurcharge > 0 && (
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>双面附加</Text>
              <Text style={styles.quoteValue}>+{store.quote.sideSurcharge} CNY</Text>
            </View>
          )}
          <View style={[styles.quoteRow, styles.quoteTotal]}>
            <Text style={styles.quoteTotalLabel}>合计</Text>
            <Text style={styles.quoteTotalValue}>{store.quote.totalPrice} CNY</Text>
          </View>
          <Text style={styles.estimatedDays}>预计制作时间：{store.quote.estimatedDays} 天</Text>
        </View>
      </View>
    );
  };

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
        <Text style={styles.topBarTitle}>定制预览</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Preview Image */}
        <View style={styles.previewContainer}>
          {store.previewUrl ? (
            <Text style={styles.previewUrlText}>{store.previewUrl}</Text>
          ) : (
            <View style={styles.previewPlaceholder}>
              <Ionicons name="image-outline" size={48} color={Colors.neutral[300]} />
              <Text style={styles.previewPlaceholderText}>设计预览</Text>
            </View>
          )}
        </View>

        {/* Packaging Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>专属包装</Text>
          <View style={styles.packagingCard}>
            <View style={styles.packagingItem}>
              <Ionicons name="gift-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.packagingText}>AiNeed 专属包装盒</Text>
            </View>
            <View style={styles.packagingItem}>
              <Ionicons name="heart-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.packagingText}>感谢卡 + 品牌贴纸</Text>
            </View>
          </View>
        </View>

        {renderPrintSideSelector()}

        {/* Calculate Quote Button */}
        {!store.quote && (
          <TouchableOpacity
            style={styles.calculateButton}
            onPress={handleCalculateQuote}
            disabled={isCalculating}
            activeOpacity={0.7}
          >
            {isCalculating ? (
              <ActivityIndicator size="small" color={theme.colors.surface} />
            ) : (
              <Text style={styles.calculateButtonText}>计算报价</Text>
            )}
          </TouchableOpacity>
        )}

        {renderQuoteDetails()}

        {/* Submit Button */}
        {store.quote && (
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={theme.colors.surface} />
            ) : (
              <Text style={styles.submitButtonText}>确认定制 (不可退款)</Text>
            )}
          </TouchableOpacity>
        )}

        <Text style={styles.disclaimer}>定制商品因其生产特殊性，确认付款后不支持退款</Text>
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
  scrollContent: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[8],
  },
  previewContainer: {
    height: 280,
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  previewUrlText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  previewPlaceholder: {
    alignItems: "center",
  },
  previewPlaceholderText: {
    fontSize: 14,
    color: Colors.neutral[400],
    marginTop: Spacing[2],
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
  sideOptions: {
    flexDirection: "row",
    gap: Spacing[2],
  },
  sideOption: {
    flex: 1,
    paddingVertical: Spacing[3],
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.neutral[50],
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  sideOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: "rgba(198, 123, 92, 0.06)",
  },
  sideOptionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  sideOptionTextSelected: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  calculateButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing[4],
    alignItems: "center",
    marginBottom: Spacing[4],
  },
  calculateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.surface,
  },
  quoteCard: {
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
  },
  quoteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing[1],
  },
  quoteLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  quoteValue: {
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  quoteTotal: {
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    marginTop: Spacing[2],
    paddingTop: Spacing[2],
  },
  quoteTotalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  quoteTotalValue: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  estimatedDays: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: Spacing[2],
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing[4],
    alignItems: "center",
    marginBottom: Spacing[2],
    ...Shadows.brand,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.surface,
  },
  disclaimer: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    textAlign: "center",
  },
});

export default CustomizationPreviewScreen;

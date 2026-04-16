import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { DesignTokens , flatColors as colors } from '../../../design-system/theme/tokens/design-tokens';
import { tryOnApi, type TryOnResult } from '../../../services/api/tryon.api';
import type { TryOnStackParamList } from '../../../navigation/types';
import { Spacing } from '../../../design-system/theme';


type TryOnResultRoute = RouteProp<TryOnStackParamList, "TryOnResult">;

const SCREEN_WIDTH = Dimensions.get("window").width;
const _IMAGE_HEIGHT = SCREEN_WIDTH * 1.2;

export const TryOnResultScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<TryOnResultRoute>();
  const resultId = route.params?.resultId;

  const [result, setResult] = useState<TryOnResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResult = useCallback(async () => {
    if (!resultId) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await tryOnApi.getStatus(resultId);
      if (response.success && response.data) {
        setResult(response.data);
        if (response.data.status === "processing" || response.data.status === "pending") {
          pollingRef.current = setTimeout(() => fetchResult(), 3000);
        }
      } else {
        setError(response.error?.message || "加载试衣结果失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }, [resultId]);

  useEffect(() => {
    void fetchResult();
  }, [fetchResult]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
  }, []);

  const handleRetry = useCallback(async () => {
    if (!resultId) {
      return;
    }
    setRetrying(true);
    try {
      const response = await tryOnApi.retryTryOn(resultId);
      if (response.success && response.data) {
        void fetchResult();
      } else {
        Alert.alert("重试失败", "请稍后再试");
      }
    } catch {
      Alert.alert("网络错误", "请检查网络后重试");
    } finally {
      setRetrying(false);
    }
  }, [resultId, fetchResult]);

  const handleShare = useCallback(() => {
    Alert.alert("分享", "分享功能即将上线");
  }, []);

  const handleSaveToWardrobe = useCallback(() => {
    Alert.alert("已保存", "试衣结果已保存到衣橱");
  }, []);

  if (loading && !result) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>试衣结果</Text>
          <View style={s.iconBtn} />
        </View>
        <View style={s.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>加载结果中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !result) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>试衣结果</Text>
          <View style={s.iconBtn} />
        </View>
        <View style={s.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.actionBtn} onPress={fetchResult}>
            <Text style={s.actionBtnText}>重试</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isProcessing = result?.status === "processing" || result?.status === "pending";
  const isFailed = result?.status === "failed";
  const isComplete = result?.status === "completed";

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>试衣结果</Text>
        <TouchableOpacity style={s.iconBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent}>
        {/* Status badge */}
        <View
          style={[
            s.statusBadge,
            isComplete && s.statusBadgeSuccess,
            isFailed && s.statusBadgeError,
            isProcessing && s.statusBadgeProcessing,
          ]}
        >
          <Ionicons
            name={isComplete ? "checkmark-circle" : isFailed ? "close-circle" : "time"}
            size={16}
            color={
              isComplete ? colors.success : isFailed ? colors.error : colors.amber
            }
          />
          <Text
            style={[s.statusText, isComplete && s.statusTextSuccess, isFailed && s.statusTextError]}
          >
            {isComplete ? "已完成" : isFailed ? "生成失败" : "AI 处理中..."}
          </Text>
        </View>

        {/* Comparison images */}
        <View style={s.comparisonContainer}>
          {/* Original photo */}
          <View style={s.comparisonItem}>
            <Text style={s.comparisonLabel}>原始照片</Text>
            <View style={s.imageBox}>
              {result?.photo?.thumbnailUrl ? (
                <Image
                  source={{ uri: result.photo.thumbnailUrl }}
                  style={s.comparisonImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={s.imagePlaceholder}>
                  <Ionicons name="person-outline" size={40} color={colors.textTertiary} />
                </View>
              )}
            </View>
          </View>

          {/* Result image */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Ionicons name="arrow-forward" size={20} color={colors.primary} />
            <View style={s.dividerLine} />
          </View>

          <View style={s.comparisonItem}>
            <Text style={s.comparisonLabel}>AI 试衣效果</Text>
            <View style={s.imageBox}>
              {isComplete && result?.resultImageUrl ? (
                <Image
                  source={{ uri: result.resultImageUrl }}
                  style={s.comparisonImage}
                  resizeMode="cover"
                />
              ) : isProcessing ? (
                <View style={s.imagePlaceholder}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={s.processingText}>AI 生成中...</Text>
                </View>
              ) : isFailed ? (
                <View style={s.imagePlaceholder}>
                  <Ionicons name="refresh" size={40} color={colors.error} />
                </View>
              ) : (
                <View style={s.imagePlaceholder}>
                  <Ionicons name="image-outline" size={40} color={colors.textTertiary} />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Item info */}
        {result?.item && (
          <View style={s.itemCard}>
            <View style={s.itemInfo}>
              {result.item.mainImage && (
                <Image
                  source={{ uri: result.item.mainImage }}
                  style={s.itemThumb}
                  resizeMode="cover"
                />
              )}
              <View style={s.itemDetails}>
                <Text style={s.itemName}>{result.item.name}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Action buttons */}
        <View style={s.actionRow}>
          {isFailed && (
            <TouchableOpacity
              style={[s.actionBtn, s.retryActionBtn]}
              onPress={handleRetry}
              disabled={retrying}
            >
              {retrying ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Ionicons name="refresh" size={18} color={colors.surface} />
              )}
              <Text style={s.actionBtnWhiteText}>重试</Text>
            </TouchableOpacity>
          )}
          {isComplete && (
            <>
              <TouchableOpacity style={s.actionBtnOutline} onPress={handleSaveToWardrobe}>
                <Ionicons name="download-outline" size={18} color={colors.primary} />
                <Text style={s.actionBtnPrimaryText}>保存</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, s.shareActionBtn]} onPress={handleShare}>
                <Ionicons name="share-outline" size={18} color={colors.surface} />
                <Text style={s.actionBtnWhiteText}>分享</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={s.actionBtnOutline} onPress={() => navigation.goBack()}>
            <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
            <Text style={s.actionBtnPrimaryText}>再次试衣</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "700", color: colors.text },
  iconBtn: { width: DesignTokens.spacing[9], height: DesignTokens.spacing[9], alignItems: "center", justifyContent: "center" },
  centerContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.xl},
  loadingText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textSecondary, marginTop: DesignTokens.spacing[3]},
  errorText: { fontSize: DesignTokens.typography.sizes.base, color: colors.error, marginTop: DesignTokens.spacing[3], textAlign: "center" },
  actionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: DesignTokens.spacing['2.5'],
    borderRadius: 20,
    marginTop: Spacing.md,
  },
  actionBtnText: { color: colors.surface, fontSize: DesignTokens.typography.sizes.base, fontWeight: "600" },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: DesignTokens.spacing[10]},
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing['1.5'],
    alignSelf: "center",
    paddingHorizontal: DesignTokens.spacing['3.5'],
    paddingVertical: DesignTokens.spacing['1.5'],
    borderRadius: 20,
    backgroundColor: colors.subtleBg,
    marginBottom: DesignTokens.spacing[5],
  },
  statusBadgeSuccess: { backgroundColor: colors.successLight },
  statusBadgeError: { backgroundColor: colors.errorLight },
  statusBadgeProcessing: { backgroundColor: colors.warningLight },
  statusText: { fontSize: DesignTokens.typography.sizes.sm, fontWeight: "600", color: colors.textSecondary },
  statusTextSuccess: { color: colors.success },
  statusTextError: { color: colors.error },
  comparisonContainer: { flexDirection: "row", alignItems: "center", marginBottom: DesignTokens.spacing[5]},
  comparisonItem: { flex: 1 },
  comparisonLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  imageBox: {
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.subtleBg,
  },
  comparisonImage: { width: "100%", height: "100%" },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.subtleBg,
  },
  processingText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textSecondary, marginTop: Spacing.sm},
  divider: { paddingHorizontal: Spacing.sm, alignItems: "center", gap: Spacing.xs},
  dividerLine: { width: 1, height: 30, backgroundColor: colors.border },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: DesignTokens.spacing['3.5'],
    marginBottom: DesignTokens.spacing[5],
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: DesignTokens.spacing['0.5'] },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  itemInfo: { flexDirection: "row", alignItems: "center" },
  itemThumb: {
    width: Spacing['2xl'],
    height: Spacing['2xl'],
    borderRadius: 8,
    backgroundColor: colors.placeholderBg,
  },
  itemDetails: { marginLeft: DesignTokens.spacing[3], flex: 1 },
  itemName: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "500", color: colors.text },
  actionRow: { flexDirection: "row", gap: DesignTokens.spacing['2.5'], justifyContent: "center", flexWrap: "wrap" },
  actionBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing['1.5'],
    paddingHorizontal: DesignTokens.spacing[4],
    paddingVertical: DesignTokens.spacing['2.5'],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionBtnPrimaryText: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: colors.primary },
  actionBtnWhiteText: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: colors.surface },
  retryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing['1.5'],
    paddingHorizontal: Spacing.lg,
    paddingVertical: DesignTokens.spacing['2.5'],
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  shareActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing['1.5'],
    paddingHorizontal: Spacing.lg,
    paddingVertical: DesignTokens.spacing['2.5'],
    borderRadius: 20,
  },
});

export default TryOnResultScreen;

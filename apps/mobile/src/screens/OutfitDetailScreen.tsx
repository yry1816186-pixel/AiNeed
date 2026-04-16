import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import * as Haptics from "@/src/polyfills/expo-haptics";
import { outfitApi } from "../services/api/outfit.api";
import { theme } from '../design-system/theme';
import { DesignTokens } from "../theme/tokens/design-tokens";
import type { RootStackParamList } from "../types/navigation";
import type { Outfit } from "../types/outfit";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type OutfitDetailRouteProp = RouteProp<RootStackParamList, "OutfitDetail">;

export const OutfitDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<OutfitDetailRouteProp>();
  const { outfitId } = route.params;

  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOutfit = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await outfitApi.getById(outfitId);
      if (response.success && response.data) {
        setOutfit(response.data);
      } else {
        const errorMsg =
          typeof response.error === "string"
            ? response.error
            : response.error?.message || "加载失败";
        setError(errorMsg);
      }
    } catch (err: unknown) {
      setError("网络错误，请重试");
    } finally {
      setIsLoading(false);
    }
  }, [outfitId]);

  useEffect(() => {
    void loadOutfit();
  }, [loadOutfit]);

  const handleDelete = useCallback(() => {
    Alert.alert("确认删除", "确定要删除这个搭配吗？此操作不可撤销。", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          try {
            const response = await outfitApi.delete(outfitId);
            if (response.success) {
              if (Platform.OS !== "web") {
                Haptics.notificationAsync("success");
              }
              navigation.goBack();
            } else {
              const errorMsg =
                typeof response.error === "string"
                  ? response.error
                  : response.error?.message || "请稍后重试";
              Alert.alert("删除失败", errorMsg);
            }
          } catch (err: unknown) {
            Alert.alert("删除失败", "网络错误，请重试");
          }
        },
      },
    ]);
  }, [outfitId, navigation]);

  const handleToggleFavorite = useCallback(async () => {
    if (!outfit) {
      return;
    }
    try {
      const response = await outfitApi.toggleFavorite(outfitId);
      if (response.success && response.data) {
        setOutfit(response.data);
        if (Platform.OS !== "web") {
          Haptics.impactAsync("light");
        }
      }
    } catch (err: unknown) {
      Alert.alert("操作失败", "请稍后重试");
    }
  }, [outfitId, outfit]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !outfit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>{error || "未找到搭配"}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadOutfit}
            accessibilityLabel="重试加载搭配"
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="返回上一页"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>搭配详情</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleToggleFavorite}
          accessibilityLabel={outfit.isFavorite ? "取消收藏" : "收藏搭配"}
          accessibilityRole="button"
        >
          <Ionicons
            name={outfit.isFavorite ? "heart" : "heart-outline"}
            size={24}
            color={outfit.isFavorite ? theme.colors.error : theme.colors.text}
          />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.imageSection}>
          {outfit.thumbnailUri ? (
            <Image
              source={{ uri: outfit.thumbnailUri }}
              style={styles.mainImage}
              accessibilityLabel="搭配图片"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="layers-outline" size={80} color={theme.colors.textTertiary} />
            </View>
          )}
        </View>
        <View style={styles.infoSection}>
          <Text style={styles.outfitName}>{outfit.name || "未命名搭配"}</Text>
          {outfit.description && <Text style={styles.outfitDescription}>{outfit.description}</Text>}
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          accessibilityLabel="删除搭配"
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
          <Text style={styles.deleteButtonText}>删除</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.wearButton}
          accessibilityLabel="标记为今日穿着"
          accessibilityRole="button"
        >
          <LinearGradient colors={["#4F46E5" /* custom color */, DesignTokens.colors.brand.slateDark]} style={styles.wearButtonGradient} />
          <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.surface} />
          <Text style={styles.wearButtonText}>今日穿着</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DesignTokens.colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600", color: theme.colors.text },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DesignTokens.colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1 },
  imageSection: { backgroundColor: theme.colors.surface },
  mainImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.8, resizeMode: "cover" },
  placeholderImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.8,
    backgroundColor: DesignTokens.colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  infoSection: { backgroundColor: theme.colors.surface, marginTop: 16, padding: 20 },
  outfitName: { fontSize: DesignTokens.typography.sizes['2xl'], fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 8 },
  outfitDescription: { fontSize: DesignTokens.typography.sizes.base, color: theme.colors.textSecondary, lineHeight: 22 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: DesignTokens.typography.sizes.md, color: theme.colors.textSecondary, marginTop: 12 },
  errorContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  errorText: {
    fontSize: DesignTokens.typography.sizes.md,
    color: theme.colors.textSecondary,
    marginTop: 12,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "500", color: theme.colors.surface },
  bottomSpacer: { height: 100 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  deleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  deleteButtonText: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "500", color: theme.colors.error },
  wearButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    overflow: "hidden",
  },
  wearButtonGradient: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  wearButtonText: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: theme.colors.surface },
});

export default OutfitDetailScreen;

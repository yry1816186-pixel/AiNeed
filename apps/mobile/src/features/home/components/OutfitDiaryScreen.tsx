/**
 * OutfitDiaryScreen - Displays user's outfit diary entries.
 *
 * Fetches diary data via TanStack Query from GET /api/v1/diary.
 * Supports loading, empty, and populated states with diary cards.
 */
import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";

import apiClient from "../../../services/api/client";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { createStyles, type FlatColors } from "../../../shared/contexts/ThemeContext";
import { flatColors as colors } from "../../../design-system/theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DiaryEntry {
  id: string;
  date: string;
  scene: string | null;
  weather: string | null;
  temperature: number | null;
  satisfactionScore: number | null;
  source: string;
  notes: string | null;
  outfit: {
    id: string;
    name: string | null;
    coverImage: string | null;
    style: string | null;
    occasions: string[];
  } | null;
}

interface DiaryResponse {
  items: DiaryEntry[];
  total: number;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

async function fetchDiaryEntries(): Promise<DiaryResponse> {
  const response = await apiClient.get("/diary");
  return (response.data ?? response) as DiaryResponse;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const weekday = weekdays[date.getDay()];
  return `${month}月${day}日 周${weekday}`;
}

function getSatisfactionLabel(score: number | null): { label: string; color: string } {
  if (score === null) {
    return { label: "未评分", color: colors.neutral[400] };
  }
  if (score >= 0.8) return { label: "很满意", color: colors.semantic.success };
  if (score >= 0.5) return { label: "还不错", color: colors.semantic.warning };
  if (score >= 0.2) return { label: "一般般", color: colors.semantic.info };
  return { label: "不满意", color: colors.semantic.error };
}

function getSceneIcon(scene: string | null): string {
  if (!scene) return "help-circle-outline";
  const map: Record<string, string> = {
    commute: "train-outline",
    work: "briefcase-outline",
    casual: "cafe-outline",
    formal: "ribbon-outline",
    date: "heart-outline",
    party: "wine-outline",
    sport: "fitness-outline",
    travel: "airplane-outline",
  };
  return map[scene] ?? "help-circle-outline";
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

const DiaryCard: React.FC<{ entry: DiaryEntry; index: number }> = ({ entry, index }) => {
  const styles = useStyles(colors);
  const satisfaction = getSatisfactionLabel(entry.satisfactionScore);

  return (
    <View style={[styles.card, { borderLeftColor: satisfaction.color }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>{formatDate(entry.date)}</Text>
        <View style={[styles.satisfactionBadge, { backgroundColor: `${satisfaction.color}15` }]}>
          <Text style={[styles.satisfactionText, { color: satisfaction.color }]}>
            {satisfaction.label}
          </Text>
        </View>
      </View>

      {entry.outfit && (
        <View style={styles.outfitRow}>
          {entry.outfit.coverImage ? (
            <Image source={{ uri: entry.outfit.coverImage }} style={styles.outfitImage} />
          ) : (
            <View style={styles.outfitImagePlaceholder}>
              <Ionicons name="shirt-outline" size={20} color={colors.neutral[400]} />
            </View>
          )}
          <View style={styles.outfitInfo}>
            <Text style={styles.outfitName} numberOfLines={1}>
              {entry.outfit.name ?? "未命名搭配"}
            </Text>
            {entry.outfit.style && <Text style={styles.outfitStyle}>{entry.outfit.style}</Text>}
          </View>
        </View>
      )}

      <View style={styles.metaRow}>
        {entry.scene && (
          <View style={styles.metaItem}>
            <Ionicons
              name={getSceneIcon(entry.scene) as any}
              size={14}
              color={colors.neutral[500]}
            />
            <Text style={styles.metaText}>{entry.scene}</Text>
          </View>
        )}
        {entry.weather && (
          <View style={styles.metaItem}>
            <Ionicons name="partly-sunny-outline" size={14} color={colors.neutral[500]} />
            <Text style={styles.metaText}>
              {entry.weather}
              {entry.temperature !== null ? ` ${entry.temperature}°C` : ""}
            </Text>
          </View>
        )}
        {entry.source === "auto" && (
          <View style={styles.autoTag}>
            <Text style={styles.autoTagText}>自动记录</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export const OutfitDiaryScreen: React.FC = () => {
  const styles = useStyles(colors);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["diary", "entries"],
    queryFn: fetchDiaryEntries,
    staleTime: 2 * 60 * 1000,
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["diary"] });
  }, [queryClient]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>加载中...</Text>
          <Text style={styles.stateSubtitle}>正在获取你的穿搭日记</Text>
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.stateContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.neutral[300]} />
          <Text style={styles.stateTitle}>加载失败</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void refetch()}>
            <Text style={styles.retryButtonText}>重新加载</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const entries = data?.items ?? [];

    if (entries.length === 0) {
      return (
        <View style={styles.stateContainer}>
          <Ionicons name="book-outline" size={48} color={colors.neutral[300]} />
          <Text style={styles.stateTitle}>还没有穿搭日记</Text>
          <Text style={styles.stateSubtitle}>
            当你保存搭配、完成试穿或收藏单品时，系统会自动记录
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary bar */}
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>共 {data?.total ?? entries.length} 条记录</Text>
        </View>

        {/* Diary cards */}
        {entries.map((entry, index) => (
          <DiaryCard key={entry.id} entry={entry} index={index} />
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>穿搭日记</Text>
        <Text style={styles.headerSubtitle}>记录每一次穿搭选择</Text>
      </View>

      {renderContent()}
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const useStyles = createStyles((themeColors: FlatColors) => ({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.backgrounds.secondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: DesignTokens.typography.sizes["2xl"],
    fontWeight: "700",
    color: themeColors.text.primary,
  },
  headerSubtitle: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: themeColors.text.secondary,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  summaryBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: themeColors.neutral[500],
  },
  card: {
    backgroundColor: themeColors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    ...DesignTokens.shadows.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardDate: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: themeColors.text.primary,
  },
  satisfactionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  satisfactionText: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "600",
  },
  outfitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  outfitImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
  },
  outfitImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: themeColors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  outfitInfo: {
    flex: 1,
  },
  outfitName: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: themeColors.text.primary,
  },
  outfitStyle: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: themeColors.text.secondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: themeColors.neutral[500],
  },
  autoTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: themeColors.neutral[100],
  },
  autoTagText: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: themeColors.neutral[500],
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  stateTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: themeColors.text.primary,
    marginTop: 16,
  },
  stateSubtitle: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: themeColors.text.secondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: themeColors.borders.brand,
  },
  retryButtonText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: themeColors.textInverse,
  },
}));

export default OutfitDiaryScreen;

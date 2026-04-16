import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { useAiStylistStore, type OutfitPlanDetail } from '../stores/aiStylistStore';
import type { StylistStackParamList } from '../../../navigation/types';
import { DesignTokens , Spacing , flatColors as colors } from '../../../design-system/theme'

type OutfitPlanRoute = RouteProp<StylistStackParamList, "OutfitPlan">;

const SCREEN_WIDTH = Dimensions.get("window").width;

export const OutfitPlanScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<OutfitPlanRoute>();
  const planId = route.params?.planId;

  const { currentOutfitPlan, isLoading, error, fetchOutfitPlan, currentSessionId } =
    useAiStylistStore();

  const [refreshing, setRefreshing] = useState(false);

  const sessionId = planId ?? currentSessionId;

  useEffect(() => {
    if (sessionId) {
      void fetchOutfitPlan(sessionId);
    }
  }, [sessionId, fetchOutfitPlan]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (sessionId) {
      await fetchOutfitPlan(sessionId);
    }
    setRefreshing(false);
  }, [sessionId, fetchOutfitPlan]);

  if (isLoading && !currentOutfitPlan) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Outfit Plan</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading outfit plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !currentOutfitPlan) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Outfit Plan</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity
            style={s.retryBtn}
            onPress={() => sessionId && fetchOutfitPlan(sessionId)}
          >
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentOutfitPlan) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Outfit Plan</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.centerContent}>
          <Ionicons name="shirt-outline" size={48} color={colors.textTertiary} />
          <Text style={s.emptyTitle}>No outfit plan yet</Text>
          <Text style={s.emptySubtitle}>
            Start a conversation with AI Stylist to generate a plan
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Outfit Plan</Text>
        <TouchableOpacity style={s.backBtn}>
          <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Summary section */}
        <View style={s.summaryCard}>
          <Text style={s.summaryTitle}>{currentOutfitPlan.lookSummary}</Text>
          {currentOutfitPlan.whyItFits.length > 0 && (
            <View style={s.reasonsContainer}>
              {currentOutfitPlan.whyItFits.map((reason, _idx) => (
                <View key={reason} style={s.reasonChip}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={s.reasonText}>{reason}</Text>
                </View>
              ))}
            </View>
          )}
          {currentOutfitPlan.weatherInfo && (
            <View style={s.weatherRow}>
              <Ionicons name="partly-sunny-outline" size={16} color={colors.amber} />
              <Text style={s.weatherText}>
                {currentOutfitPlan.weatherInfo.temperature}C -{" "}
                {currentOutfitPlan.weatherInfo.suggestion}
              </Text>
            </View>
          )}
        </View>

        {/* Outfit cards */}
        {currentOutfitPlan.outfits.map((outfit, outfitIdx) => (
          <View key={`outfit-${outfitIdx}`} style={s.outfitCard}>
            <View style={s.outfitHeader}>
              <Text style={s.outfitTitle}>{outfit.title}</Text>
              {outfit.estimatedTotalPrice !== null && (
                <Text style={s.outfitPrice}>~{outfit.estimatedTotalPrice} CNY</Text>
              )}
            </View>
            <View style={s.itemsGrid}>
              {outfit.items.map((item, itemIdx) => (
                <TouchableOpacity key={`item-${itemIdx}`} style={s.itemCard}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={s.itemImage} resizeMode="cover" />
                  ) : (
                    <View style={s.itemImagePlaceholder}>
                      <Ionicons name="shirt-outline" size={24} color={colors.textTertiary} />
                    </View>
                  )}
                  <Text style={s.itemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={s.itemCategory}>{item.category}</Text>
                  {item.price !== null && <Text style={s.itemPrice}>{item.price} CNY</Text>}
                </TouchableOpacity>
              ))}
            </View>
            {outfit.styleExplanation.length > 0 && (
              <View style={s.explanationRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={s.explanationText} numberOfLines={2}>
                  {outfit.styleExplanation.join(". ")}
                </Text>
              </View>
            )}
          </View>
        ))}
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
  backBtn: { width: DesignTokens.spacing[9], height: DesignTokens.spacing[9], alignItems: "center", justifyContent: "center" },
  centerContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.xl},
  loadingText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textSecondary, marginTop: DesignTokens.spacing[3]},
  errorText: { fontSize: DesignTokens.typography.sizes.base, color: colors.error, marginTop: DesignTokens.spacing[3], textAlign: "center" },
  retryBtn: {
    marginTop: Spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: DesignTokens.spacing['2.5'],
    borderRadius: 20,
  },
  retryBtnText: { color: colors.surface, fontSize: DesignTokens.typography.sizes.base, fontWeight: "600" },
  emptyTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600", color: colors.textPrimary, marginTop: Spacing.md},
  emptySubtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textTertiary,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: DesignTokens.spacing[10]},
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: DesignTokens.spacing['0.5'] },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: colors.textPrimary, lineHeight: 24 },
  reasonsContainer: { marginTop: DesignTokens.spacing[3], gap: DesignTokens.spacing['1.5']},
  reasonChip: { flexDirection: "row", alignItems: "center", gap: DesignTokens.spacing['1.5']},
  reasonText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textSecondary, flex: 1 },
  weatherRow: { flexDirection: "row", alignItems: "center", gap: DesignTokens.spacing['1.5'], marginTop: DesignTokens.spacing[3]},
  weatherText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textSecondary },
  outfitCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: DesignTokens.spacing['0.5'] },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  outfitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: DesignTokens.spacing[3],
  },
  outfitTitle: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "700", color: colors.text },
  outfitPrice: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: colors.primary },
  itemsGrid: { flexDirection: "row", flexWrap: "wrap", gap: DesignTokens.spacing['2.5']},
  itemCard: {
    width: (SCREEN_WIDTH - 64) / 3,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: Spacing.sm,
    alignItems: "center",
  },
  itemImage: {
    width: "100%",
    height: Spacing['4xl'],
    borderRadius: 8,
    backgroundColor: colors.placeholderBg,
  },
  itemImagePlaceholder: {
    width: "100%",
    height: Spacing['4xl'],
    borderRadius: 8,
    backgroundColor: colors.subtleBg,
    alignItems: "center",
    justifyContent: "center",
  },
  itemName: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "500",
    color: colors.textPrimary,
    marginTop: DesignTokens.spacing['1.5'],
    width: "100%",
  },
  itemCategory: { fontSize: DesignTokens.typography.sizes.xs, color: colors.textTertiary, marginTop: DesignTokens.spacing['0.5']},
  itemPrice: { fontSize: DesignTokens.typography.sizes.xs, fontWeight: "600", color: colors.primary, marginTop: DesignTokens.spacing['0.5']},
  explanationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: DesignTokens.spacing['1.5'],
    marginTop: DesignTokens.spacing[3],
    paddingTop: DesignTokens.spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  explanationText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textSecondary, flex: 1, lineHeight: 18 },
});

export default OutfitPlanScreen;

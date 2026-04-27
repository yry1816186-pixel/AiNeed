/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable import/no-unresolved */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-restricted-syntax */
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { FlashList } from "@shopify/flash-list";
import {
  useRoute,
  useNavigation,
  useFocusEffect,
  RouteProp,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import { useConsultantStore } from "../stores/consultantStore";
import { CaseCard } from "../components/CaseCard";
import { consultantApi } from "../../../services/api/consultant.api";
import type { ConsultantProfile } from "../../../types/consultant";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DesignTokens } from "../../../design-system/theme";
import { flatColors as colors } from "../../../design-system/theme";
import { createStyles } from "../../../shared/contexts/ThemeContext";

export const AdvisorProfileScreen: React.FC = () => {
  const styles = useStyles(colors);
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<ParamListBase>>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { currentConsultant, fetchConsultantById, isLoading } = useConsultantStore();
  const [cases, setCases] = useState<Record<string, unknown>[]>([]);

  const consultantId = (route.params as any)?.id;

  useFocusEffect(
    useCallback(() => {
      if (consultantId) {
        void fetchConsultantById(consultantId);
      }
    }, [consultantId, fetchConsultantById])
  );

  useEffect(() => {
    if (consultantId) {
      consultantApi
        .getCases(consultantId)
        .then((res) => {
          setCases((res.data || []) as Record<string, unknown>[]);
        })
        .catch(() => {});
    }
  }, [consultantId]);

  if (isLoading || !currentConsultant) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const profile =
    "data" in currentConsultant
      ? (currentConsultant as unknown as { data: ConsultantProfile }).data
      : (currentConsultant as unknown as ConsultantProfile);
  const specialties = Array.isArray(profile.specialties) ? profile.specialties : [];
  const bookingCount = (profile as any)?.bookingCount || 0;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{"<"}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>顾问详情</Text>
          <TouchableOpacity style={styles.shareBtn}>
            <Text style={styles.shareBtnText}>分享</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Hero */}
        <View style={styles.profileHero}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {(profile.studioName || "顾问").charAt(0)}
              </Text>
            </View>
          )}
          <Text style={styles.studioName}>{profile.studioName}</Text>
          <View style={styles.specialtyRow}>
            {specialties.slice(0, 4).map((s: string) => (
              <View key={s} style={styles.specialtyBadge}>
                <Text style={styles.specialtyText}>{s}</Text>
              </View>
            ))}
          </View>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingValue}>{profile.rating || 0}</Text>
            <Text style={styles.ratingLabel}>评分</Text>
            <Text style={styles.reviewCount}>{profile.reviewCount || 0} 条评价</Text>
          </View>
        </View>

        {/* Info Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>{profile.yearsOfExperience || 0} 年</Text>
            <Text style={styles.infoLabel}>从业经验</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>{profile.responseTimeAvg ?? "--"} 分</Text>
            <Text style={styles.infoLabel}>平均回复</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>{bookingCount} 单</Text>
            <Text style={styles.infoLabel}>已服务</Text>
          </View>
        </View>

        {/* Bio */}
        {profile.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>个人简介</Text>
            <Text style={styles.bioText} numberOfLines={3}>
              {profile.bio}
            </Text>
          </View>
        )}

        {/* Portfolio / Cases */}
        {cases.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>服务案例</Text>
            <FlashList
              horizontal
              data={cases}
              keyExtractor={(item: Record<string, unknown>) => String(item.bookingId)}
              renderItem={({ item }: { item: Record<string, unknown> }) => (
                <CaseCard {...(item as any)} />
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.casesList}
            />
          </View>
        )}
      </ScrollView>

      {/* Fixed bottom CTA */}
      <View style={styles.bottomCta}>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => navigation.navigate("Booking", { consultantId, consultant: profile })}
        >
          <Text style={styles.bookButtonText}>预约顾问</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: DesignTokens.typography.sizes.xl, color: colors.textPrimary },
  headerTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  shareBtn: { padding: 8 },
  shareBtnText: { fontSize: DesignTokens.typography.sizes.base, color: colors.primary },
  profileHero: { alignItems: "center", paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarPlaceholderText: {
    color: colors.surface,
    fontSize: DesignTokens.typography.sizes["3xl"],
    fontWeight: "600",
  },
  studioName: {
    fontSize: DesignTokens.typography.sizes["2xl"],
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  specialtyRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  specialtyBadge: {
    backgroundColor: DesignTokens.colors.neutral[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  specialtyText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.primary },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingValue: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: colors.primary,
  },
  ratingLabel: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textSecondary },
  reviewCount: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textSecondary },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.backgroundTertiary,
    marginHorizontal: 16,
  },
  infoItem: { alignItems: "center" },
  infoValue: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  infoLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
    marginTop: 4,
  },
  infoDivider: { width: 1, backgroundColor: colors.backgroundTertiary },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  bioText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  casesList: { gap: 12 },
  bottomCta: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: colors.backgroundTertiary,
    backgroundColor: colors.surface,
  },
  bookButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  bookButtonText: {
    color: colors.surface,
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
  },
}));

export default AdvisorProfileScreen;

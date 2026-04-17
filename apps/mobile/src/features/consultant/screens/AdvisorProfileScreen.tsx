import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation, useFocusEffect, RouteProp, NavigationProp, ParamListBase } from "@react-navigation/native";
import { useConsultantStore } from '../../../stores/consultantStore';
import { CaseCard } from '../components/CaseCard';
import { consultantApi } from '../../../services/api/consultant.api';
import type { ConsultantProfile } from '../../../types/consultant';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DesignTokens , Spacing } from '../../../design-system/theme'
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

export const AdvisorProfileScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<ParamListBase>>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { currentConsultant, fetchConsultantById, isLoading } = useConsultantStore();
  const [cases, setCases] = useState<Record<string, unknown>[]>([]);

  const consultantId = route.params?.id;

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
        <ActivityIndicator size="large" color="colors.primary" />
      </View>
    );
  }

  const profile = "data" in currentConsultant ? (currentConsultant as unknown as { data: ConsultantProfile }).data : currentConsultant as unknown as ConsultantProfile;
  const specialties = Array.isArray(profile.specialties) ? profile.specialties : [];
  const bookingCount = profile.count?.bookings || 0;

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
            <FlatList
              horizontal
              data={cases}
              keyExtractor={(item: Record<string, unknown>) => String(item.bookingId)}
              renderItem={({ item }: { item: Record<string, unknown> }) => <CaseCard {...item as Record<string, unknown>} />}
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
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backBtn: { padding: Spacing.sm},
  backBtnText: { fontSize: DesignTokens.typography.sizes.xl, color: colors.textPrimary },
  headerTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600", color: "colors.textPrimary" },
  shareBtn: { padding: Spacing.sm},
  shareBtnText: { fontSize: DesignTokens.typography.sizes.base, color: "colors.primary" },
  profileHero: { alignItems: "center", paddingHorizontal: Spacing.lg, paddingTop: DesignTokens.spacing[3], paddingBottom: DesignTokens.spacing[5]},
  avatar: { width: Spacing['4xl'], height: Spacing['4xl'], borderRadius: 40, marginBottom: DesignTokens.spacing[3]},
  avatarPlaceholder: {
    width: Spacing['4xl'],
    height: Spacing['4xl'],
    borderRadius: 40,
    backgroundColor: "colors.primary",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: DesignTokens.spacing[3],
  },
  avatarPlaceholderText: { color: colors.surface, fontSize: DesignTokens.typography.sizes['3xl'], fontWeight: "600" },
  studioName: { fontSize: DesignTokens.typography.sizes['2xl'], fontWeight: "600", color: "colors.textPrimary", marginBottom: Spacing.sm},
  specialtyRow: { flexDirection: "row", flexWrap: "wrap", gap: DesignTokens.spacing['1.5'], marginBottom: DesignTokens.spacing[3]},
  specialtyBadge: {
    backgroundColor: DesignTokens.colors.neutral[50],
    paddingHorizontal: DesignTokens.spacing['2.5'],
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "colors.primaryLight",
  },
  specialtyText: { fontSize: DesignTokens.typography.sizes.sm, color: "colors.primary" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: DesignTokens.spacing['1.5']},
  ratingValue: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600", color: "colors.primary" },
  ratingLabel: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textSecondary },
  reviewCount: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textSecondary },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "colors.backgroundTertiary",
    marginHorizontal: Spacing.md,
  },
  infoItem: { alignItems: "center" },
  infoValue: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: colors.textPrimary },
  infoLabel: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textTertiary, marginTop: Spacing.xs},
  infoDivider: { width: 1, backgroundColor: "colors.backgroundTertiary" },
  section: { paddingHorizontal: Spacing.md, paddingTop: DesignTokens.spacing[5]},
  sectionTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600", color: "colors.textPrimary", marginBottom: DesignTokens.spacing[3]},
  bioText: { fontSize: DesignTokens.typography.sizes.base, color: DesignTokens.colors.text.secondary, lineHeight: 22 },
  casesList: { gap: DesignTokens.spacing[3]},
  bottomCta: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: "colors.backgroundTertiary",
    backgroundColor: colors.surface,
  },
  bookButton: {
    backgroundColor: "colors.primary",
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignItems: "center",
  },
  bookButtonText: { color: colors.surface, fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600" },
}))

export default AdvisorProfileScreen;

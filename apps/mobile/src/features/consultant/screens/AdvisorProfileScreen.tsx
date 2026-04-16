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
import { useConsultantStore } from "../../stores/consultantStore";
import { CaseCard } from "../../components/consultant/CaseCard";
import { consultantApi } from "../../services/api/consultant.api";
import type { ConsultantProfile } from "../../types/consultant";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DesignTokens } from "../../design-system/theme";

export const AdvisorProfileScreen: React.FC = () => {
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
        <ActivityIndicator size="large" color="#C67B5C" />
      </View>
    );
  }

  const profile = "data" in currentConsultant ? (currentConsultant as unknown as { data: ConsultantProfile }).data : currentConsultant as unknown as ConsultantProfile;
  const specialties = Array.isArray(profile.specialties) ? profile.specialties : [];
  const bookingCount = profile._count?.bookings || 0;

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DesignTokens.colors.backgrounds.primary },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 20, color: DesignTokens.colors.text.primary },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#1A1A1A" },
  shareBtn: { padding: 8 },
  shareBtnText: { fontSize: 14, color: "#C67B5C" },
  profileHero: { alignItems: "center", paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#C67B5C",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarPlaceholderText: { color: DesignTokens.colors.backgrounds.primary, fontSize: 32, fontWeight: "600" },
  studioName: { fontSize: 24, fontWeight: "600", color: "#1A1A1A", marginBottom: 8 },
  specialtyRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  specialtyBadge: {
    backgroundColor: "#FFF5F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0D5C8",
  },
  specialtyText: { fontSize: 13, color: "#C67B5C" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingValue: { fontSize: 18, fontWeight: "600", color: "#C67B5C" },
  ratingLabel: { fontSize: 13, color: DesignTokens.colors.text.secondary },
  reviewCount: { fontSize: 13, color: DesignTokens.colors.text.secondary },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F0F0F0",
    marginHorizontal: 16,
  },
  infoItem: { alignItems: "center" },
  infoValue: { fontSize: 16, fontWeight: "600", color: DesignTokens.colors.text.primary },
  infoLabel: { fontSize: 12, color: DesignTokens.colors.text.tertiary, marginTop: 4 },
  infoDivider: { width: 1, backgroundColor: "#F0F0F0" },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#1A1A1A", marginBottom: 12 },
  bioText: { fontSize: 15, color: "#555", lineHeight: 22 },
  casesList: { gap: 12 },
  bottomCta: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: DesignTokens.colors.backgrounds.primary,
  },
  bookButton: {
    backgroundColor: "#C67B5C",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  bookButtonText: { color: DesignTokens.colors.backgrounds.primary, fontSize: 18, fontWeight: "600" },
});

export default AdvisorProfileScreen;

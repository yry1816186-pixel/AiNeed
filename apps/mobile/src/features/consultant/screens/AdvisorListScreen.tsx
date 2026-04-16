import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useConsultantStore } from "../../stores/consultantStore";
import { ConsultantCard } from "../../components/consultant/ConsultantCard";
import { ServiceTypeChip } from "../../components/consultant/ServiceTypeChip";
import type { ServiceType } from "../../types/consultant";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ParamListBase } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DesignTokens } from "../../design-system/theme";

const SERVICE_TYPES = [
  { label: "全部", value: "" },
  { label: "整体形象改造", value: "styling_consultation" },
  { label: "场合造型", value: "special_event" },
  { label: "色彩诊断", value: "color_analysis" },
  { label: "日常搭配", value: "wardrobe_audit" },
];

export const AdvisorListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const { consultants, matchResults, isLoading, fetchConsultants, matchConsultants } =
    useConsultantStore();

  const [selectedFilter, setSelectedFilter] = useState("");
  const [showMatchSheet, setShowMatchSheet] = useState(false);
  const [matchServiceType, setMatchServiceType] = useState<ServiceType>("styling_consultation");
  const [matchNotes, setMatchNotes] = useState("");
  const [matchResultsView, setMatchResultsView] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void fetchConsultants({ specialty: selectedFilter || undefined });
    }, [fetchConsultants, selectedFilter])
  );

  const handleMatch = async () => {
    await matchConsultants({
      serviceType: matchServiceType,
      notes: matchNotes,
      preferOnline: true,
    });
    setMatchResultsView(true);
    setShowMatchSheet(false);
  };

  const displayData = matchResultsView ? matchResults : consultants;

  const renderFilterBar = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
      {SERVICE_TYPES.map((type) => (
        <ServiceTypeChip
          key={type.value}
          label={type.label}
          selected={selectedFilter === type.value}
          onPress={() => {
            setSelectedFilter(type.value);
            setMatchResultsView(false);
          }}
        />
      ))}
    </ScrollView>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>暂无匹配顾问</Text>
      <Text style={styles.emptySubtitle}>提交你的需求，获取智能推荐</Text>
      <TouchableOpacity style={styles.matchCta} onPress={() => setShowMatchSheet(true)}>
        <Text style={styles.matchCtaText}>提交需求</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading && displayData.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C67B5C" />
        <Text style={styles.loadingText}>正在加载顾问列表...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>私人顾问</Text>
        <TouchableOpacity style={styles.matchButton} onPress={() => setShowMatchSheet(true)}>
          <Text style={styles.matchButtonText}>智能匹配</Text>
        </TouchableOpacity>
      </View>

      {/* Filter bar */}
      {renderFilterBar()}

      {/* Match results indicator */}
      {matchResultsView && (
        <View style={styles.matchResultsBar}>
          <Text style={styles.matchResultsText}>为你推荐 {matchResults.length} 位顾问</Text>
          <TouchableOpacity onPress={() => setMatchResultsView(false)}>
            <Text style={styles.clearMatchText}>清除</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Consultant list */}
      <FlatList
        data={displayData}
        keyExtractor={(item: Record<string, unknown>) => String(item.consultantId || item.id)}
        renderItem={({ item, index }: { item: Record<string, unknown>; index: number }) => (
          <ConsultantCard
            id={String(item.consultantId || item.id)}
            studioName={String(item.studioName || "造型顾问")}
            avatar={(item.avatar || (item.user as Record<string, unknown> | undefined)?.avatar || null) as string | null}
            specialties={(item.specialties || []) as string[]}
            rating={(item.rating || 0) as number}
            reviewCount={(item.reviewCount || 0) as number}
            matchPercentage={item.matchPercentage as number | undefined}
            matchReasons={item.matchReasons as string[] | undefined}
            price={item.price as number | undefined}
            onPress={() =>
              navigation.navigate("AdvisorProfile", {
                id: String(item.consultantId || item.id),
              })
            }
            index={index}
          />
        )}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshing={isLoading}
        onRefresh={() => fetchConsultants({ specialty: selectedFilter || undefined })}
      />

      {/* Match bottom sheet */}
      {showMatchSheet && (
        <View style={styles.overlay}>
          <View style={styles.bottomSheet}>
            <Text style={styles.sheetTitle}>提交你的需求</Text>
            <Text style={styles.sheetLabel}>选择服务类型</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {SERVICE_TYPES.filter((t) => t.value).map((type) => (
                <ServiceTypeChip
                  key={type.value}
                  label={type.label}
                  selected={matchServiceType === type.value}
                  onPress={() => setMatchServiceType(type.value as ServiceType)}
                />
              ))}
            </ScrollView>
            <Text style={styles.sheetLabel}>特殊要求</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="如：希望擅长职场穿搭的顾问"
              value={matchNotes}
              onChangeText={setMatchNotes}
              multiline
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowMatchSheet(false)}>
                <Text style={styles.sheetCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetSubmit} onPress={handleMatch}>
                <Text style={styles.sheetSubmitText}>开始匹配</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF8" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: DesignTokens.colors.backgrounds.primary,
  },
  headerTitle: { fontSize: 24, fontWeight: "600", color: "#1A1A1A" },
  matchButton: {
    backgroundColor: "#C67B5C",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  matchButtonText: { color: DesignTokens.colors.backgrounds.primary, fontSize: 14, fontWeight: "500" },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  matchResultsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFF5F0",
  },
  matchResultsText: { fontSize: 13, color: "#C67B5C" },
  clearMatchText: { fontSize: 13, color: DesignTokens.colors.text.tertiary },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: DesignTokens.colors.text.primary, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: DesignTokens.colors.text.secondary, marginBottom: 24 },
  matchCta: {
    backgroundColor: "#C67B5C",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  matchCtaText: { color: DesignTokens.colors.backgrounds.primary, fontSize: 16, fontWeight: "500" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 14, color: DesignTokens.colors.text.secondary, marginTop: 12 },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  sheetTitle: { fontSize: 20, fontWeight: "600", color: "#1A1A1A", marginBottom: 20 },
  sheetLabel: { fontSize: 14, color: DesignTokens.colors.text.secondary, marginBottom: 8, marginTop: 12 },
  notesInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  sheetActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  sheetCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  sheetCancelText: { fontSize: 16, color: DesignTokens.colors.text.secondary },
  sheetSubmit: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#C67B5C",
    alignItems: "center",
  },
  sheetSubmitText: { fontSize: 16, color: DesignTokens.colors.backgrounds.primary, fontWeight: "500" },
});

export default AdvisorListScreen;

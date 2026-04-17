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
import { useFocusEffect, useNavigation, ParamListBase } from '@react-navigation/native';
import { useConsultantStore } from '../../../stores/consultantStore';
import { ConsultantCard } from '../components/ConsultantCard';
import { ServiceTypeChip } from '../components/ServiceTypeChip';
import type { ServiceType } from '../../../types/consultant';
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DesignTokens, Spacing } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

const SERVICE_TYPES = [
  { label: "全部", value: "" },
  { label: "整体形象改造", value: "styling_consultation" },
  { label: "场合造型", value: "special_event" },
  { label: "色彩诊断", value: "color_analysis" },
  { label: "日常搭配", value: "wardrobe_audit" },
];

export const AdvisorListScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
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
        <ActivityIndicator size="large" color="colors.primary" />
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

const useStyles = createStyles((colors) => ({
  container: { flex: 1, backgroundColor: "colors.backgroundSecondary" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: DesignTokens.spacing[3],
    backgroundColor: colors.surface,
  },
  headerTitle: { fontSize: DesignTokens.typography.sizes['2xl'], fontWeight: "600", color: "colors.textPrimary" },
  matchButton: {
    backgroundColor: "colors.primary",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  matchButtonText: { color: colors.surface, fontSize: DesignTokens.typography.sizes.base, fontWeight: "500" },
  filterBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: "colors.backgroundTertiary",
  },
  matchResultsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: DesignTokens.colors.neutral[50],
  },
  matchResultsText: { fontSize: DesignTokens.typography.sizes.sm, color: "colors.primary" },
  clearMatchText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textTertiary },
  listContent: { paddingHorizontal: Spacing.md, paddingTop: DesignTokens.spacing[3], paddingBottom: Spacing.lg},
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing['4xl'],
  },
  emptyTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600", color: colors.textPrimary, marginBottom: Spacing.sm},
  emptySubtitle: { fontSize: DesignTokens.typography.sizes.base, color: colors.textSecondary, marginBottom: Spacing.lg},
  matchCta: {
    backgroundColor: "colors.primary",
    paddingHorizontal: Spacing.lg,
    paddingVertical: DesignTokens.spacing[3],
    borderRadius: 24,
  },
  matchCtaText: { color: colors.surface, fontSize: DesignTokens.typography.sizes.md, fontWeight: "500" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textSecondary, marginTop: DesignTokens.spacing[3]},
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
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.lg,
    paddingBottom: DesignTokens.spacing[10],
  },
  sheetTitle: { fontSize: DesignTokens.typography.sizes.xl, fontWeight: "600", color: "colors.textPrimary", marginBottom: DesignTokens.spacing[5]},
  sheetLabel: { fontSize: DesignTokens.typography.sizes.base, color: colors.textSecondary, marginBottom: Spacing.sm, marginTop: DesignTokens.spacing[3]},
  notesInput: {
    borderWidth: 1,
    borderColor: "colors.border",
    borderRadius: 12,
    padding: DesignTokens.spacing[3],
    fontSize: DesignTokens.typography.sizes.base,
    minHeight: Spacing['4xl'],
    textAlignVertical: "top",
  },
  sheetActions: { flexDirection: "row", gap: DesignTokens.spacing[3], marginTop: Spacing.lg},
  sheetCancel: {
    flex: 1,
    paddingVertical: DesignTokens.spacing['3.5'],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "colors.border",
    alignItems: "center",
  },
  sheetCancelText: { fontSize: DesignTokens.typography.sizes.md, color: colors.textSecondary },
  sheetSubmit: {
    flex: 1,
    paddingVertical: DesignTokens.spacing['3.5'],
    borderRadius: 12,
    backgroundColor: "colors.primary",
    alignItems: "center",
  },
  sheetSubmitText: { fontSize: DesignTokens.typography.sizes.md, color: colors.surface, fontWeight: "500" },
}))

export default AdvisorListScreen;

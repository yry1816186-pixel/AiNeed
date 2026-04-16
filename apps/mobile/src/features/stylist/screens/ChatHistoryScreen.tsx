import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useTheme, createStyles } from 'undefined';
import { useAiStylistStore, type ArchivedSession } from '../stores/aiStylistStore';
import type { StylistStackParamList } from '../../../navigation/types';
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";

type StylistNavigation = NativeStackNavigationProp<StylistStackParamList>;

export const ChatHistoryScreen: React.FC = () => {
  const navigation = useNavigation<StylistNavigation>();
  const { archivedSessions, isLoading, fetchArchivedSessions } = useAiStylistStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    void fetchArchivedSessions(selectedDate);
  }, [selectedDate, fetchArchivedSessions]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchArchivedSessions(selectedDate);
    setRefreshing(false);
  }, [selectedDate, fetchArchivedSessions]);

  const handleSessionPress = useCallback(
    (session: ArchivedSession) => {
      if (session.hasOutfitPlan) {
        navigation.navigate("OutfitPlan", { planId: session.id });
      } else {
        navigation.navigate("AiStylistChat", { sessionId: session.id });
      }
    },
    [navigation]
  );

  const formatDate = (dateStr: string) => {
    const { colors } = useTheme();
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) {
      return "Today";
    }
    if (days === 1) {
      return "Yesterday";
    }
    if (days < 7) {
      return `${days} days ago`;
    }
    return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  };

  const renderItem = useCallback(
    ({ item }: { item: ArchivedSession }) => (
      <TouchableOpacity
        style={s.sessionCard}
        onPress={() => handleSessionPress(item)}
        activeOpacity={0.7}
      >
        <View style={s.sessionIcon}>
          <Ionicons
            name={item.hasOutfitPlan ? "shirt" : "chatbubble-ellipses"}
            size={20}
            color={colors.primary}
          />
        </View>
        <View style={s.sessionInfo}>
          <Text style={s.sessionGoal} numberOfLines={1}>
            {item.goal || "AI Stylist Conversation"}
          </Text>
          <Text style={s.sessionTime}>{formatTime(item.createdAt)}</Text>
        </View>
        <View style={s.sessionMeta}>
          {item.hasOutfitPlan && (
            <View style={s.outfitBadge}>
              <Text style={s.outfitBadgeText}>Outfit</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
    ),
    [handleSessionPress]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={s.centerContent}>
        <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
        <Text style={s.emptyTitle}>No conversations yet</Text>
        <Text style={s.emptySubtitle}>Your AI Stylist chat history will appear here</Text>
        <TouchableOpacity
          style={s.startBtn}
          onPress={() => navigation.navigate("AIStylist")}
        >
          <Text style={s.startBtnText}>Start a conversation</Text>
        </TouchableOpacity>
      </View>
    ),
    [navigation]
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Chat History</Text>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.navigate("SessionCalendar")}
        >
          <Ionicons name="calendar-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Date selector */}
      <View style={s.dateRow}>
        <TouchableOpacity
          onPress={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() - 1);
            setSelectedDate(d.toISOString().split("T")[0]);
          }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={s.dateText}>{formatDate(selectedDate)}</Text>
        <TouchableOpacity
          onPress={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() + 1);
            const today = new Date().toISOString().split("T")[0];
            if (d.toISOString().split("T")[0] <= today) {
              setSelectedDate(d.toISOString().split("T")[0]);
            }
          }}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading && archivedSessions.length === 0 ? (
        <View style={s.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={archivedSessions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={
            archivedSessions.length === 0 ? { flex: 1 } : { paddingBottom: 24 }
          }
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "700", color: colors.text },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  dateText: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: colors.text },
  centerContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600", color: colors.textPrimary, marginTop: 16 },
  emptySubtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textTertiary,
    marginTop: 8,
    textAlign: "center",
  },
  startBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  startBtnText: { color: colors.surface, fontSize: DesignTokens.typography.sizes.base, fontWeight: "600" },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.subtleBg,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionInfo: { flex: 1, marginLeft: 12 },
  sessionGoal: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "500", color: colors.text },
  sessionTime: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textTertiary, marginTop: 2 },
  sessionMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  outfitBadge: {
    backgroundColor: colors.subtleBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  outfitBadgeText: { fontSize: DesignTokens.typography.sizes.xs, fontWeight: "600", color: colors.primary },
});

export default ChatHistoryScreen;

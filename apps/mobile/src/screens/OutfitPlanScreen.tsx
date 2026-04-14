import React, { useCallback, useEffect, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { theme } from '../theme';
import { useAiStylistStore, type OutfitPlanDetail } from '../stores/aiStylistStore';
import type { StylistStackParamList } from '../navigation/types';

type OutfitPlanRoute = RouteProp<StylistStackParamList, 'OutfitPlan'>;

const SCREEN_WIDTH = Dimensions.get('window').width;

export const OutfitPlanScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<OutfitPlanRoute>();
  const planId = route.params?.planId;

  const {
    currentOutfitPlan,
    isLoading,
    error,
    fetchOutfitPlan,
    currentSessionId,
  } = useAiStylistStore();

  const [refreshing, setRefreshing] = useState(false);

  const sessionId = planId ?? currentSessionId;

  useEffect(() => {
    if (sessionId) {
      fetchOutfitPlan(sessionId);
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
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Outfit Plan</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
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
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Outfit Plan</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textTertiary} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => sessionId && fetchOutfitPlan(sessionId)}>
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
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Outfit Plan</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.centerContent}>
          <Ionicons name="shirt-outline" size={48} color={theme.colors.textTertiary} />
          <Text style={s.emptyTitle}>No outfit plan yet</Text>
          <Text style={s.emptySubtitle}>Start a conversation with AI Stylist to generate a plan</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Outfit Plan</Text>
        <TouchableOpacity style={s.backBtn}>
          <Ionicons name="share-outline" size={22} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
        }
      >
        {/* Summary section */}
        <View style={s.summaryCard}>
          <Text style={s.summaryTitle}>{currentOutfitPlan.lookSummary}</Text>
          {currentOutfitPlan.whyItFits.length > 0 && (
            <View style={s.reasonsContainer}>
              {currentOutfitPlan.whyItFits.map((reason, idx) => (
                <View key={idx} style={s.reasonChip}>
                  <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
                  <Text style={s.reasonText}>{reason}</Text>
                </View>
              ))}
            </View>
          )}
          {currentOutfitPlan.weatherInfo && (
            <View style={s.weatherRow}>
              <Ionicons name="partly-sunny-outline" size={16} color={theme.colors.amber} />
              <Text style={s.weatherText}>
                {currentOutfitPlan.weatherInfo.temperature}C - {currentOutfitPlan.weatherInfo.suggestion}
              </Text>
            </View>
          )}
        </View>

        {/* Outfit cards */}
        {currentOutfitPlan.outfits.map((outfit, outfitIdx) => (
          <View key={outfitIdx} style={s.outfitCard}>
            <View style={s.outfitHeader}>
              <Text style={s.outfitTitle}>{outfit.title}</Text>
              {outfit.estimatedTotalPrice != null && (
                <Text style={s.outfitPrice}>~{outfit.estimatedTotalPrice} CNY</Text>
              )}
            </View>
            <View style={s.itemsGrid}>
              {outfit.items.map((item, itemIdx) => (
                <TouchableOpacity key={itemIdx} style={s.itemCard}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={s.itemImage} resizeMode="cover" />
                  ) : (
                    <View style={s.itemImagePlaceholder}>
                      <Ionicons name="shirt-outline" size={24} color={theme.colors.textTertiary} />
                    </View>
                  )}
                  <Text style={s.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.itemCategory}>{item.category}</Text>
                  {item.price != null && (
                    <Text style={s.itemPrice}>{item.price} CNY</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {outfit.styleExplanation.length > 0 && (
              <View style={s.explanationRow}>
                <Ionicons name="information-circle-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={s.explanationText} numberOfLines={2}>
                  {outfit.styleExplanation.join('. ')}
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
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  loadingText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 12 },
  errorText: { fontSize: 14, color: theme.colors.error, marginTop: 12, textAlign: 'center' },
  retryBtn: {
    marginTop: 16, backgroundColor: theme.colors.primary,
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20,
  },
  retryBtnText: { color: theme.colors.surface, fontSize: 14, fontWeight: '600' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: theme.colors.textTertiary, marginTop: 8, textAlign: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  summaryCard: {
    backgroundColor: theme.colors.surface, borderRadius: 16,
    padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  summaryTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, lineHeight: 24 },
  reasonsContainer: { marginTop: 12, gap: 6 },
  reasonChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reasonText: { fontSize: 13, color: theme.colors.textSecondary, flex: 1 },
  weatherRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  weatherText: { fontSize: 13, color: theme.colors.textSecondary },
  outfitCard: {
    backgroundColor: theme.colors.surface, borderRadius: 16,
    padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  outfitHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  outfitTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  outfitPrice: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  itemsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  itemCard: {
    width: (SCREEN_WIDTH - 64) / 3,
    backgroundColor: theme.colors.background, borderRadius: 12,
    padding: 8, alignItems: 'center',
  },
  itemImage: { width: '100%', height: 80, borderRadius: 8, backgroundColor: theme.colors.placeholderBg },
  itemImagePlaceholder: {
    width: '100%', height: 80, borderRadius: 8,
    backgroundColor: theme.colors.subtleBg, alignItems: 'center', justifyContent: 'center',
  },
  itemName: { fontSize: 12, fontWeight: '500', color: theme.colors.text, marginTop: 6, width: '100%' },
  itemCategory: { fontSize: 10, color: theme.colors.textTertiary, marginTop: 2 },
  itemPrice: { fontSize: 11, fontWeight: '600', color: theme.colors.primary, marginTop: 2 },
  explanationRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: theme.colors.divider,
  },
  explanationText: { fontSize: 12, color: theme.colors.textSecondary, flex: 1, lineHeight: 18 },
});

export default OutfitPlanScreen;

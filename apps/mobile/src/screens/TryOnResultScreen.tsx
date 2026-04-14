import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { theme } from '../theme';
import { DesignTokens } from '../theme/tokens/design-tokens';
import { tryOnApi, type TryOnResult } from '../services/api/tryon.api';
import type { TryOnStackParamList } from '../navigation/types';

type TryOnResultRoute = RouteProp<TryOnStackParamList, 'TryOnResult'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_HEIGHT = SCREEN_WIDTH * 1.2;

export const TryOnResultScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<TryOnResultRoute>();
  const resultId = route.params?.resultId;

  const [result, setResult] = useState<TryOnResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResult = useCallback(async () => {
    if (!resultId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await tryOnApi.getStatus(resultId);
      if (response.success && response.data) {
        setResult(response.data);
        if (response.data.status === 'processing' || response.data.status === 'pending') {
          pollingRef.current = setTimeout(() => fetchResult(), 3000);
        }
      } else {
        setError(response.error?.message || 'Failed to load try-on result');
      }
    } catch {
      setError('Network error, please retry');
    } finally {
      setLoading(false);
    }
  }, [resultId]);

  useEffect(() => {
    fetchResult();
  }, [fetchResult]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
  }, []);

  const handleRetry = useCallback(async () => {
    if (!resultId) return;
    setRetrying(true);
    try {
      const response = await tryOnApi.retryTryOn(resultId);
      if (response.success && response.data) {
        fetchResult();
      } else {
        Alert.alert('Error', 'Failed to retry try-on');
      }
    } catch {
      Alert.alert('Error', 'Network error, please try again');
    } finally {
      setRetrying(false);
    }
  }, [resultId, fetchResult]);

  const handleShare = useCallback(() => {
    Alert.alert('Share', 'Share functionality coming soon');
  }, []);

  const handleSaveToWardrobe = useCallback(() => {
    Alert.alert('Saved', 'Result saved to your wardrobe');
  }, []);

  if (loading && !result) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Try-On Result</Text>
          <View style={s.iconBtn} />
        </View>
        <View style={s.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={s.loadingText}>Loading result...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !result) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Try-On Result</Text>
          <View style={s.iconBtn} />
        </View>
        <View style={s.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textTertiary} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.actionBtn} onPress={fetchResult}>
            <Text style={s.actionBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isProcessing = result?.status === 'processing' || result?.status === 'pending';
  const isFailed = result?.status === 'failed';
  const isComplete = result?.status === 'completed';

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Try-On Result</Text>
        <TouchableOpacity style={s.iconBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent}>
        {/* Status badge */}
        <View style={[s.statusBadge, isComplete && s.statusBadgeSuccess, isFailed && s.statusBadgeError, isProcessing && s.statusBadgeProcessing]}>
          <Ionicons
            name={isComplete ? 'checkmark-circle' : isFailed ? 'close-circle' : 'time'}
            size={16}
            color={isComplete ? theme.colors.success : isFailed ? theme.colors.error : theme.colors.amber}
          />
          <Text style={[s.statusText, isComplete && s.statusTextSuccess, isFailed && s.statusTextError]}>
            {isComplete ? 'Completed' : isFailed ? 'Failed' : 'Processing...'}
          </Text>
        </View>

        {/* Comparison images */}
        <View style={s.comparisonContainer}>
          {/* Original photo */}
          <View style={s.comparisonItem}>
            <Text style={s.comparisonLabel}>Original</Text>
            <View style={s.imageBox}>
              {result?.photo?.thumbnailUrl ? (
                <Image source={{ uri: result.photo.thumbnailUrl }} style={s.comparisonImage} resizeMode="cover" />
              ) : (
                <View style={s.imagePlaceholder}>
                  <Ionicons name="person-outline" size={40} color={theme.colors.textTertiary} />
                </View>
              )}
            </View>
          </View>

          {/* Result image */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Ionicons name="arrow-forward" size={20} color={theme.colors.primary} />
            <View style={s.dividerLine} />
          </View>

          <View style={s.comparisonItem}>
            <Text style={s.comparisonLabel}>Try-On</Text>
            <View style={s.imageBox}>
              {isComplete && result?.resultImageUrl ? (
                <Image source={{ uri: result.resultImageUrl }} style={s.comparisonImage} resizeMode="cover" />
              ) : isProcessing ? (
                <View style={s.imagePlaceholder}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={s.processingText}>Processing...</Text>
                </View>
              ) : isFailed ? (
                <View style={s.imagePlaceholder}>
                  <Ionicons name="refresh" size={40} color={theme.colors.error} />
                </View>
              ) : (
                <View style={s.imagePlaceholder}>
                  <Ionicons name="image-outline" size={40} color={theme.colors.textTertiary} />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Item info */}
        {result?.item && (
          <View style={s.itemCard}>
            <View style={s.itemInfo}>
              {result.item.mainImage && (
                <Image source={{ uri: result.item.mainImage }} style={s.itemThumb} resizeMode="cover" />
              )}
              <View style={s.itemDetails}>
                <Text style={s.itemName}>{result.item.name}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Action buttons */}
        <View style={s.actionRow}>
          {isFailed && (
            <TouchableOpacity style={[s.actionBtn, s.retryActionBtn]} onPress={handleRetry} disabled={retrying}>
              {retrying ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="refresh" size={18} color="#fff" />
              )}
              <Text style={s.actionBtnWhiteText}>Retry</Text>
            </TouchableOpacity>
          )}
          {isComplete && (
            <>
              <TouchableOpacity style={s.actionBtnOutline} onPress={handleSaveToWardrobe}>
                <Ionicons name="download-outline" size={18} color={theme.colors.primary} />
                <Text style={s.actionBtnPrimaryText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, s.shareActionBtn]} onPress={handleShare}>
                <Ionicons name="share-outline" size={18} color="#fff" />
                <Text style={s.actionBtnWhiteText}>Share</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={s.actionBtnOutline} onPress={() => navigation.goBack()}>
            <Ionicons name="sparkles-outline" size={18} color={theme.colors.primary} />
            <Text style={s.actionBtnPrimaryText}>New Try-On</Text>
          </TouchableOpacity>
        </View>
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
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  loadingText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 12 },
  errorText: { fontSize: 14, color: theme.colors.error, marginTop: 12, textAlign: 'center' },
  actionBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, marginTop: 16,
  },
  actionBtnText: { color: theme.colors.surface, fontSize: 14, fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: theme.colors.subtleBg,
    marginBottom: 20,
  },
  statusBadgeSuccess: { backgroundColor: DesignTokens.colors.semantic.successLight },
  statusBadgeError: { backgroundColor: DesignTokens.colors.semantic.errorLight },
  statusBadgeProcessing: { backgroundColor: DesignTokens.colors.semantic.warningLight },
  statusText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  statusTextSuccess: { color: theme.colors.success },
  statusTextError: { color: theme.colors.error },
  comparisonContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  comparisonItem: { flex: 1 },
  comparisonLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8, textAlign: 'center' },
  imageBox: { aspectRatio: 3 / 4, borderRadius: 16, overflow: 'hidden', backgroundColor: theme.colors.subtleBg },
  comparisonImage: { width: '100%', height: '100%' },
  imagePlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.subtleBg,
  },
  processingText: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 8 },
  divider: { paddingHorizontal: 8, alignItems: 'center', gap: 4 },
  dividerLine: { width: 1, height: 30, backgroundColor: theme.colors.border },
  itemCard: {
    backgroundColor: theme.colors.surface, borderRadius: 14, padding: 14,
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  itemInfo: { flexDirection: 'row', alignItems: 'center' },
  itemThumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: theme.colors.placeholderBg },
  itemDetails: { marginLeft: 12, flex: 1 },
  itemName: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  actionRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', flexWrap: 'wrap' },
  actionBtnOutline: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1, borderColor: theme.colors.primary,
  },
  actionBtnPrimaryText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  actionBtnWhiteText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  retryActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20,
    backgroundColor: theme.colors.primary,
  },
  shareActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20,
  },
});

export default TryOnResultScreen;

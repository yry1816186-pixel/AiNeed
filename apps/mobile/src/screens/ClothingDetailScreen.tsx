import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions, Platform, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { LinearGradient } from '@/src/polyfills/expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from '@/src/polyfills/expo-haptics';
import { clothingApi } from '../services/api/clothing.api';
import type { RootStackParamList } from '../types/navigation';
import type { ClothingItem, ClothingCategory, ClothingStyle, Season, Occasion } from '../types/clothing';
import { CATEGORY_LABELS, STYLE_LABELS, SEASON_LABELS, OCCASION_LABELS } from '../types/clothing';

// 引入增强主题令牌
import { colors } from '../theme/tokens/colors';
import { typography } from '../theme/tokens/typography';
import { spacing } from '../theme/tokens/spacing';
import { shadows } from '../theme/tokens/shadows';
import { theme } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ClothingDetailRouteProp = RouteProp<RootStackParamList, 'ClothingDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const InfoChip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoChip}>
    <Text style={styles.infoChipLabel}>{label}</Text>
    <Text style={styles.infoChipValue}>{value}</Text>
  </View>
);

export const ClothingDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ClothingDetailRouteProp>();
  const { clothingId } = route.params;

  const [item, setItem] = useState<ClothingItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItem = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await clothingApi.getById(clothingId);
      if (response.success && response.data) {
        setItem(response.data);
      } else {
        const errorMsg = typeof response.error === 'string'
          ? response.error
          : response.error?.message || '加载失败';
        setError(errorMsg);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '网络错误，请重试';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [clothingId]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  const handleDelete = useCallback(() => {
    Alert.alert('确认删除', '确定要删除这件服装吗？此操作不可撤销。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await clothingApi.delete(clothingId);
            if (response.success) {
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync('success');
              }
              navigation.goBack();
            } else {
              const errorMsg = typeof response.error === 'string'
                ? response.error
                : response.error?.message || '请稍后重试';
              Alert.alert('删除失败', errorMsg);
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : '网络错误，请重试';
            Alert.alert('删除失败', message);
          }
        },
      },
    ]);
  }, [clothingId, navigation]);

  const handleToggleFavorite = useCallback(async () => {
    if (!item) return;
    try {
      const response = await clothingApi.toggleFavorite(clothingId);
      if (response.success && response.data) {
        setItem(response.data);
        if (Platform.OS !== 'web') {
          Haptics.impactAsync('light');
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '请稍后重试';
      Alert.alert('操作失败', message);
    }
  }, [clothingId, item]);

  const handleEdit = useCallback(() => {
    navigation.navigate('AddClothing', { editId: clothingId });
  }, [navigation, clothingId]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.primary} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name='alert-circle-outline' size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>{error || '未找到服装'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadItem} accessibilityLabel="重试加载">
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const categoryLabel = CATEGORY_LABELS[item.category as ClothingCategory] || item.category;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityLabel="返回">
          <Ionicons name='arrow-back' size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>服装详情</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleToggleFavorite} accessibilityLabel={item.isFavorite ? '取消收藏' : '添加收藏'}>
            <Ionicons
              name={item.isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={item.isFavorite ? theme.colors.error : theme.colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleEdit} accessibilityLabel="编辑服装">
            <Ionicons name='create-outline' size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.springify()} style={styles.imageSection}>
          {item.imageUri ? (
            <Image source={{ uri: item.imageUri }} style={styles.mainImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name='shirt-outline' size={80} color={theme.colors.textTertiary} />
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.infoSection}>
          <Text style={styles.itemName}>{item.name || '未命名服装'}</Text>
          {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}

          <View style={styles.chipContainer}>
            <InfoChip label='分类' value={categoryLabel} />
            {item.color && <InfoChip label='颜色' value={item.color} />}
            {item.size && <InfoChip label='尺码' value={item.size} />}
          </View>

          {item.style && item.style.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>风格</Text>
              <View style={styles.tagContainer}>
                {item.style.map((s: ClothingStyle, index: number) => {
                  const styleLabel = STYLE_LABELS[s as keyof typeof STYLE_LABELS] || s;
                  return (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{styleLabel}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {item.seasons && item.seasons.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>季节</Text>
              <View style={styles.tagContainer}>
                {item.seasons.map((s: Season, index: number) => {
                  const seasonLabel = SEASON_LABELS[s as keyof typeof SEASON_LABELS] || s;
                  return (
                    <View key={index} style={[styles.tag, styles.seasonTag]}>
                      <Text style={styles.tagText}>{seasonLabel}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {item.occasions && item.occasions.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>场合</Text>
              <View style={styles.tagContainer}>
                {item.occasions.map((o: Occasion, index: number) => {
                  const occasionLabel = OCCASION_LABELS[o as keyof typeof OCCASION_LABELS] || o;
                  return (
                    <View key={index} style={[styles.tag, styles.occasionTag]}>
                      <Text style={styles.tagText}>{occasionLabel}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {item.notes && (
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>备注</Text>
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          )}

          <View style={styles.statsSection}>
            <View style={styles.statItem}>
              <Ionicons name='repeat-outline' size={20} color={theme.colors.textSecondary} />
              <Text style={styles.statText}>穿着 {item.wearCount} 次</Text>
            </View>
            {item.lastWorn && (
              <View style={styles.statItem}>
                <Ionicons name='calendar-outline' size={20} color={theme.colors.textSecondary} />
                <Text style={styles.statText}>最近穿着: {new Date(item.lastWorn).toLocaleDateString()}</Text>
              </View>
            )}
          </View>
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} accessibilityLabel="删除服装">
          <Ionicons name='trash-outline' size={20} color={theme.colors.error} />
          <Text style={styles.deleteButtonText}>删除</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editButton} onPress={handleEdit} accessibilityLabel="编辑服装">
          <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.editButtonGradient} />
          <Text style={styles.editButtonText}>编辑</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F3F4', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text },
  headerActions: { flexDirection: 'row', gap: 12 },
  actionButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F3F4', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  imageSection: { backgroundColor: theme.colors.surface },
  mainImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.2, resizeMode: 'cover' },
  placeholderImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.2, backgroundColor: '#F1F3F4', alignItems: 'center', justifyContent: 'center' },
  infoSection: { backgroundColor: theme.colors.surface, marginTop: 16, padding: 20 },
  itemName: { fontSize: 24, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  itemBrand: { fontSize: 16, color: theme.colors.textSecondary, marginBottom: 16 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  infoChip: { backgroundColor: '#F1F3F4', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  infoChipLabel: { fontSize: 12, color: theme.colors.textTertiary, marginBottom: 2 },
  infoChipValue: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  detailSection: { marginBottom: 20 },
  detailTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 12 },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#EEF2FF', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  seasonTag: { backgroundColor: '#ECFDF5' },
  occasionTag: { backgroundColor: '#FEF3C7' },
  tagText: { fontSize: 14, color: theme.colors.primary },
  notesText: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 22 },
  statsSection: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statText: { fontSize: 14, color: theme.colors.textSecondary },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, color: theme.colors.textSecondary, marginTop: 12 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  errorText: { fontSize: 16, color: theme.colors.textSecondary, marginTop: 12, textAlign: 'center' },
  retryButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  retryButtonText: { fontSize: 16, fontWeight: '500', color: theme.colors.surface },
  bottomSpacer: { height: 100 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 12, padding: 20, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border },
  deleteButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.error },
  deleteButtonText: { fontSize: 16, fontWeight: '500', color: theme.colors.error },
  editButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, overflow: 'hidden' },
  editButtonGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  editButtonText: { fontSize: 16, fontWeight: '600', color: theme.colors.surface },
});

export default ClothingDetailScreen;

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { LinearGradient } from '@/src/polyfills/expo-linear-gradient';
import { recommendationsApi, type RecommendedItem } from '../services/api/tryon.api';
import apiClient from '../services/api/client';
import { useAuthStore } from '../stores/index';
import { useProfileStore } from '../stores/profileStore';
import type { RootStackParamList } from '../types/navigation';
import { withErrorBoundary } from '../components/ErrorBoundary';
import { ImageWithPlaceholder } from '../components/common';
import { ProfileCompletenessBar } from '../components/profile/ProfileCompletenessBar';
import { theme, Colors } from '../theme';

const HORIZONTAL_PADDING = 20;

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

interface HomeData {
  recommendations: RecommendedItem[];
}

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const authToken = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [data, setData] = useState<HomeData>({
    recommendations: [],
  });
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [refreshing, setRefreshing] = useState(false);

  const { completeness, loadCompleteness } = useProfileStore();

  const displayName = user?.nickname || user?.email?.split('@')[0] || 'Maya';

  const fetchData = useCallback(async () => {
    if (!authToken || !isAuthenticated) {
      return;
    }

    try {
      await apiClient.setToken(authToken);
      const recsRes = await recommendationsApi.getPersonalized({ limit: 10 });
      const recommendations = recsRes.success && recsRes.data ? recsRes.data : [];
      setData({ recommendations });
      setLoadingState('success');
    } catch {
      setLoadingState('error');
    }
  }, [authToken, isAuthenticated]);

  useEffect(() => {
    if (!authToken || !isAuthenticated) {
      return;
    }
    setLoadingState('loading');
    void fetchData();
    void loadCompleteness();
  }, [authToken, fetchData, isAuthenticated, loadCompleteness]);

  const handleRefresh = useCallback(async () => {
    if (!authToken || !isAuthenticated) {
      return;
    }
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [authToken, fetchData, isAuthenticated]);

  // 使用 useMemo 缓存静态数据，避免每次渲染重新创建
  const dailyRecs = useMemo(() => [
    {
      id: '1',
      title: 'Date Night',
      image: 'https://images.unsplash.com/photo-1518577915332-c2a19f149a75?w=400&h=500&fit=crop',
    },
    {
      id: '2',
      title: 'Work Style',
      image: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=400&h=500&fit=crop',
    },
    {
      id: '3',
      title: 'Casual',
      image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&h=500&fit=crop',
    },
  ], []);

  // 使用 useCallback 缓存导航回调，避免子组件不必要的重渲染
  const handleSearchPress = useCallback(() => {
    navigation.navigate('Explore');
  }, [navigation]);

  const handleClosetPress = useCallback(() => {
    navigation.navigate('Wardrobe');
  }, [navigation]);

  const handleAiStylistPress = useCallback(() => {
    navigation.navigate('AiStylist');
  }, [navigation]);

  const handleVirtualTryOnPress = useCallback(() => {
    navigation.navigate('VirtualTryOn', {});
  }, [navigation]);

  const handleRecommendationPress = useCallback((id: string) => {
    navigation.navigate('RecommendationDetail', { recommendationId: id });
  }, [navigation]);

  const handleHeartPress = useCallback(() => {
    navigation.navigate('Heart');
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.content}>
          <View style={styles.headerSection}>
            <Text style={styles.dateText}>Tuesday, October 24</Text>
            <Text style={styles.greetingText}>Hello, {displayName}</Text>
          </View>

          {completeness && completeness.percentage < 80 && (
            <ProfileCompletenessBar
              percentage={completeness.percentage}
              missingFields={completeness.missingFields}
              onPress={() => navigation.navigate('ProfileEdit')}
            />
          )}

          <TouchableOpacity
            style={styles.aiCompanionCard}
            onPress={handleAiStylistPress}
            activeOpacity={0.9}
          >
            <View style={styles.bubblesRow}>
              <View style={styles.bubble}>
                <Text style={styles.bubbleText}>Need outfit ideas?</Text>
              </View>
              <View style={styles.bubble}>
                <Text style={styles.bubbleText}>New brands!</Text>
              </View>
            </View>

            <View style={styles.aiAvatarContainer}>
              <LinearGradient
                colors={['#FFB6C1', '#FFD700', '#90EE90', '#87CEEB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.aiAvatar}
              >
                <Text style={styles.aiEmoji}>😊</Text>
              </LinearGradient>
            </View>

            <View style={styles.bubblesRow}>
              <View style={styles.bubble}>
                <Text style={styles.bubbleText}>Style insights</Text>
              </View>
              <View style={styles.bubble}>
                <Text style={styles.bubbleText}>Review items</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.searchBar} onPress={handleSearchPress}>
            <Ionicons name="search-outline" size={22} color={theme.colors.textTertiary} />
            <Text style={styles.searchText}>Search outfits, items...</Text>
            <Ionicons name="mic-outline" size={22} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.closetCard} onPress={handleClosetPress}>
            <View style={styles.closetInfo}>
              <Text style={styles.closetTitle}>Your Closet</Text>
              <Text style={styles.closetProgress}>75% Optimized</Text>
            </View>
            <View style={styles.closetAvatarContainer}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop' }}
                style={styles.closetAvatar}
              />
              <View style={styles.closetProgressBadge}>
                <Text style={styles.closetProgressBadgeText}>75%</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tryOnCard} onPress={handleVirtualTryOnPress} activeOpacity={0.85}>
            <LinearGradient
              colors={['#6EC1E4', '#5BCEA6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tryOnGradient}
            >
              <View style={styles.tryOnInfo}>
                <Text style={styles.tryOnTitle}>AI 虚拟试衣</Text>
                <Text style={styles.tryOnSubtitle}>上传照片，一键试穿</Text>
              </View>
              <View style={styles.tryOnIconContainer}>
                <Ionicons name="sparkles" size={28} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.recsSection}>
            <View style={styles.recsHeader}>
              <Text style={styles.recsTitle}>Daily Recommendations</Text>
              <TouchableOpacity onPress={handleHeartPress}>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recsList}
            >
              {dailyRecs.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.recCard}
                  onPress={() => handleRecommendationPress(item.id)}
                >
                  <ImageWithPlaceholder
                    source={{ uri: item.image }}
                    style={styles.recImage}
                  />
                  <Text style={styles.recTitle}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  content: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  headerSection: {
    marginBottom: 20,
  },
  dateText: {
    fontSize: 15,
    color: theme.colors.textTertiary,
    marginBottom: 4,
  },
  greetingText: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  aiCompanionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  bubblesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
  },
  bubble: {
    backgroundColor: theme.colors.subtleBg,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bubbleText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  aiAvatarContainer: {
    marginVertical: 12,
  },
  aiAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  aiEmoji: {
    fontSize: 42,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  searchText: {
    flex: 1,
    fontSize: 17,
    color: theme.colors.textTertiary,
    marginHorizontal: 12,
  },
  closetCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  closetInfo: {
    flex: 1,
  },
  closetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  closetProgress: {
    fontSize: 15,
    color: theme.colors.textTertiary,
  },
  closetAvatarContainer: {
    position: 'relative',
  },
  closetAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: Colors.rose[400],
  },
  closetProgressBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.rose[400],
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 40,
    alignItems: 'center',
  },
  closetProgressBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tryOnCard: {
    borderRadius: 24,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#6EC1E4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  tryOnGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tryOnInfo: {
    flex: 1,
  },
  tryOnTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  tryOnSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  tryOnIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recsSection: {
    marginBottom: 20,
  },
  recsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  recsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  recsList: {
    paddingRight: 20,
  },
  recCard: {
    marginRight: 16,
    alignItems: 'center',
  },
  recImage: {
    width: 130,
    height: 170,
    borderRadius: 20,
    backgroundColor: theme.colors.placeholderBg,
  },
  recTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 10,
  },
});

export default withErrorBoundary(HomeScreen, {
  screenName: 'HomeScreen',
  maxRetries: 3,
  onError: (error, errorInfo, structuredError) => {
    console.error('[HomeScreen] Error:', structuredError);
  },
  onReset: () => {
    console.log('[HomeScreen] Error boundary reset');
  },
});

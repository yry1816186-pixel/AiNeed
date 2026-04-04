import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { LinearGradient } from '@/src/polyfills/expo-linear-gradient';
import Animated, { FadeInUp, SlideInRight } from 'react-native-reanimated';
import { useAuthStore } from '../stores/index';
import { authApi } from '../services/api/auth.api';
import { userApi } from '../services/api/auth.api';
import type { UserStats, User } from '../types/user';
import type { RootStackParamList } from '../types/navigation';
import { theme } from '../theme';

// 引入增强主题令牌
import { colors } from '../theme/tokens/colors';
import { typography } from '../theme/tokens/typography';
import { spacing } from '../theme/tokens/spacing';
import { shadows } from '../theme/tokens/shadows';
import { withErrorBoundary } from '../components/ErrorBoundary';

type ProfileNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ProfileScreenComponent: React.FC = () => {
  const navigation = useNavigation<ProfileNavigationProp>();
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const response = await userApi.getStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch {
      // Stats fetch failed silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, [fetchStats]);

  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout();
      logout();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch {
      logout();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  }, [logout, navigation]);

  const displayName = user?.nickname || user?.email?.split('@')[0] || '用户';
  const displayEmail = user?.email || '';
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const menuItems = [
    {
      icon: 'settings-outline' as const,
      label: '设置',
      accessibilityLabel: '打开设置',
      color: theme.colors.textSecondary,
      onPress: () => navigation.navigate('Settings'),
    },
    {
      icon: 'bag-outline' as const,
      label: '我的订单',
      accessibilityLabel: '查看我的订单',
      color: theme.colors.textSecondary,
      onPress: () => navigation.navigate('Orders'),
    },
    {
      icon: 'shirt-outline' as const,
      label: '我的衣橱',
      accessibilityLabel: '查看我的衣橱',
      color: theme.colors.textSecondary,
      onPress: () => navigation.navigate('Wardrobe' as never),
    },
    {
      icon: 'sparkles-outline' as const,
      label: 'AI 造型师',
      accessibilityLabel: '打开AI造型师',
      color: theme.colors.textSecondary,
      onPress: () => navigation.navigate('AiStylist' as never),
    },
    {
      icon: 'heart-outline' as const,
      label: '我的收藏',
      accessibilityLabel: '查看我的收藏',
      color: theme.colors.textSecondary,
      onPress: () => navigation.navigate('Favorites' as never),
    },
    {
      icon: 'color-wand-outline' as const,
      label: '私人定制',
      accessibilityLabel: '打开私人定制',
      color: theme.colors.purple,
      onPress: () => navigation.navigate('Customization' as never),
    },
    {
      icon: 'diamond-outline' as const,
      label: '会员订阅',
      accessibilityLabel: '查看会员订阅',
      color: theme.colors.amber,
      onPress: () => navigation.navigate('Subscription' as never),
    },
    {
      icon: 'log-out-outline' as const,
      label: '退出登录',
      accessibilityLabel: '退出登录',
      color: theme.colors.error,
      onPress: handleLogout,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>我的</Text>
      </View>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} />
        }
      >
        {/* Profile Card - 升级版（渐变背景 + 大圆角） */}
        <Animated.View entering={FadeInUp.duration(600).springify()}>
          <LinearGradient
            colors={[colors.gradients.coralRose[0], colors.gradients.coralRose[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}
          >
            <View style={styles.avatarContainer}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{avatarInitial}</Text>
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{displayName}</Text>
                <Text style={styles.profileEmail}>{displayEmail}</Text>
                <View style={styles.memberBadge}>
                  <Ionicons name="diamond" size={12} color="#FFFFFF" />
                  <Text style={styles.memberBadgeText}>VIP会员</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate('Settings')}
              accessibilityLabel="编辑个人资料"
              accessibilityRole="button"
            >
              <Ionicons name="create-outline" size={16} color="#FFFFFF" />
              <Text style={styles.editButtonText}>编辑资料</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Stats Cards */}
        {loading ? (
          <View style={styles.statsLoading}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {stats?.totalClothes ?? 0}
              </Text>
              <Text style={styles.statLabel}>服装数量</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {stats?.totalOutfits ?? 0}
              </Text>
              <Text style={styles.statLabel}>搭配数量</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {(user as User)?.createdAt
                  ? Math.max(
                      1,
                      Math.ceil(
                        (Date.now() - new Date((user as User).createdAt).getTime()) /
                          (1000 * 60 * 60 * 24),
                      ),
                    )
                  : 0}
              </Text>
              <Text style={styles.statLabel}>使用天数</Text>
            </View>
          </View>
        )}

        {/* Menu Section */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && styles.menuItemLast,
              ]}
              onPress={item.onPress}
              activeOpacity={0.6}
              accessibilityLabel={item.accessibilityLabel}
              accessibilityRole="button"
            >
              <Ionicons name={item.icon} size={22} color={item.color} />
              <Text style={[styles.menuText, { color: item.color }]}>
                {item.label}
              </Text>
              <Ionicons name="chevron-forward-outline" size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[50] },
  header: {
    padding: spacing.layout.screenPadding,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    ...shadows.presets.xs,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.neutral[900],
  },
  content: { flex: 1 },

  // ===== Profile Card（升级版 - 渐变背景）=====
  profileCard: {
    margin: spacing.layout.screenPadding,
    borderRadius: spacing.borderRadius['2xl'],
    padding: spacing.layout.modalPadding,
    ...shadows.presets.lg,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold as any,
    color: '#FFFFFF',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold as any,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  memberBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold as any,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  editButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold as any,
  },

  // ===== Stats Cards（升级版）=====
  statsLoading: {
    paddingVertical: spacing.layout.sectionGap,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.layout.screenPadding,
    marginBottom: spacing.layout.cardGap,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.neutral.white,
    borderRadius: spacing.borderRadius.xl,
    padding: spacing.layout.cardPadding,
    alignItems: 'center',
    ...shadows.presets.sm,
  },
  statValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold as any,
    color: colors.brand.warmPrimary,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
    marginTop: 6,
  },

  // ===== Menu Section（升级版）=====
  menuSection: {
    backgroundColor: colors.neutral.white,
    marginHorizontal: spacing.layout.screenPadding,
    borderRadius: spacing.borderRadius.xl,
    overflow: 'hidden',
    marginBottom: 40,
    ...shadows.presets.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.layout.listItemPadding,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
});

const ProfileScreen = withErrorBoundary(ProfileScreenComponent, {
  screenName: 'ProfileScreen',
  maxRetries: 3,
  onError: (error, errorInfo, structuredError) => {
    console.error('[ProfileScreen] Error:', structuredError);
  },
  onReset: () => {
    console.log('[ProfileScreen] Error boundary reset');
  },
});

export { ProfileScreen };
export default ProfileScreen;

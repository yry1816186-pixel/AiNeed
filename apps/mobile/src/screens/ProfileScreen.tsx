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
import { useAuthStore } from '../stores/index';
import { authApi } from '../services/api/auth.api';
import { userApi } from '../services/api/auth.api';
import type { UserStats, User } from '../types/user';
import type { RootStackParamList } from '../types/navigation';
import { theme } from '../theme';
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
        {/* Profile Card */}
        <View style={styles.profileCard}>
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
            </View>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('Settings')}
            accessibilityLabel="编辑个人资料"
            accessibilityRole="button"
          >
            <Text style={styles.editButtonText}>编辑资料</Text>
          </TouchableOpacity>
        </View>

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
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  content: { flex: 1 },
  profileCard: {
    backgroundColor: theme.colors.primary,
    margin: 20,
    borderRadius: theme.BorderRadius.lg,
    padding: 20,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.overlayWhiteMed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.surface,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  profileInfo: { marginLeft: 16, flex: 1 },
  profileName: { fontSize: 20, fontWeight: '600', color: theme.colors.surface },
  profileEmail: { fontSize: 14, color: theme.colors.overlayWhiteHigh, marginTop: 4 },
  editButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.overlayWhiteMid,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: theme.colors.surface,
    fontSize: 13,
    fontWeight: '500',
  },
  statsLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.BorderRadius.lg,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  menuSection: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 20,
    borderRadius: theme.BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
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

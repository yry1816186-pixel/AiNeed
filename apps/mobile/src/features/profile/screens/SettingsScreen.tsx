import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { useAuthStore } from '../stores/index';
import { authApi } from '../services/api/auth.api';
import { apiClient } from '../services/api/client';
import { theme } from '../design-system/theme';
import { useTranslation } from '../i18n';
import { useTheme } from '../contexts/ThemeContext';
import type { RootStackParamList } from '../types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const { user, logout } = useAuthStore();
  const { isDark, setMode } = useTheme();
  const t = useTranslation();

  const [outfitReminders, setOutfitReminders] = useState(true);
  const [newArrivals, setNewArrivals] = useState(true);
  const [sales, setSales] = useState(false);
  const [updatingPrefs, setUpdatingPrefs] = useState(false);

  // Password modal state
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account confirmation
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (user?.preferences?.notifications) {
          const n = user.preferences.notifications;
          setOutfitReminders(n.outfitReminders);
          setNewArrivals(n.newArrivals);
          setSales(n.sales);
        }
      } catch {
        // Silent fail for settings load
      }
    };
    void loadSettings();
  }, [user]);

  const handleDarkModeToggle = useCallback(async (value: boolean) => {
    setMode(value ? 'dark' : 'light');
  }, [setMode]);

  const handleNotificationToggle = useCallback(
    async (key: 'outfitReminders' | 'newArrivals' | 'sales', value: boolean) => {
      if (key === 'outfitReminders') { setOutfitReminders(value); }
      if (key === 'newArrivals') { setNewArrivals(value); }
      if (key === 'sales') { setSales(value); }

      setUpdatingPrefs(true);
      try {
        await authApi.updatePreferences({
          notifications: {
            outfitReminders: key === 'outfitReminders' ? value : outfitReminders,
            newArrivals: key === 'newArrivals' ? value : newArrivals,
            sales: key === 'sales' ? value : sales,
          },
        });
      } catch {
        // Revert on failure
        if (key === 'outfitReminders') { setOutfitReminders(!value); }
        if (key === 'newArrivals') { setNewArrivals(!value); }
        if (key === 'sales') { setSales(!value); }
      } finally {
        setUpdatingPrefs(false);
      }
    },
    [outfitReminders, newArrivals, sales],
  );

  const handleChangePassword = useCallback(async () => {
    if (!oldPassword.trim()) {
      Alert.alert('提示', '请输入当前密码');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('提示', '新密码至少需要6个字符');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('提示', '两次输入的新密码不一致');
      return;
    }
    setChangingPassword(true);
    try {
      const response = await authApi.changePassword(oldPassword, newPassword);
      if (response.success) {
        Alert.alert('成功', '密码已修改');
        setPasswordModalVisible(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('错误', response.error?.message || '密码修改失败');
      }
    } catch {
      Alert.alert('错误', '网络错误，请重试');
    } finally {
      setChangingPassword(false);
    }
  }, [oldPassword, newPassword, confirmPassword]);

  const handleLogout = useCallback(async () => {
    Alert.alert(t.profile.logoutConfirm, t.profile.logoutConfirmMessage, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.confirm,
        style: 'destructive',
        onPress: async () => {
          try {
            await authApi.logout();
          } catch {
            // Continue regardless
          }
          void logout();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  }, [logout, navigation]);

  const handleExportData = useCallback(async () => {
    Alert.alert(
      'Export Data',
      'Request a copy of your personal data? You will receive a download link when ready.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            setExporting(true);
            try {
              await apiClient.post('/privacy/export', { format: 'json' });
              Alert.alert('Success', 'Data export request submitted. You will receive a download link within 24 hours.');
            } catch {
              Alert.alert('Error', 'Failed to request data export. Please try again.');
            } finally {
              setExporting(false);
            }
          },
        },
      ],
    );
  }, []);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      '删除账户',
      '此操作不可撤销，您的所有数据将被永久删除。确定要继续吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            Alert.alert('最终确认', '请再次确认删除账户', [
              { text: '取消', style: 'cancel' },
              {
                text: '确认删除',
                style: 'destructive',
                onPress: async () => {
                  setDeleting(true);
                  try {
                    await authApi.deleteAccount();
                    void logout();
                    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                  } catch {
                    Alert.alert('错误', '删除账户失败，请重试');
                  } finally {
                    setDeleting(false);
                  }
                },
              },
            ]);
          },
        },
      ],
    );
  }, [logout, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityLabel={t.common.back}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.profile.settings}</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView style={styles.content}>
        {/* Appearance */}
        <Text style={styles.sectionTitle}>外观</Text>
        <View style={styles.section}>
          <View style={styles.settingItem}>
            <Ionicons name="moon-outline" size={22} color={theme.colors.textSecondary} />
            <Text style={styles.settingText}>深色模式</Text>
            <Switch
              value={isDark}
              onValueChange={handleDarkModeToggle}
              trackColor={{ false: theme.colors.placeholderBg, true: theme.colors.primary }}
              thumbColor={theme.colors.surface}
              accessibilityLabel="深色模式"
            />
          </View>
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>通知</Text>
        <View style={styles.section}>
          <View style={styles.settingItem}>
            <Ionicons name="time-outline" size={22} color={theme.colors.textSecondary} />
            <Text style={styles.settingText}>穿搭提醒</Text>
            <Switch
              value={outfitReminders}
              onValueChange={(v) => handleNotificationToggle('outfitReminders', v)}
              disabled={updatingPrefs}
              trackColor={{ false: theme.colors.placeholderBg, true: theme.colors.primary }}
              thumbColor={theme.colors.surface}
              accessibilityLabel="穿搭提醒"
            />
          </View>
          <View style={styles.settingItem}>
            <Ionicons name="pricetag-outline" size={22} color={theme.colors.textSecondary} />
            <Text style={styles.settingText}>新品上架</Text>
            <Switch
              value={newArrivals}
              onValueChange={(v) => handleNotificationToggle('newArrivals', v)}
              disabled={updatingPrefs}
              trackColor={{ false: theme.colors.placeholderBg, true: theme.colors.primary }}
              thumbColor={theme.colors.surface}
              accessibilityLabel="新品上架通知"
            />
          </View>
          <View style={[styles.settingItem, styles.settingItemLast]}>
            <Ionicons name="sale-outline" size={22} color={theme.colors.textSecondary} />
            <Text style={styles.settingText}>促销活动</Text>
            <Switch
              value={sales}
              onValueChange={(v) => handleNotificationToggle('sales', v)}
              disabled={updatingPrefs}
              trackColor={{ false: theme.colors.placeholderBg, true: theme.colors.primary }}
              thumbColor={theme.colors.surface}
              accessibilityLabel="促销活动通知"
            />
          </View>
        </View>

        {/* Legal */}
        <Text style={styles.sectionTitle}>法律信息</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('Legal', { type: 'terms' })}
            accessibilityLabel="用户服务协议"
          >
            <Ionicons name="document-text-outline" size={22} color={theme.colors.textSecondary} />
            <Text style={styles.settingText}>用户服务协议</Text>
            <Ionicons name="chevron-forward-outline" size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.settingItem, styles.settingItemLast]}
            onPress={() => navigation.navigate('Legal', { type: 'privacy' })}
            accessibilityLabel="隐私政策"
          >
            <Ionicons name="shield-checkmark-outline" size={22} color={theme.colors.textSecondary} />
            <Text style={styles.settingText}>隐私政策</Text>
            <Ionicons name="chevron-forward-outline" size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Data & Privacy */}
        <Text style={styles.sectionTitle}>Data & Privacy</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleExportData}
            disabled={exporting}
            accessibilityLabel="Export my data"
            accessibilityState={{ disabled: exporting }}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            ) : (
              <Ionicons name="download-outline" size={22} color={theme.colors.textSecondary} />
            )}
            <Text style={styles.settingText}>{exporting ? 'Exporting...' : 'Export My Data'}</Text>
            <Ionicons name="chevron-forward-outline" size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('NotificationSettings')}
            accessibilityLabel="Notification settings"
          >
            <Ionicons name="notifications-outline" size={22} color={theme.colors.textSecondary} />
            <Text style={styles.settingText}>Notification Settings</Text>
            <Ionicons name="chevron-forward-outline" size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.settingItem, styles.settingItemLast]}
            onPress={handleDeleteAccount}
            disabled={deleting}
            accessibilityLabel="Delete my account"
            accessibilityState={{ disabled: deleting }}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={theme.colors.error} />
            ) : (
              <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
            )}
            <Text style={[styles.settingText, { color: theme.colors.error }]}>
              {deleting ? 'Deleting...' : 'Delete My Account'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setPasswordModalVisible(true)}
            accessibilityLabel="Change password"
          >
            <Ionicons name="lock-closed-outline" size={22} color={theme.colors.textSecondary} />
            <Text style={styles.settingText}>Change Password</Text>
            <Ionicons name="chevron-forward-outline" size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingItem, styles.settingItemLast]} accessibilityLabel="About">
            <Ionicons name="help-circle-outline" size={22} color={theme.colors.textSecondary} />
            <Text style={styles.settingText}>About</Text>
            <Ionicons name="chevron-forward-outline" size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.settingItem, styles.settingItemLast, styles.dangerButton]}
            onPress={handleLogout}
            accessibilityLabel={t.profile.logout}
          >
            <Ionicons name="log-out-outline" size={22} color={theme.colors.error} />
            <Text style={[styles.settingText, { color: theme.colors.error }]}>{t.profile.logout}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>寻裳 v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>修改密码</Text>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)} accessibilityLabel="关闭">
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="当前密码"
              placeholderTextColor={theme.colors.textTertiary}
              secureTextEntry
              value={oldPassword}
              onChangeText={setOldPassword}
              autoCapitalize="none"
              accessibilityLabel="当前密码"
            />
            <TextInput
              style={styles.input}
              placeholder="新密码 (至少6位)"
              placeholderTextColor={theme.colors.textTertiary}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              autoCapitalize="none"
              accessibilityLabel="新密码"
            />
            <TextInput
              style={styles.input}
              placeholder="确认新密码"
              placeholderTextColor={theme.colors.textTertiary}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
              accessibilityLabel="确认新密码"
            />
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleChangePassword}
              disabled={changingPassword}
              accessibilityLabel="确认修改密码"
              accessibilityState={{ disabled: changingPassword }}
            >
              {changingPassword ? (
                <ActivityIndicator size="small" color={theme.colors.surface} />
              ) : (
                <Text style={styles.submitButtonText}>确认修改</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text },
  placeholder: { width: 40 },
  content: { flex: 1 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  settingItemLast: { borderBottomWidth: 0 },
  settingText: { flex: 1, fontSize: 16, color: theme.colors.text },
  dangerButton: { borderBottomWidth: 0 },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
    color: theme.colors.text,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;

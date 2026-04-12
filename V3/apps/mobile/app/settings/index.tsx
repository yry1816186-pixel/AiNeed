import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
} from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, radius, shadows } from '../../src/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { Text } from '../../src/components/ui/Text';

interface SettingRowProps {
  label: string;
  icon: React.ReactNode;
  rightContent?: React.ReactNode;
  onPress?: () => void;
  showBorder?: boolean;
}

const ChevronRight: React.FC = () => (
  <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <Path d="M6 4L10 8L6 12" stroke={colors.textTertiary} strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

const SettingRow: React.FC<SettingRowProps> = ({
  label,
  icon,
  rightContent,
  onPress,
  showBorder = true,
}) => (
  <TouchableOpacity
    style={[styles.settingRow, showBorder && styles.settingRowBorder]}
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
    disabled={!onPress}
    accessibilityRole={onPress ? 'button' : 'text'}
    accessibilityLabel={label}
  >
    <View style={styles.settingRowLeft}>
      <View style={styles.settingIcon}>{icon}</View>
      <Text variant="body" style={styles.settingLabel}>
        {label}
      </Text>
    </View>
    <View style={styles.settingRowRight}>
      {rightContent ?? <ChevronRight />}
    </View>
  </TouchableOpacity>
);

const PhoneIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Path d="M5 2H15L14 8H6L5 2Z" stroke={colors.primary} strokeWidth="1.5" strokeLinejoin="round" />
    <Path d="M6 8V16C6 17.1046 6.89543 18 8 18H12C13.1046 18 14 17.1046 14 16V8" stroke={colors.primary} strokeWidth="1.5" />
  </Svg>
);

const BellIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Path d="M10 2C7.24 2 5 4.24 5 7V11L3 14H17L15 11V7C15 4.24 12.76 2 10 2Z" stroke={colors.primary} strokeWidth="1.5" strokeLinejoin="round" />
    <Path d="M8 17C8 18.1 8.9 19 10 19C11.1 19 12 18.1 12 17" stroke={colors.primary} strokeWidth="1.5" />
  </Svg>
);

const LanguageIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Circle cx="10" cy="10" r="8" stroke={colors.primary} strokeWidth="1.5" />
    <Path d="M2 10H18" stroke={colors.primary} strokeWidth="1.5" />
    <Path d="M10 2C12 4 13 7 13 10C13 13 12 16 10 18C8 16 7 13 7 10C7 7 8 4 10 2Z" stroke={colors.primary} strokeWidth="1.5" />
  </Svg>
);

const CacheIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Path d="M4 4H16V14C16 15.1046 15.1046 16 14 16H6C4.89543 16 4 15.1046 4 14V4Z" stroke={colors.primary} strokeWidth="1.5" />
    <Path d="M2 4H18" stroke={colors.primary} strokeWidth="1.5" />
    <Path d="M8 9H12" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" />
    <Path d="M7 20H13" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [notificationEnabled, setNotificationEnabled] = useState(true);

  const handleAccountSecurity = () => {
    Alert.alert('账号安全', `当前绑定手机: ${user?.phone ?? '未绑定'}`);
  };

  const handleLanguageSelect = () => {
    Alert.alert('语言选择', '当前仅支持简体中文');
  };

  const handleClearCache = () => {
    Alert.alert('清除缓存', '确定要清除所有缓存数据吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: () => Alert.alert('提示', '缓存已清除'),
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('退出登录', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.section}>
        <Text variant="caption" color={colors.textTertiary} style={styles.sectionTitle}>
          账号
        </Text>
        <View style={styles.sectionCard}>
          <SettingRow
            label="账号安全"
            icon={<PhoneIcon />}
            rightContent={
              <Text variant="bodySmall" color={colors.textTertiary}>
                {user?.phone ? `${user.phone.slice(0, 3)}****${user.phone.slice(-4)}` : '未绑定'}
              </Text>
            }
            onPress={handleAccountSecurity}
            showBorder
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="caption" color={colors.textTertiary} style={styles.sectionTitle}>
          通用
        </Text>
        <View style={styles.sectionCard}>
          <SettingRow
            label="消息通知"
            icon={<BellIcon />}
            rightContent={
              <Switch
                value={notificationEnabled}
                onValueChange={setNotificationEnabled}
                trackColor={{ false: colors.gray300, true: colors.accentLight }}
                thumbColor={notificationEnabled ? colors.accent : colors.white}
              />
            }
            showBorder
          />
          <SettingRow
            label="语言选择"
            icon={<LanguageIcon />}
            rightContent={
              <Text variant="bodySmall" color={colors.textTertiary}>
                简体中文
              </Text>
            }
            onPress={handleLanguageSelect}
            showBorder
          />
          <SettingRow
            label="清除缓存"
            icon={<CacheIcon />}
            rightContent={
              <Text variant="bodySmall" color={colors.textTertiary}>
                23.5 MB
              </Text>
            }
            onPress={handleClearCache}
            showBorder={false}
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="退出登录"
      >
        <Text variant="body" color={colors.error}>
          退出登录
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    fontWeight: '500' as const,
  },
  sectionCard: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + spacing.xs,
  },
  settingRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingLabel: {
    color: colors.textPrimary,
  },
  settingRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButton: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
  },
});

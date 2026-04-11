import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, radius } from '../../src/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { useProfile } from '../../src/hooks/useProfile';
import { ProfileHeader } from '../../src/components/profile/ProfileHeader';
import { StatsCard } from '../../src/components/profile/StatsCard';
import { MenuList } from '../../src/components/profile/MenuList';
import { Loading } from '../../src/components/ui/Loading';
import { Text } from '../../src/components/ui/Text';
import type { MenuGroup } from '../../src/components/profile/MenuList';

const WardrobeIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Path d="M4 3H16C16.5523 3 17 3.44772 17 4V18C17 18.5523 16.5523 19 16 19H4C3.44772 19 3 18.5523 3 18V4C3 3.44772 3.44772 3 4 3Z" stroke={colors.primary} strokeWidth="1.5" />
    <Path d="M10 3V19" stroke={colors.primary} strokeWidth="1.5" />
    <Path d="M3 8H17" stroke={colors.primary} strokeWidth="1.5" />
    <Circle cx="8" cy="5.5" r="0.8" fill={colors.primary} />
    <Circle cx="12" cy="5.5" r="0.8" fill={colors.primary} />
  </Svg>
);

const FavoriteIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Path d="M10 17L8.55 15.7C4 11.6 1 8.9 1 5.5C1 2.8 3.1 0.7 5.75 0.7C7.24 0.7 8.66 1.4 10 2.5C11.34 1.4 12.76 0.7 14.25 0.7C16.9 0.7 19 2.8 19 5.5C19 8.9 16 11.6 11.45 15.7L10 17Z" stroke={colors.primary} strokeWidth="1.5" />
  </Svg>
);

const CustomOrderIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Path d="M3 5H17V16C17 16.5523 16.5523 17 16 17H4C3.44772 17 3 16.5523 3 16V5Z" stroke={colors.primary} strokeWidth="1.5" />
    <Path d="M3 5L5 2H15L17 5" stroke={colors.primary} strokeWidth="1.5" strokeLinejoin="round" />
    <Path d="M8 9H12" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

const BespokeIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Path d="M10 2L12.5 7L18 8L14 12L15 18L10 15L5 18L6 12L2 8L7.5 7L10 2Z" stroke={colors.primary} strokeWidth="1.5" strokeLinejoin="round" />
  </Svg>
);

const BodyAnalysisIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Circle cx="10" cy="5" r="3" stroke={colors.primary} strokeWidth="1.5" />
    <Path d="M4 19C4 14.5817 6.68629 11 10 11C13.3137 11 16 14.5817 16 19" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

const StylePrefIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Path d="M3 3H8V8H3V3Z" stroke={colors.primary} strokeWidth="1.5" />
    <Path d="M12 3H17V8H12V3Z" stroke={colors.primary} strokeWidth="1.5" />
    <Path d="M3 12H8V17H3V12Z" stroke={colors.primary} strokeWidth="1.5" />
    <Path d="M14.5 11V17M11.5 14H17.5" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

const AvatarIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Circle cx="10" cy="7" r="4" stroke={colors.primary} strokeWidth="1.5" />
    <Path d="M3 19C3 14.0294 6.13401 10 10 10C13.866 10 17 14.0294 17 19" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" />
    <Path d="M15 4L17 2M17 2V5M17 2H14" stroke={colors.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SettingsIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Circle cx="10" cy="10" r="3" stroke={colors.primary} strokeWidth="1.5" />
    <Path d="M10 1V3M10 17V19M1 10H3M17 10H19M3.5 3.5L5 5M15 15L16.5 16.5M16.5 3.5L15 5M5 15L3.5 16.5" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

const PrivacyIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Path d="M10 2L3 5V9.5C3 14 6 17.5 10 19C14 17.5 17 14 17 9.5V5L10 2Z" stroke={colors.primary} strokeWidth="1.5" strokeLinejoin="round" />
    <Path d="M8 10L9.5 11.5L12.5 8.5" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const AboutIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Circle cx="10" cy="10" r="8" stroke={colors.primary} strokeWidth="1.5" />
    <Path d="M10 9V14" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" />
    <Circle cx="10" cy="6.5" r="1" fill={colors.primary} />
  </Svg>
);

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { profile, isLoading } = useProfile();

  const handleEditProfile = () => {
    router.push('/settings/profile-edit' as `${string}`);
  };

  const handleChangeAvatar = () => {
    Alert.alert('更换头像', '请选择头像来源', [
      { text: '拍照', onPress: () => {} },
      { text: '从相册选择', onPress: () => {} },
      { text: '取消', style: 'cancel' },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('退出登录', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: logout },
    ]);
  };

  const statsItems = [
    {
      value: profile?.stats?.favorites ?? 0,
      label: '收藏',
      onPress: () => {},
    },
    {
      value: profile?.stats?.tryOnCount ?? 0,
      label: '试衣',
      onPress: () => {},
    },
    {
      value: profile?.stats?.customOrders ?? 0,
      label: '定制',
      onPress: () => {},
    },
  ];

  const menuGroups: MenuGroup[] = [
    {
      title: '我的服务',
      items: [
        {
          label: '我的衣橱',
          icon: <WardrobeIcon />,
          onPress: () => router.push('/(tabs)/wardrobe'),
        },
        {
          label: '我的收藏',
          icon: <FavoriteIcon />,
          onPress: () => {},
        },
        {
          label: '我的定制',
          icon: <CustomOrderIcon />,
          onPress: () => {},
        },
        {
          label: '高端定制',
          icon: <BespokeIcon />,
          onPress: () => {},
        },
      ],
    },
    {
      title: '个人',
      items: [
        {
          label: '体型分析',
          icon: <BodyAnalysisIcon />,
          onPress: () => {},
        },
        {
          label: '风格偏好',
          icon: <StylePrefIcon />,
          onPress: () => router.push('/settings/preferences'),
        },
        {
          label: 'Q版形象',
          icon: <AvatarIcon />,
          onPress: () => {},
        },
      ],
    },
    {
      title: '设置',
      items: [
        {
          label: '设置',
          icon: <SettingsIcon />,
          onPress: () => router.push('/settings/'),
        },
        {
          label: '隐私政策',
          icon: <PrivacyIcon />,
          onPress: () => router.push('/settings/privacy'),
        },
        {
          label: '关于AiNeed',
          icon: <AboutIcon />,
          onPress: () => {},
        },
      ],
    },
  ];

  if (isLoading && !profile) {
    return <Loading variant="fullscreen" message="加载中..." />;
  }

  const displayProfile = profile ?? {
    id: user?.id ?? '',
    nickname: user?.nickname,
    avatarUrl: user?.avatarUrl,
    bio: '',
    stats: { favorites: 0, tryOnCount: 0, customOrders: 0 },
    preferences: { styleTags: [], occasionTags: [], colorPreferences: [], budgetMin: 0, budgetMax: 0 },
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      <ProfileHeader
        profile={displayProfile}
        onEditProfile={handleEditProfile}
        onChangeAvatar={handleChangeAvatar}
      />

      <StatsCard items={statsItems} />

      <MenuList groups={menuGroups} />

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

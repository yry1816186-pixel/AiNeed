import React, { useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  type ImageSourcePropType,
  StyleSheet,
} from 'react-native';
import { Svg, Circle, Path } from 'react-native-svg';
import { colors, typography, spacing, radius } from '../../theme';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { useNotificationStore } from '../../stores/notification.store';
import type { ProfileData } from '../../services/user.service';

interface ProfileHeaderProps {
  profile: ProfileData;
  onEditProfile: () => void;
  onChangeAvatar: () => void;
}

function NotificationBell() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const openPanel = useNotificationStore((s) => s.openPanel);

  return (
    <TouchableOpacity
      style={bellStyles.container}
      onPress={openPanel}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`通知${unreadCount > 0 ? `，${unreadCount}条未读` : ''}`}
    >
      <Svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <Path
          d="M11 2C7.68629 2 5 4.68629 5 8V13L3 16H19L17 13V8C17 4.68629 14.3137 2 11 2Z"
          stroke={colors.textPrimary}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <Path
          d="M9 16C9 17.1046 9.89543 18 11 18C12.1046 18 13 17.1046 13 16"
          stroke={colors.textPrimary}
          strokeWidth="1.5"
        />
      </Svg>
      {unreadCount > 0 && (
        <View style={bellStyles.badge}>
          <View style={bellStyles.badgeDot} />
        </View>
      )}
    </TouchableOpacity>
  );
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  onEditProfile,
  onChangeAvatar,
}) => {
  const avatarSource: ImageSourcePropType | null = profile.avatarUrl
    ? { uri: profile.avatarUrl }
    : null;

  const renderAvatar = useCallback(() => {
    if (avatarSource) {
      return (
        <Image
          source={avatarSource}
          style={styles.avatarImage}
          accessibilityRole="image"
          accessibilityLabel="用户头像"
        />
      );
    }
    return (
      <Svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <Circle cx="20" cy="15" r="7" fill={colors.gray400} />
        <Path d="M8 38C8 30.268 13.3726 24 20 24C26.6274 24 32 30.268 32 38" fill={colors.gray400} />
      </Svg>
    );
  }, [avatarSource]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.avatarWrapper}
        onPress={onChangeAvatar}
        activeOpacity={0.7}
        accessibilityRole="imagebutton"
        accessibilityLabel="更换头像"
      >
        <View style={styles.avatar}>
          {renderAvatar()}
        </View>
        <View style={styles.avatarBadge}>
          <Svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <Path d="M6 1V11M1 6H11" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </Svg>
        </View>
      </TouchableOpacity>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text variant="h3" style={styles.nickname}>
            {profile.nickname ?? '未设置昵称'}
          </Text>
          <NotificationBell />
        </View>
        {profile.bio ? (
          <Text variant="bodySmall" color={colors.textTertiary} style={styles.bio} numberOfLines={1}>
            {profile.bio}
          </Text>
        ) : null}
      </View>

      <Button
        variant="secondary"
        size="small"
        onPress={onEditProfile}
        textStyle={styles.editButtonText}
      >
        编辑资料
      </Button>
    </View>
  );
};

const AVATAR_SIZE = 80;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    resizeMode: 'cover',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  info: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  nickname: {
    color: colors.textPrimary,
  },
  bio: {
    marginTop: spacing.xs,
  },
  editButtonText: {
    fontSize: 13,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

const bellStyles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.accent,
    borderRadius: 5,
    minWidth: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.textInverse,
  },
});

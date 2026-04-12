import React, { useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  type ListRenderItemInfo,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { messagingService, type ChatRoom } from '../../src/services/messaging.service';
import { useAuthStore } from '../../src/stores/auth.store';
import { Avatar } from '../../src/components/ui/Avatar';
import { Text } from '../../src/components/ui/Text';
import { Badge } from '../../src/components/ui/Badge';
import { Loading } from '../../src/components/ui/Loading';
import { Empty } from '../../src/components/ui/Empty';
import { colors, spacing, radius, typography } from '../../src/theme';

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) {
    return '昨天';
  }
  if (diffDays < 7) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getOtherParticipant(room: ChatRoom, currentUserId: string) {
  return room.participants.find((p) => p.userId !== currentUserId) ?? room.participants[0];
}

function RoomItem({ room, currentUserId, onPress }: { room: ChatRoom; currentUserId: string; onPress: () => void }) {
  const other = getOtherParticipant(room, currentUserId);
  const lastMsg = room.lastMessage;
  const unread = room.unreadCount ?? 0;

  const previewText = lastMsg
    ? lastMsg.messageType === 'image'
      ? '[图片]'
      : lastMsg.content.length > 30
        ? lastMsg.content.slice(0, 30) + '...'
        : lastMsg.content
    : '暂无消息';

  return (
    <TouchableOpacity style={styles.roomItem} onPress={onPress} activeOpacity={0.7}>
      <Avatar
        size="lg"
        source={other.avatarUrl ? { uri: other.avatarUrl } : undefined}
        placeholder={other.nickname}
      />
      <View style={styles.roomContent}>
        <View style={styles.roomHeader}>
          <Text variant="body" weight="500" style={styles.nickname} numberOfLines={1}>
            {other.nickname || '未知用户'}
          </Text>
          {lastMsg && (
            <Text variant="caption" color={colors.textTertiary}>
              {formatTime(lastMsg.createdAt)}
            </Text>
          )}
        </View>
        <View style={styles.roomFooter}>
          <Text variant="body2" color={colors.textSecondary} numberOfLines={1} style={styles.preview}>
            {previewText}
          </Text>
          {unread > 0 && (
            <Badge
              label={unread > 99 ? '99+' : String(unread)}
              variant="accent"
              size="small"
              style={styles.unreadBadge}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MessagesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const { data: rooms = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['messages', 'rooms'],
    queryFn: () => messagingService.getRooms(),
    enabled: !!currentUserId,
  });

  const handleRoomPress = useCallback(
    (roomId: string) => {
      router.push(`/messages/${roomId}`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ChatRoom>) => (
      <RoomItem room={item} currentUserId={currentUserId ?? ''} onPress={() => handleRoomPress(item.id)} />
    ),
    [currentUserId, handleRoomPress],
  );

  const keyExtractor = useCallback((item: ChatRoom) => item.id, []);

  if (isLoading) {
    return <Loading variant="fullscreen" message="加载消息..." />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rooms}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={rooms.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          <Empty title="暂无消息" description="还没有人给你发私信" icon={<MessageIcon />} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

function MessageIcon() {
  return (
    <View style={messageIconStyles.container}>
      <View style={messageIconStyles.icon}>
        <Text variant="h2" color={colors.white}>
          ✉
        </Text>
      </View>
    </View>
  );
}

const messageIconStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  emptyList: {
    flexGrow: 1,
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  roomContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  nickname: {
    flex: 1,
    marginRight: spacing.sm,
  },
  roomFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preview: {
    flex: 1,
    marginRight: spacing.sm,
  },
  unreadBadge: {
    minWidth: 20,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginLeft: 72,
  },
});

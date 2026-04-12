import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  messagingService,
  type DirectMessage,
  type ChatRoom,
} from '../../src/services/messaging.service';
import { useAuthStore } from '../../src/stores/auth.store';
import { Avatar } from '../../src/components/ui/Avatar';
import { Text } from '../../src/components/ui/Text';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, radius, typography } from '../../src/theme';

const PAGE_SIZE = 20;

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function shouldShowTimeSeparator(current: DirectMessage, previous?: DirectMessage): boolean {
  if (!previous) return true;
  const diffMs = new Date(current.createdAt).getTime() - new Date(previous.createdAt).getTime();
  return diffMs > 5 * 60 * 1000;
}

function TimeSeparator({ time }: { time: string }) {
  return (
    <View style={timeSepStyles.container}>
      <View style={timeSepStyles.pill}>
        <Text variant="caption" color={colors.textTertiary}>
          {formatMessageTime(time)}
        </Text>
      </View>
    </View>
  );
}

const timeSepStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  pill: {
    backgroundColor: colors.gray100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
});

function TextBubble({ message, isOwn }: { message: DirectMessage; isOwn: boolean }) {
  return (
    <View style={[bubbleStyles.container, isOwn ? bubbleStyles.ownContainer : bubbleStyles.otherContainer]}>
      <View style={[bubbleStyles.bubble, isOwn ? bubbleStyles.ownBubble : bubbleStyles.otherBubble]}>
        <Text
          variant="body"
          color={isOwn ? colors.white : colors.textPrimary}
          style={bubbleStyles.text}
        >
          {message.content}
        </Text>
      </View>
      <Text variant="caption" color={colors.textTertiary} style={bubbleStyles.time}>
        {formatMessageTime(message.createdAt)}
      </Text>
    </View>
  );
}

function ImageBubble({ message, isOwn }: { message: DirectMessage; isOwn: boolean }) {
  return (
    <View style={[bubbleStyles.container, isOwn ? bubbleStyles.ownContainer : bubbleStyles.otherContainer]}>
      <TouchableOpacity
        style={[bubbleStyles.imageBubble, isOwn ? bubbleStyles.ownBubble : bubbleStyles.otherBubble]}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: message.content }}
          style={bubbleStyles.image}
          resizeMode="cover"
          accessibilityLabel="图片消息"
        />
      </TouchableOpacity>
      <Text variant="caption" color={colors.textTertiary} style={bubbleStyles.time}>
        {formatMessageTime(message.createdAt)}
      </Text>
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  container: {
    maxWidth: '75%',
    marginVertical: spacing.xs,
  },
  ownContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  ownBubble: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: radius.xs,
  },
  otherBubble: {
    backgroundColor: colors.gray100,
    borderBottomLeftRadius: radius.xs,
  },
  text: {
    lineHeight: 22,
  },
  time: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  imageBubble: {
    borderRadius: radius.md,
    overflow: 'hidden',
    padding: 0,
  },
  image: {
    width: 180,
    height: 180,
    borderRadius: radius.md,
  },
});

function MessageItem({
  message,
  isOwn,
  showAvatar,
  senderNickname,
  senderAvatarUrl,
}: {
  message: DirectMessage;
  isOwn: boolean;
  showAvatar: boolean;
  senderNickname: string;
  senderAvatarUrl?: string | null;
}) {
  if (isOwn) {
    return message.messageType === 'image' ? (
      <ImageBubble message={message} isOwn />
    ) : (
      <TextBubble message={message} isOwn />
    );
  }

  return (
    <View style={msgItemStyles.row}>
      <View style={msgItemStyles.avatarColumn}>
        {showAvatar ? (
          <Avatar
            size="sm"
            source={senderAvatarUrl ? { uri: senderAvatarUrl } : undefined}
            placeholder={senderNickname}
          />
        ) : (
          <View style={msgItemStyles.avatarPlaceholder} />
        )}
      </View>
      <View style={msgItemStyles.messageColumn}>
        {showAvatar && (
          <Text variant="caption" color={colors.textTertiary} style={msgItemStyles.senderName}>
            {senderNickname}
          </Text>
        )}
        {message.messageType === 'image' ? (
          <ImageBubble message={message} isOwn={false} />
        ) : (
          <TextBubble message={message} isOwn={false} />
        )}
      </View>
    </View>
  );
}

const msgItemStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarColumn: {
    width: 32,
    marginRight: spacing.sm,
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
  },
  messageColumn: {
    flex: 1,
  },
  senderName: {
    marginBottom: spacing.xs,
  },
});

function SendBar({
  value,
  onChangeText,
  onSend,
  sending,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  sending: boolean;
}) {
  const canSend = value.trim().length > 0 && !sending;

  return (
    <View style={sendBarStyles.container}>
      <View style={sendBarStyles.inputWrapper}>
        <TextInput
          style={sendBarStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder="输入消息..."
          placeholderTextColor={colors.textDisabled}
          multiline
          maxLength={1000}
          editable={!sending}
          returnKeyType="send"
          onSubmitEditing={canSend ? onSend : undefined}
          blurOnSubmit={false}
        />
      </View>
      <TouchableOpacity
        style={[sendBarStyles.sendButton, canSend ? sendBarStyles.sendButtonActive : sendBarStyles.sendButtonDisabled]}
        onPress={onSend}
        disabled={!canSend}
        activeOpacity={0.7}
      >
        <Text
          variant="buttonSmall"
          color={canSend ? colors.white : colors.textDisabled}
        >
          发送
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const sendBarStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: colors.gray50,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    maxHeight: 100,
  },
  input: {
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    lineHeight: 22,
    padding: 0,
  },
  sendButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: colors.accent,
  },
  sendButtonDisabled: {
    backgroundColor: colors.gray100,
  },
});

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const roomId = chatId;
  const currentUserId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  const [inputText, setInputText] = useState('');
  const [page, setPage] = useState(1);
  const flatListRef = useRef<FlatList>(null);

  const { data: roomData } = useQuery({
    queryKey: ['messages', 'room', roomId],
    queryFn: () => messagingService.getRooms(),
    select: (rooms: ChatRoom[]) => rooms.find((r) => r.id === roomId),
    enabled: !!roomId,
  });

  const otherParticipant = roomData?.participants.find((p) => p.userId !== currentUserId);
  const headerTitle = otherParticipant?.nickname ?? '聊天';

  const {
    data: messagesData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['messages', 'room', roomId, 'messages', page],
    queryFn: () => messagingService.getMessages(roomId, { page, limit: PAGE_SIZE }),
    enabled: !!roomId,
  });

  const messages = messagesData?.data ?? [];
  const totalPages = messagesData?.meta.totalPages ?? 1;

  const sendMutation = useMutation({
    mutationFn: (payload: { content: string; messageType?: 'text' | 'image' }) =>
      messagingService.sendMessage(roomId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'room', roomId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'rooms'] });
      setInputText('');
    },
    onError: () => {
      Alert.alert('发送失败', '消息发送失败，请重试');
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (messageId: string) => messagingService.markRead(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'rooms'] });
    },
  });

  useEffect(() => {
    if (messages.length > 0) {
      const unreadOwnMessages = messages.filter(
        (m) => m.senderId !== currentUserId && !m.isRead,
      );
      for (const msg of unreadOwnMessages) {
        markReadMutation.mutate(msg.id);
      }
    }
  }, [messages, currentUserId]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || sendMutation.isPending) return;
    sendMutation.mutate({ content: text, messageType: 'text' });
  }, [inputText, sendMutation]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (page >= totalPages) return;
      const { contentOffset } = event.nativeEvent;
      if (contentOffset.y < 50 && !isFetching) {
        setPage((prev) => prev + 1);
      }
    },
    [page, totalPages, isFetching],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<DirectMessage>) => {
      const isOwn = item.senderId === currentUserId;
      const prevMessage = index > 0 ? messages[index - 1] : undefined;
      const showTime = shouldShowTimeSeparator(item, prevMessage);
      const showAvatar = !isOwn && (prevMessage?.senderId !== item.senderId || shouldShowTimeSeparator(item, prevMessage));

      return (
        <View style={styles.messageWrapper}>
          {showTime && <TimeSeparator time={item.createdAt} />}
          <MessageItem
            message={item}
            isOwn={isOwn}
            showAvatar={showAvatar}
            senderNickname={otherParticipant?.nickname ?? ''}
            senderAvatarUrl={otherParticipant?.avatarUrl}
          />
        </View>
      );
    },
    [currentUserId, messages, otherParticipant],
  );

  const keyExtractor = useCallback((item: DirectMessage) => item.id, []);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: '聊天' }} />
        <Loading variant="fullscreen" message="加载消息..." />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerTitle: headerTitle }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.messageList}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          inverted={false}
          onContentSizeChange={() => {
            if (page === 1) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text variant="body2" color={colors.textTertiary} align="center">
                暂无消息，发送第一条消息吧
              </Text>
            </View>
          }
        />
        <SendBar
          value={inputText}
          onChangeText={setInputText}
          onSend={handleSend}
          sending={sendMutation.isPending}
        />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  messageList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexGrow: 1,
  },
  messageWrapper: {
    marginVertical: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
});

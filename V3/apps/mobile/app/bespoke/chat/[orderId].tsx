import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Svg, Path, Circle, Rect } from 'react-native-svg';
import { colors, typography, spacing, radius, shadows } from '../../../src/theme';
import { bespokeApi } from '../../../src/services/bespoke.api';
import { useAuthStore } from '../../../src/stores/auth.store';
import type { BespokeMessage, BespokeOrder } from '../../../src/types';
import {
  BESPOKE_ORDER_STATUS_LABELS,
  BESPOKE_ORDER_STATUS_COLORS,
} from '../../../src/types';

function MessageBubble({
  message,
  isOwn,
}: {
  message: BespokeMessage;
  isOwn: boolean;
}) {
  return (
    <View
      style={[
        styles.messageRow,
        isOwn ? styles.messageRowOwn : styles.messageRowOther,
      ]}
    >
      {!isOwn && (
        <View style={styles.avatarSmall}>
          <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <Circle cx="10" cy="8" r="4" fill={colors.gray300} />
            <Path d="M3 19C3 14.5817 6.134 11 10 11C13.866 11 17 14.5817 17 19" fill={colors.gray300} />
          </Svg>
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther,
        ]}
      >
        {message.messageType === 'text' ? (
          <Text
            style={[
              styles.messageText,
              isOwn ? styles.messageTextOwn : styles.messageTextOther,
            ]}
          >
            {message.content}
          </Text>
        ) : message.messageType === 'image' ? (
          <View style={styles.imageMessage}>
            <Svg width="120" height="80" viewBox="0 0 120 80" fill="none">
              <Rect width="120" height="80" rx="8" fill={colors.gray100} />
              <Circle cx="60" cy="35" r="12" stroke={colors.gray400} strokeWidth="1.5" />
              <Path d="M30 65L50 45L70 55L90 35L100 50V70H30Z" fill={colors.gray200} />
            </Svg>
            <Text style={styles.imageCaption}>图片消息</Text>
          </View>
        ) : (
          <View style={styles.fileMessage}>
            <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <Path d="M4 2H12L16 6V18H4V2Z" stroke={isOwn ? colors.white : colors.primary} strokeWidth="1.5" />
              <Path d="M12 2V6H16" stroke={isOwn ? colors.white : colors.primary} strokeWidth="1.5" />
            </Svg>
            <Text
              style={[
                styles.messageText,
                isOwn ? styles.messageTextOwn : styles.messageTextOther,
              ]}
            >
              {message.content}
            </Text>
          </View>
        )}
        <Text
          style={[
            styles.messageTime,
            isOwn ? styles.messageTimeOwn : styles.messageTimeOther,
          ]}
        >
          {formatTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function BespokeChatScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const [messages, setMessages] = useState<BespokeMessage[]>([]);
  const [order, setOrder] = useState<BespokeOrder | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!orderId) return;
    loadData();
  }, [orderId]);

  const loadData = useCallback(async () => {
    if (!orderId) return;
    try {
      const [orderData, messagesData] = await Promise.all([
        bespokeApi.getOrderById(orderId),
        bespokeApi.getMessages(orderId, { limit: 100 }),
      ]);
      setOrder(orderData);
      setMessages(messagesData.items);
    } catch {
      Alert.alert('错误', '加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputText('');
    try {
      const msg = await bespokeApi.sendMessage(orderId, {
        content: text,
        messageType: 'text',
      });
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '发送失败';
      Alert.alert('发送失败', msg);
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, orderId]);

  const handleViewQuote = useCallback(() => {
    router.push(`/bespoke/quote/${orderId}`);
  }, [orderId, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {order && (
        <View style={styles.orderBar}>
          <View style={styles.orderBarLeft}>
            <Text style={styles.orderBarTitle} numberOfLines={1}>
              {order.title ?? order.studio?.name ?? '定制沟通'}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: BESPOKE_ORDER_STATUS_COLORS[order.status] + '18' },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: BESPOKE_ORDER_STATUS_COLORS[order.status] },
                ]}
              >
                {BESPOKE_ORDER_STATUS_LABELS[order.status]}
              </Text>
            </View>
          </View>
          {(order.status === 'quoted' || order.status === 'paid' || order.status === 'in_progress') && (
            <TouchableOpacity style={styles.quoteButton} onPress={handleViewQuote} activeOpacity={0.7}>
              <Text style={styles.quoteButtonText}>查看报价</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble message={item} isOwn={item.senderId === userId} />
        )}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <Circle cx="24" cy="24" r="22" stroke={colors.divider} strokeWidth="1.5" />
              <Path d="M16 20H32M16 28H26" stroke={colors.textDisabled} strokeWidth="1.5" strokeLinecap="round" />
            </Svg>
            <Text style={styles.emptyText}>暂无消息，开始沟通吧</Text>
          </View>
        }
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="输入消息..."
          placeholderTextColor={colors.textDisabled}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
          activeOpacity={0.7}
        >
          <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <Path
              d="M2 10L18 2L14 10L18 18L2 10Z"
              fill={inputText.trim() ? colors.white : colors.textDisabled}
            />
          </Svg>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.body,
    color: colors.textTertiary,
  },
  orderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  orderBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  orderBarTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  quoteButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
  },
  quoteButtonText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  messageList: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end',
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    overflow: 'hidden',
  },
  messageBubble: {
    maxWidth: '72%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
  },
  messageBubbleOwn: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: radius.xs,
  },
  messageBubbleOther: {
    backgroundColor: colors.backgroundSecondary,
    borderBottomLeftRadius: radius.xs,
  },
  messageText: {
    ...typography.body,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: colors.white,
  },
  messageTextOther: {
    color: colors.textPrimary,
  },
  messageTime: {
    ...typography.overline,
    marginTop: spacing.xs,
  },
  messageTimeOwn: {
    color: colors.white,
    opacity: 0.7,
    textAlign: 'right',
  },
  messageTimeOther: {
    color: colors.textTertiary,
  },
  imageMessage: {
    alignItems: 'center',
  },
  imageCaption: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  fileMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxxl * 2,
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.sm,
  },
  textInput: {
    ...typography.body,
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : spacing.sm,
    maxHeight: 100,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.backgroundSecondary,
  },
});

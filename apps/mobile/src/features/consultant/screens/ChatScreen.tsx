import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRoute, useNavigation, RouteProp, NavigationProp, ParamListBase } from "@react-navigation/native";
import { useChatStore } from '../stores/chatStore';
import { useConsultantStore } from '../../../stores/consultantStore';
import type { ChatMessage, ChatTypingPayload } from '../../../types/chat';
import { ChatBubble } from '../../../design-system/ui/ChatBubble';
import { TypingIndicator } from '../components/TypingIndicator';
import { ProposalCard } from '../components/ProposalCard';
import wsService from '../../../services/websocket';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { Spacing } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';


export const ChatScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<ParamListBase>>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { roomId, consultantId, consultantName } = route.params || {};

  const { messages, currentRoom, fetchMessages, sendMessage, markAsRead, addMessage } =
    useChatStore();

  const { currentConsultant } = useConsultantStore();

  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const initChat = async () => {
      if (roomId) {
        await fetchMessages(roomId);
        await wsService.connectChat();
        wsService.joinChatRoom(roomId);
        setIsConnected(wsService.isChatConnected());
      }
    };
    void initChat();

    // Listen for new messages
    const unsubscribe = wsService.onChatMessage(roomId || "*", (payload: ChatMessage) => {
      addMessage(payload);
    });

    const unsubscribeTyping = wsService.onChatTyping(roomId || "", (payload: ChatTypingPayload) => {
      setIsTyping(payload.isTyping);
    });

    return () => {
      unsubscribe();
      unsubscribeTyping();
      if (roomId) {
        wsService.leaveChatRoom(roomId);
      }
    };
  }, [roomId, fetchMessages, addMessage]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !roomId) {
      return;
    }

    setInputText("");

    // Send via WebSocket for real-time
    wsService.sendChatMessage({
      roomId,
      content: text,
      messageType: "text",
    });

    // Also send via REST API for persistence
    try {
      await sendMessage({
        roomId,
        senderType: "user",
        content: text,
        messageType: "text",
      });
    } catch {
      // REST failure is acceptable if WS delivered it
    }

    // Mark as read
    void markAsRead(roomId);
  }, [inputText, roomId, sendMessage, markAsRead]);

  const handleInputChange = (text: string) => {
    setInputText(text);
    if (roomId) {
      wsService.sendTyping(roomId, text.length > 0);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        wsService.sendTyping(roomId, false);
      }, 2000);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.senderType === "user";

    if (item.messageType === "proposal") {
      return (
        <View style={styles.proposalWrapper}>
          <ProposalCard
            title={item.proposalData?.title || "造型方案"}
            summary={item.proposalData?.summary || item.content}
            onViewProposal={() => Alert.alert("查看方案", "方案详情功能即将上线")}
            onSaveToWardrobe={() => Alert.alert("保存", "已保存到灵感衣橱")}
          />
        </View>
      );
    }

    if (item.messageType === "system") {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemMessageText}>{item.content}</Text>
        </View>
      );
    }

    return (
      <ChatBubble
        message={item.content}
        isUser={isUser}
        timestamp={item.createdAt}
        avatar={isUser ? undefined : "🎨"}
      />
    );
  };

  const displayName = consultantName || currentConsultant?.studioName || "造型顾问";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{"<"}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerName}>{displayName}</Text>
          <View style={styles.onlineIndicator}>
            <View style={[styles.onlineDot, isConnected ? styles.dotOnline : styles.dotOffline]} />
            <Text style={styles.onlineText}>{isConnected ? "在线" : "离线"}</Text>
          </View>
        </View>
        {currentConsultant?.avatar ? (
          <Image source={{ uri: currentConsultant.avatar }} style={styles.headerAvatar} />
        ) : (
          <View style={styles.headerAvatarPlaceholder}>
            <Text style={styles.headerAvatarText}>{displayName.charAt(0)}</Text>
          </View>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item: ChatMessage) => item.id || Math.random().toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListFooterComponent={isTyping ? <TypingIndicator /> : null}
      />

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="输入消息..."
          value={inputText}
          onChangeText={handleInputChange}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>发送</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const useStyles = createStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: DesignTokens.spacing[3],
    paddingBottom: DesignTokens.spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[100],
  },
  backBtn: { padding: Spacing.sm},
  backBtnText: { fontSize: DesignTokens.typography.sizes.xl, color: colors.textPrimary },
  headerCenter: { flex: 1, alignItems: "center" },
  headerName: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: colors.textPrimary },
  onlineIndicator: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, marginTop: DesignTokens.spacing['0.5']},
  onlineDot: { width: Spacing.sm, height: Spacing.sm, borderRadius: 4 },
  dotOnline: { backgroundColor: colors.success }, // custom color
  dotOffline: { backgroundColor: DesignTokens.colors.neutral[300] },
  onlineText: { fontSize: DesignTokens.typography.sizes.xs, color: colors.textTertiary },
  headerAvatar: { width: Spacing.xl, height: Spacing.xl, borderRadius: 16 },
  headerAvatarPlaceholder: {
    width: Spacing.xl,
    height: Spacing.xl,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { color: colors.textInverse, fontSize: DesignTokens.typography.sizes.base, fontWeight: "600" },
  messagesList: { paddingHorizontal: Spacing.md, paddingTop: DesignTokens.spacing[3], paddingBottom: DesignTokens.spacing[3]},
  proposalWrapper: { marginVertical: Spacing.sm, maxWidth: "85%", alignSelf: "center" },
  systemMessage: { alignItems: "center", marginVertical: Spacing.sm},
  systemMessageText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textTertiary },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: DesignTokens.spacing['2.5'],
    paddingBottom: DesignTokens.spacing[7],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.neutral[100],
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['2.5'],
    fontSize: DesignTokens.typography.sizes.base,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['2.5'],
    borderRadius: 20,
  },
  sendButtonText: { color: colors.textInverse, fontSize: DesignTokens.typography.sizes.base, fontWeight: "500" },
}))

export default ChatScreen;

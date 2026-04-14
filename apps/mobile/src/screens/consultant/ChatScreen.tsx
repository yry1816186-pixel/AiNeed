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
import { useRoute, useNavigation } from "@react-navigation/native";
import { useChatStore } from "../../stores/chatStore";
import { useConsultantStore } from "../../stores/consultantStore";
import { ChatBubble } from "../../components/ui/ChatBubble";
import { TypingIndicator } from "../../components/consultant/TypingIndicator";
import { ProposalCard } from "../../components/consultant/ProposalCard";
import wsService from "../../services/websocket";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const ChatScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { roomId, consultantId, consultantName } = route.params || {};

  const {
    messages,
    currentRoom,
    fetchMessages,
    sendMessage,
    markAsRead,
    addMessage,
  } = useChatStore();

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
    initChat();

    // Listen for new messages
    const unsubscribe = wsService.onChatMessage(roomId || "*", (payload: any) => {
      addMessage(payload);
    });

    const unsubscribeTyping = wsService.onChatTyping(roomId || "", (payload: any) => {
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
    if (!text || !roomId) return;

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
    markAsRead(roomId);
  }, [inputText, roomId, sendMessage, markAsRead]);

  const handleInputChange = (text: string) => {
    setInputText(text);
    if (roomId) {
      wsService.sendTyping(roomId, text.length > 0);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        wsService.sendTyping(roomId, false);
      }, 2000);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
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
        keyExtractor={(item: any) => item.id || Math.random().toString()}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 20, color: "#333" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerName: { fontSize: 16, fontWeight: "600", color: "#1A1A1A" },
  onlineIndicator: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  dotOnline: { backgroundColor: "#4CAF50" },
  dotOffline: { backgroundColor: "#CCC" },
  onlineText: { fontSize: 11, color: "#888" },
  headerAvatar: { width: 32, height: 32, borderRadius: 16 },
  headerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#C67B5C",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  messagesList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  proposalWrapper: { marginVertical: 8, maxWidth: "85%", alignSelf: "center" },
  systemMessage: { alignItems: "center", marginVertical: 8 },
  systemMessageText: { fontSize: 12, color: "#999" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: 28,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#C67B5C",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "500" },
});

export default ChatScreen;

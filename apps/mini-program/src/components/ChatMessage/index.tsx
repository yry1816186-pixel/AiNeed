import { View, Text } from "@tarojs/components";
import "./index.scss";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

/** Chat message bubble with XUNO design tokens */
export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <View className={`chat-message ${isUser ? "chat-message--user" : "chat-message--assistant"}`}>
      {!isUser && (
        <View className="chat-message__avatar">
          <Text className="chat-message__avatar-text">h</Text>
        </View>
      )}
      <View
        className={`chat-message__bubble ${
          isUser ? "chat-message__bubble--user" : "chat-message__bubble--assistant"
        }`}
      >
        <Text className="chat-message__text">{content}</Text>
      </View>
    </View>
  );
}

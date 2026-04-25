import { View, Text, Input, ScrollView } from "@tarojs/components";
import { useState, useRef, useCallback } from "react";
import Taro, { useShareAppMessage } from "@tarojs/taro";
import ChatMessage from "../../components/ChatMessage";
import QuickReply from "../../components/QuickReply";
import { sendMessage, type DialogResponse } from "../../services/dialog";
import "./index.scss";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const sessionIdRef = useRef<string | undefined>(undefined);

  // Share chat context
  useShareAppMessage(() => ({
    title: "和伊伊聊穿搭",
    path: "/pages/index/index",
  }));

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      Taro.pageScrollTo({ scrollTop: 99999, duration: 300 });
    }, 100);
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);
    setQuickReplies([]);

    try {
      const res: DialogResponse = await sendMessage(text, sessionIdRef.current);
      sessionIdRef.current = res.sessionId;

      const assistantMsg: Message = {
        id: `msg-${Date.now()}-reply`,
        role: "assistant",
        content: res.reply,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setQuickReplies(res.quickReplies || []);
      scrollToBottom();
    } catch {
      const errorMsg: Message = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: "抱歉，网络似乎出了点问题，请稍后再试。",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [inputValue, loading, scrollToBottom]);

  const handleQuickReply = useCallback(
    (option: string) => {
      setInputValue(option);
      // Auto-send quick reply
      setTimeout(() => {
        setInputValue(option);
      }, 0);
      // Trigger send by setting input then calling handleSend
      // We use a slight workaround since state update is async
      const userMsg: Message = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: option,
      };

      setMessages((prev) => [...prev, userMsg]);
      setQuickReplies([]);
      setLoading(true);

      sendMessage(option, sessionIdRef.current)
        .then((res) => {
          sessionIdRef.current = res.sessionId;
          const assistantMsg: Message = {
            id: `msg-${Date.now()}-reply`,
            role: "assistant",
            content: res.reply,
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setQuickReplies(res.quickReplies || []);
          scrollToBottom();
        })
        .catch(() => {
          const errorMsg: Message = {
            id: `msg-${Date.now()}-error`,
            role: "assistant",
            content: "抱歉，网络似乎出了点问题，请稍后再试。",
          };
          setMessages((prev) => [...prev, errorMsg]);
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [scrollToBottom]
  );

  return (
    <View className="chat">
      <ScrollView className="chat__messages" scrollY>
        {messages.length === 0 && (
          <View className="chat__empty">
            <Text className="chat__empty-text">和伊伊聊聊你的穿搭问题吧</Text>
          </View>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
        ))}

        {loading && (
          <View className="chat__loading">
            <Text className="chat__loading-text">伊伊正在思考...</Text>
          </View>
        )}

        {quickReplies.length > 0 && !loading && (
          <QuickReply options={quickReplies} onSelect={handleQuickReply} />
        )}
      </ScrollView>

      <View className="chat__input-bar">
        <Input
          className="chat__input"
          placeholder="问问伊伊穿搭建议..."
          value={inputValue}
          onInput={(e) => setInputValue(e.detail.value)}
          onConfirm={handleSend}
          confirmType="send"
          disabled={loading}
        />
        <View
          className={`chat__send-btn ${inputValue.trim() ? "chat__send-btn--active" : ""}`}
          onClick={handleSend}
        >
          <Text className="chat__send-text">发送</Text>
        </View>
      </View>
    </View>
  );
}

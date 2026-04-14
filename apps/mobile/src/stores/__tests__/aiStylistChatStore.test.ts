import { useAiStylistChatStore, ChatMessage } from "../aiStylistChatStore";

// Mocks
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));

const mockMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: "msg-1",
  role: "user",
  content: "你好",
  timestamp: "2025-01-01T00:00:00Z",
  ...overrides,
});

describe("useAiStylistChatStore", () => {
  beforeEach(() => {
    useAiStylistChatStore.setState({ messages: [] });
  });

  // ==================== 初始状态 ====================

  describe("初始状态", () => {
    test("messages 应为空数组", () => {
      expect(useAiStylistChatStore.getState().messages).toEqual([]);
    });
  });

  // ==================== addMessage ====================

  describe("addMessage", () => {
    test("应添加消息到列表", () => {
      const message = mockMessage();
      useAiStylistChatStore.getState().addMessage(message);
      expect(useAiStylistChatStore.getState().messages).toHaveLength(1);
      expect(useAiStylistChatStore.getState().messages[0]).toEqual(message);
    });

    test("应追加消息到列表末尾", () => {
      const msg1 = mockMessage({ id: "msg-1", content: "第一条" });
      const msg2 = mockMessage({ id: "msg-2", content: "第二条" });
      useAiStylistChatStore.getState().addMessage(msg1);
      useAiStylistChatStore.getState().addMessage(msg2);
      expect(useAiStylistChatStore.getState().messages).toHaveLength(2);
      expect(useAiStylistChatStore.getState().messages[0].content).toBe(
        "第一条",
      );
      expect(useAiStylistChatStore.getState().messages[1].content).toBe(
        "第二条",
      );
    });

    test("应支持添加 user 角色消息", () => {
      const message = mockMessage({ role: "user", content: "推荐一套穿搭" });
      useAiStylistChatStore.getState().addMessage(message);
      expect(useAiStylistChatStore.getState().messages[0].role).toBe("user");
    });

    test("应支持添加 assistant 角色消息", () => {
      const message = mockMessage({
        role: "assistant",
        content: "好的，为您推荐...",
      });
      useAiStylistChatStore.getState().addMessage(message);
      expect(useAiStylistChatStore.getState().messages[0].role).toBe(
        "assistant",
      );
    });
  });

  // ==================== setMessages ====================

  describe("setMessages", () => {
    test("应替换所有消息", () => {
      useAiStylistChatStore.getState().addMessage(mockMessage({ id: "old" }));
      const newMessages = [
        mockMessage({ id: "new-1" }),
        mockMessage({ id: "new-2" }),
      ];
      useAiStylistChatStore.getState().setMessages(newMessages);
      expect(useAiStylistChatStore.getState().messages).toEqual(newMessages);
      expect(useAiStylistChatStore.getState().messages).toHaveLength(2);
    });

    test("应能设置为空数组", () => {
      useAiStylistChatStore.getState().addMessage(mockMessage());
      useAiStylistChatStore.getState().setMessages([]);
      expect(useAiStylistChatStore.getState().messages).toEqual([]);
    });
  });

  // ==================== clearMessages ====================

  describe("clearMessages", () => {
    test("应清空所有消息", () => {
      useAiStylistChatStore.getState().addMessage(
        mockMessage({ id: "msg-1" }),
      );
      useAiStylistChatStore.getState().addMessage(
        mockMessage({ id: "msg-2" }),
      );
      expect(useAiStylistChatStore.getState().messages).toHaveLength(2);

      useAiStylistChatStore.getState().clearMessages();
      expect(useAiStylistChatStore.getState().messages).toEqual([]);
    });

    test("在空列表上调用不应报错", () => {
      useAiStylistChatStore.getState().clearMessages();
      expect(useAiStylistChatStore.getState().messages).toEqual([]);
    });
  });
});

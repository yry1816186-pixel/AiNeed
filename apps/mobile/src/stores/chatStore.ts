import { create } from "zustand";
import { chatApi } from "../services/api/chat.api";
import type {
  ChatRoom,
  ChatMessage,
  SendMessageRequest,
  ChatRoomListParams,
  MessageListParams,
} from "../types/chat";
import type { PaginatedResponse } from "../types/api";

interface ChatState {
  rooms: ChatRoom[];
  currentRoom: ChatRoom | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;

  fetchRooms: (params?: ChatRoomListParams) => Promise<void>;
  createRoom: (consultantId: string) => Promise<ChatRoom | null>;
  fetchMessages: (roomId: string, beforeId?: string) => Promise<void>;
  sendMessage: (data: SendMessageRequest) => Promise<void>;
  markAsRead: (roomId: string, lastMessageId?: string) => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  rooms: [],
  currentRoom: null,
  messages: [],
  isLoading: false,
  error: null,

  fetchRooms: async (params) => {
    set({ isLoading: true });
    try {
      const res = await chatApi.getRooms(params);
      if (res.success && res.data) {
        const paginated = res.data as PaginatedResponse<ChatRoom>;
        set({ rooms: paginated.items ?? (res.data as unknown as ChatRoom[]), isLoading: false });
      } else {
        set({ rooms: [], isLoading: false });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      set({ error: message, isLoading: false });
    }
  },

  createRoom: async (consultantId) => {
    try {
      const res = await chatApi.createRoom(consultantId);
      if (res.success && res.data) {
        const room = res.data as ChatRoom;
        set({ currentRoom: room });
        return room;
      }
      return null;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      set({ error: message });
      throw e;
    }
  },

  fetchMessages: async (roomId, beforeId) => {
    set({ isLoading: true });
    try {
      const params: MessageListParams = { beforeId };
      const res = await chatApi.getMessages(roomId, params);
      if (res.success && res.data) {
        const paginated = res.data as PaginatedResponse<ChatMessage>;
        const newMessages = paginated.items ?? (res.data as unknown as ChatMessage[]);
        set((state) => ({
          messages: beforeId ? [...newMessages, ...state.messages] : newMessages,
          isLoading: false,
        }));
      } else {
        set({ isLoading: false });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      set({ error: message, isLoading: false });
    }
  },

  sendMessage: async (data) => {
    try {
      const res = await chatApi.sendMessage(data);
      if (res.success && res.data) {
        get().addMessage(res.data as ChatMessage);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      set({ error: message });
    }
  },

  markAsRead: async (roomId, lastMessageId) => {
    try {
      await chatApi.markAsRead(roomId, lastMessageId);
    } catch (error) {
      // Silently fail read receipts
      console.error('Chat operation failed:', error);
    }
  },

  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  clearError: () => set({ error: null }),
}));

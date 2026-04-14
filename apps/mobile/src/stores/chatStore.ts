import { create } from "zustand";
import { chatApi } from "../services/api/chat.api";

interface ChatState {
  rooms: any[];
  currentRoom: any | null;
  messages: any[];
  isLoading: boolean;
  error: string | null;

  fetchRooms: () => Promise<void>;
  createRoom: (consultantId: string) => Promise<any>;
  fetchMessages: (roomId: string, beforeId?: string) => Promise<void>;
  sendMessage: (data: any) => Promise<void>;
  markAsRead: (roomId: string, lastMessageId?: string) => Promise<void>;
  addMessage: (message: any) => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  rooms: [],
  currentRoom: null,
  messages: [],
  isLoading: false,
  error: null,

  fetchRooms: async () => {
    set({ isLoading: true });
    try {
      const res = await chatApi.getRooms();
      set({ rooms: res.data.data, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  createRoom: async (consultantId) => {
    try {
      const res = await chatApi.createRoom(consultantId);
      set({ currentRoom: res.data });
      return res.data;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  },

  fetchMessages: async (roomId, beforeId) => {
    set({ isLoading: true });
    try {
      const res = await chatApi.getMessages(roomId, { beforeId });
      set((state) => ({
        messages: beforeId
          ? [...res.data.data, ...state.messages]
          : res.data.data,
        isLoading: false,
      }));
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  sendMessage: async (data) => {
    try {
      const res = await chatApi.sendMessage(data);
      get().addMessage(res.data);
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  markAsRead: async (roomId, lastMessageId) => {
    try {
      await chatApi.markAsRead(roomId, lastMessageId);
    } catch {
      // Silently fail read receipts
    }
  },

  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  clearError: () => set({ error: null }),
}));

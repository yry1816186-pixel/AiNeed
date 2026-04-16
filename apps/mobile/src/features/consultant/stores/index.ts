﻿import { create } from "zustand";
import { consultantApi } from "../../../services/api/consultant.api";
import type {
  ConsultantProfile,
  MatchResult,
  ServiceBooking,
  AvailableTimeSlot,
  ConsultantListParams,
  BookingListParams,
  ConsultantMatchRequest,
  CreateBookingRequest,
} from "../../../types/consultant";
import type { PaginatedResponse } from "../../../types/api";

interface ConsultantState {
  consultants: ConsultantProfile[];
  currentConsultant: ConsultantProfile | null;
  matchResults: MatchResult[];
  bookings: ServiceBooking[];
  availableSlots: AvailableTimeSlot[];
  isLoading: boolean;
  error: string | null;

  fetchConsultants: (params?: ConsultantListParams) => Promise<void>;
  fetchConsultantById: (id: string) => Promise<void>;
  matchConsultants: (data: ConsultantMatchRequest) => Promise<void>;
  fetchAvailableSlots: (consultantId: string, date: string) => Promise<void>;
  createBooking: (data: CreateBookingRequest) => Promise<ServiceBooking | null>;
  fetchBookings: (params?: BookingListParams) => Promise<void>;
  clearError: () => void;
}

export const useConsultantStore = create<ConsultantState>((set) => ({
  consultants: [],
  currentConsultant: null,
  matchResults: [],
  bookings: [],
  availableSlots: [],
  isLoading: false,
  error: null,

  fetchConsultants: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const res = await consultantApi.getProfiles(params);
      if (res.success && res.data) {
        const paginated = res.data as PaginatedResponse<ConsultantProfile>;
        set({
          consultants: paginated.items ?? (res.data as unknown as ConsultantProfile[]),
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      set({ error: message, isLoading: false });
    }
  },

  fetchConsultantById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await consultantApi.getProfileById(id);
      if (res.success && res.data) {
        set({ currentConsultant: res.data as ConsultantProfile, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      set({ error: message, isLoading: false });
    }
  },

  matchConsultants: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await consultantApi.matchConsultants(data);
      if (res.success && res.data) {
        set({ matchResults: res.data as MatchResult[], isLoading: false });
      } else {
        set({ matchResults: [], isLoading: false });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      set({ error: message, isLoading: false });
    }
  },

  fetchAvailableSlots: async (consultantId, date) => {
    set({ isLoading: true, error: null });
    try {
      const res = await consultantApi.getAvailableSlots(consultantId, date);
      if (res.success && res.data) {
        set({ availableSlots: res.data as AvailableTimeSlot[], isLoading: false });
      } else {
        set({ availableSlots: [], isLoading: false });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      set({ error: message, isLoading: false });
    }
  },

  createBooking: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await consultantApi.createBooking(data);
      set({ isLoading: false });
      if (res.success && res.data) {
        return res.data as ServiceBooking;
      }
      return null;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      set({ error: message, isLoading: false });
      throw e;
    }
  },

  fetchBookings: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const res = await consultantApi.getBookings(params);
      if (res.success && res.data) {
        const paginated = res.data as PaginatedResponse<ServiceBooking>;
        set({
          bookings: paginated.items ?? (res.data as unknown as ServiceBooking[]),
          isLoading: false,
        });
      } else {
        set({ bookings: [], isLoading: false });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      set({ error: message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

// ==================== Chat Store ====================

interface ChatRoom {
  id: string;
  consultantId: string;
  consultantName: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
}

interface ChatMessageItem {
  id: string;
  roomId: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  avatar?: string;
  proposalData?: Record<string, unknown>;
}

interface ChatState {
  messages: ChatMessageItem[];
  currentRoom: ChatRoom | null;
  isLoading: boolean;
  error: string | null;

  fetchMessages: (roomId: string) => Promise<void>;
  sendMessage: (roomId: string, content: string) => Promise<void>;
  markAsRead: (roomId: string) => Promise<void>;
  addMessage: (message: ChatMessageItem) => void;
  setCurrentRoom: (room: ChatRoom | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentRoom: null,
  isLoading: false,
  error: null,

  fetchMessages: async (roomId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Stub - will be connected to API
      set({ isLoading: false });
    } catch {
      set({ error: "Failed to fetch messages", isLoading: false });
    }
  },

  sendMessage: async (roomId: string, content: string) => {
    try {
      // Stub - will be connected to API
      const message: ChatMessageItem = {
        id: `msg_${Date.now()}`,
        roomId,
        content,
        isUser: true,
        timestamp: new Date().toISOString(),
      };
      set((state) => ({ messages: [...state.messages, message] }));
    } catch {
      set({ error: "Failed to send message" });
    }
  },

  markAsRead: async (roomId: string) => {
    try {
      // Stub - will be connected to API
    } catch {
      // silent
    }
  },

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setCurrentRoom: (room) => set({ currentRoom: room }),

  clearMessages: () => set({ messages: [], currentRoom: null }),
}));

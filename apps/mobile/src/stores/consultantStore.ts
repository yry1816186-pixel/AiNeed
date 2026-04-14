import { create } from "zustand";
import { consultantApi } from "../services/api/consultant.api";

interface ConsultantState {
  consultants: any[];
  currentConsultant: any | null;
  matchResults: any[];
  bookings: any[];
  availableSlots: any[];
  isLoading: boolean;
  error: string | null;

  fetchConsultants: (params?: any) => Promise<void>;
  fetchConsultantById: (id: string) => Promise<void>;
  matchConsultants: (data: any) => Promise<void>;
  fetchAvailableSlots: (consultantId: string, date: string) => Promise<void>;
  createBooking: (data: any) => Promise<any>;
  fetchBookings: (params?: any) => Promise<void>;
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
      set({ consultants: res.data.data, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  fetchConsultantById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await consultantApi.getProfileById(id);
      set({ currentConsultant: res.data, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  matchConsultants: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await consultantApi.matchConsultants(data);
      set({ matchResults: res.data, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  fetchAvailableSlots: async (consultantId, date) => {
    set({ isLoading: true, error: null });
    try {
      const res = await consultantApi.getAvailableSlots(consultantId, date);
      set({ availableSlots: res.data, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  createBooking: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await consultantApi.createBooking(data);
      set({ isLoading: false });
      return res.data;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },

  fetchBookings: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const res = await consultantApi.getBookings(params);
      set({ bookings: res.data.data, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

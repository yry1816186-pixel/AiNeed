import { create } from "zustand";
import {
  aiStylistApi,
  type AiStylistSessionResponse,
  type AiStylistOutfitItem,
} from "../../../services/api/ai-stylist.api";

/**
 * AI Stylist Store - manages current outfit plan, history, preferences
 */

export interface OutfitPlanDetail {
  sessionId: string;
  lookSummary: string;
  whyItFits: string[];
  weatherInfo?: {
    temperature: number;
    condition: string;
    suggestion: string;
  };
  outfits: {
    title: string;
    items: AiStylistOutfitItem[];
    styleExplanation: string[];
    estimatedTotalPrice?: number;
  }[];
  createdAt: string;
}

export interface AlternativeItem {
  id: string;
  name: string;
  category: string;
  imageUrl: string | null;
  price: number | null;
  brand: string | null;
  tags: string[];
  matchScore: number;
}

export interface PresetQuestion {
  id: string;
  text: string;
  icon: string;
  category: "daily" | "style" | "occasion" | "weather";
}

export interface CalendarDay {
  date: string;
  sessionCount: number;
  hasOutfitPlan: boolean;
}

export interface ArchivedSession {
  id: string;
  status: string;
  goal?: string;
  hasOutfitPlan: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AiStylistState {
  currentSessionId: string | null;
  currentOutfitPlan: OutfitPlanDetail | null;

  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;

  presetQuestions: PresetQuestion[];
  isNewUser: boolean;

  calendarDays: CalendarDay[];
  archivedSessions: ArchivedSession[];

  alternatives: AlternativeItem[];
  isAlternativesLoading: boolean;

  createSession: (entry?: string, goal?: string) => Promise<string | null>;
  sendMessage: (
    message: string,
    latitude?: number,
    longitude?: number
  ) => Promise<AiStylistSessionResponse | null>;
  fetchOutfitPlan: (sessionId: string) => Promise<void>;
  fetchAlternatives: (sessionId: string, outfitIndex: number, itemIndex: number) => Promise<void>;
  replaceItem: (
    sessionId: string,
    outfitIndex: number,
    itemIndex: number,
    newItemId: string
  ) => Promise<boolean>;
  submitFeedback: (
    sessionId: string,
    outfitIndex: number,
    action: "like" | "dislike",
    itemId?: string,
    rating?: number,
    dislikeReason?: string
  ) => Promise<boolean>;
  fetchPresetQuestions: () => Promise<void>;
  fetchCalendarDays: (year: number, month: number) => Promise<void>;
  fetchArchivedSessions: (date: string) => Promise<void>;
  setCurrentSessionId: (id: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  currentSessionId: null,
  currentOutfitPlan: null,
  isLoading: false,
  isGenerating: false,
  error: null,
  presetQuestions: [],
  isNewUser: false,
  calendarDays: [],
  archivedSessions: [],
  alternatives: [],
  isAlternativesLoading: false,
};

export const useAiStylistStore = create<AiStylistState>((set, get) => ({
  ...initialState,

  createSession: async (entry?: string, goal?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await aiStylistApi.createSession({ entry, goal });
      if (response.success && response.data) {
        const sessionId = response.data.sessionId;
        set({ currentSessionId: sessionId, isLoading: false });
        return sessionId ?? null;
      }
      set({ error: response.error?.message || "Failed to create session", isLoading: false });
      return null;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to create session";
      set({ error: message, isLoading: false });
      return null;
    }
  },

  sendMessage: async (message: string, latitude?: number, longitude?: number) => {
    const { currentSessionId } = get();
    if (!currentSessionId) {
      return null;
    }
    set({ isGenerating: true, error: null });
    try {
      const response = await aiStylistApi.sendMessage(
        currentSessionId,
        message,
        latitude,
        longitude
      );
      if (response.success && response.data) {
        set({ isGenerating: false });
        return response.data;
      }
      set({ error: response.error?.message || "Failed to send message", isGenerating: false });
      return null;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to send message";
      set({ error: message, isGenerating: false });
      return null;
    }
  },

  fetchOutfitPlan: async (sessionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await aiStylistApi.getOutfitPlan(sessionId);
      if (response.success && response.data) {
        set({ currentOutfitPlan: response.data as OutfitPlanDetail, isLoading: false });
      } else {
        set({ error: response.error?.message || "Failed to fetch outfit plan", isLoading: false });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to fetch outfit plan";
      set({ error: message, isLoading: false });
    }
  },

  fetchAlternatives: async (sessionId: string, outfitIndex: number, itemIndex: number) => {
    set({ isAlternativesLoading: true, error: null });
    try {
      const response = await aiStylistApi.getAlternatives(sessionId, outfitIndex, itemIndex);
      if (response.success && response.data) {
        const data = response.data;
        set({
          alternatives: Array.isArray(data)
            ? (data as AlternativeItem[])
            : ((data as Record<string, unknown>).items as AlternativeItem[]) ?? [],
          isAlternativesLoading: false,
        });
      } else {
        set({ isAlternativesLoading: false });
      }
    } catch {
      set({ isAlternativesLoading: false });
    }
  },

  replaceItem: async (
    sessionId: string,
    outfitIndex: number,
    itemIndex: number,
    newItemId: string
  ) => {
    try {
      const response = await aiStylistApi.replaceItem(sessionId, outfitIndex, itemIndex, newItemId);
      if (response.success) {
        await get().fetchOutfitPlan(sessionId);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  submitFeedback: async (
    sessionId: string,
    outfitIndex: number,
    action: "like" | "dislike",
    itemId?: string,
    rating?: number,
    dislikeReason?: string
  ) => {
    try {
      const response = await aiStylistApi.submitFeedback(sessionId, {
        outfitIndex,
        action,
        itemId,
        rating,
        dislikeReason,
      });
      return response.success;
    } catch {
      return false;
    }
  },

  fetchPresetQuestions: async () => {
    try {
      const response = await aiStylistApi.getPresetQuestions();
      if (response.success && response.data) {
        const data = response.data as Record<string, unknown>;
        set({
          presetQuestions: (data.questions as PresetQuestion[]) || [],
          isNewUser: (data.isNewUser as boolean) ?? false,
        });
      }
    } catch (error) {
      // silent fail
      console.error('AI Stylist operation failed:', error);
    }
  },

  fetchCalendarDays: async (year: number, month: number) => {
    try {
      const response = await aiStylistApi.getCalendarDays(year, month);
      if (response.success && response.data) {
        set({ calendarDays: response.data as unknown as CalendarDay[] });
      }
    } catch {
      // silent fail
    }
  },

  fetchArchivedSessions: async (date: string) => {
    try {
      const response = await aiStylistApi.getSessionsByDate(date);
      if (response.success && response.data) {
        set({ archivedSessions: response.data as unknown as ArchivedSession[] });
      }
    } catch {
      // silent fail
    }
  },

  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  clearError: () => set({ error: null }),
  reset: () => set(initialState),
}));

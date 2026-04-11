import { create } from 'zustand';
import type {
  StylistSession,
  StylistMessage,
  StylistOutfit,
  StylistOccasion,
  StylistBudget,
  StylistStyleTag,
  StylistOutfitImage,
} from '../types';

export type StylistStep = 'select' | 'loading' | 'result';

export interface StylistState {
  currentSession: StylistSession | null;
  messages: StylistMessage[];
  isLoading: boolean;
  step: StylistStep;
  selectedOccasion: StylistOccasion | null;
  selectedBudget: StylistBudget | null;
  selectedStyles: StylistStyleTag[];
  currentOutfits: StylistOutfit[];
  currentOutfitIndex: number;
  streamingText: string;
  outfitImage: StylistOutfitImage | null;
  error: string | null;
  retryCount: number;

  setSession: (session: StylistSession | null) => void;
  setMessages: (messages: StylistMessage[]) => void;
  addMessage: (message: StylistMessage) => void;
  setLoading: (loading: boolean) => void;
  setStep: (step: StylistStep) => void;
  selectOccasion: (occasion: StylistOccasion | null) => void;
  selectBudget: (budget: StylistBudget | null) => void;
  toggleStyle: (style: StylistStyleTag) => void;
  setOutfits: (outfits: StylistOutfit[]) => void;
  setCurrentOutfitIndex: (index: number) => void;
  appendStreamingText: (text: string) => void;
  setStreamingText: (text: string) => void;
  setOutfitImage: (image: StylistOutfitImage | null) => void;
  setError: (error: string | null) => void;
  incrementRetry: () => void;
  resetSelections: () => void;
  resetResults: () => void;
  resetAll: () => void;
}

const initialState = {
  currentSession: null,
  messages: [],
  isLoading: false,
  step: 'select' as StylistStep,
  selectedOccasion: null,
  selectedBudget: null,
  selectedStyles: [],
  currentOutfits: [],
  currentOutfitIndex: 0,
  streamingText: '',
  outfitImage: null,
  error: null,
  retryCount: 0,
};

export const useStylistStore = create<StylistState>()((set) => ({
  ...initialState,

  setSession: (session) => set({ currentSession: session }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setLoading: (loading) => set({ isLoading: loading }),

  setStep: (step) => set({ step }),

  selectOccasion: (occasion) => set({ selectedOccasion: occasion }),

  selectBudget: (budget) => set({ selectedBudget: budget }),

  toggleStyle: (style) =>
    set((state) => {
      const exists = state.selectedStyles.includes(style);
      return {
        selectedStyles: exists
          ? state.selectedStyles.filter((s) => s !== style)
          : [...state.selectedStyles, style],
      };
    }),

  setOutfits: (outfits) => set({ currentOutfits: outfits }),

  setCurrentOutfitIndex: (index) => set({ currentOutfitIndex: index }),

  appendStreamingText: (text) =>
    set((state) => ({ streamingText: state.streamingText + text })),

  setStreamingText: (text) => set({ streamingText: text }),

  setOutfitImage: (image) => set({ outfitImage: image }),

  setError: (error) => set({ error }),

  incrementRetry: () =>
    set((state) => ({ retryCount: state.retryCount + 1 })),

  resetSelections: () =>
    set({
      selectedOccasion: null,
      selectedBudget: null,
      selectedStyles: [],
    }),

  resetResults: () =>
    set({
      currentOutfits: [],
      currentOutfitIndex: 0,
      streamingText: '',
      outfitImage: null,
      error: null,
      retryCount: 0,
    }),

  resetAll: () => set(initialState),
}));

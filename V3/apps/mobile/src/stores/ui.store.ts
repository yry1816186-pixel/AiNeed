import { create } from 'zustand';

export interface UIStore {
  globalLoading: boolean;
  globalLoadingText: string;

  searchQuery: string;
  searchActive: boolean;

  activeTab: string;

  actionSheetVisible: boolean;

  setGlobalLoading: (loading: boolean, text?: string) => void;
  setSearchQuery: (query: string) => void;
  setSearchActive: (active: boolean) => void;
  setActiveTab: (tab: string) => void;
  showActionSheet: () => void;
  hideActionSheet: () => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  globalLoading: false,
  globalLoadingText: '',
  searchQuery: '',
  searchActive: false,
  activeTab: 'home',
  actionSheetVisible: false,

  setGlobalLoading: (loading, text) =>
    set({ globalLoading: loading, globalLoadingText: text ?? '' }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSearchActive: (active) => set({ searchActive: active }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  showActionSheet: () => set({ actionSheetVisible: true }),

  hideActionSheet: () => set({ actionSheetVisible: false }),
}));

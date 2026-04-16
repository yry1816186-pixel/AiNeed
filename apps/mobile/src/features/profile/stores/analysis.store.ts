import { create } from "zustand";
import { profileApi } from "../../../services/api/profile.api";

interface ClothingAnalysis {
  category: string;
  style: string[];
  colors: string[];
  occasions: string[];
  seasons: string[];
  confidence: number;
}

interface BodyAnalysis {
  body_type: string;
  skin_tone: string;
  color_season: string;
  recommendations: {
    suitable: string[];
    avoid: string[];
    tips: string[];
  };
}

interface AnalysisState {
  clothingAnalysis: ClothingAnalysis | null;
  bodyAnalysis: BodyAnalysis | null;
  currentImageUri: string | null;
  isAnalyzing: boolean;
  error: string | null;
  setClothingAnalysis: (analysis: ClothingAnalysis | null) => void;
  setBodyAnalysis: (analysis: BodyAnalysis | null) => void;
  setCurrentImage: (uri: string | null) => void;
  setAnalyzing: (analyzing: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  clearAnalysis: () => void;
  fetchClothingAnalysis: () => Promise<void>;
  fetchBodyAnalysis: () => Promise<void>;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  clothingAnalysis: null,
  bodyAnalysis: null,
  currentImageUri: null,
  isAnalyzing: false,
  error: null,
  setClothingAnalysis: (clothingAnalysis) => set({ clothingAnalysis }),
  setBodyAnalysis: (bodyAnalysis) => set({ bodyAnalysis }),
  setCurrentImage: (currentImageUri) => set({ currentImageUri }),
  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  clearAnalysis: () => set({ clothingAnalysis: null, bodyAnalysis: null, currentImageUri: null, error: null }),

  fetchClothingAnalysis: async () => {
    set({ isAnalyzing: true, error: null });
    try {
      // TODO: 连接后端服装分析 API 后替换（当前后端无直接服装分析端点）
      set({ error: '功能开发中，敬请期待', isAnalyzing: false });
    } catch {
      set({ error: '获取服装分析失败，请稍后重试', isAnalyzing: false });
    }
  },

  fetchBodyAnalysis: async () => {
    set({ isAnalyzing: true, error: null });
    try {
      const response = await profileApi.getBodyAnalysis();
      if (response.success && response.data) {
        const report = response.data;
        set({
          bodyAnalysis: {
            body_type: report.bodyType?.type ?? 'rectangle',
            skin_tone: 'medium',
            color_season: 'autumn',
            recommendations: {
              suitable: report.recommendations?.idealStyles ?? [],
              avoid: report.recommendations?.avoidStyles ?? [],
              tips: report.tips ?? [],
            },
          },
          isAnalyzing: false,
        });
      } else {
        set({ error: '获取体型分析失败，请稍后重试', isAnalyzing: false });
      }
    } catch {
      set({ error: '获取体型分析失败，请稍后重试', isAnalyzing: false });
    }
  },
}));

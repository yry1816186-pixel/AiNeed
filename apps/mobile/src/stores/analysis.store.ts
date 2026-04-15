import { create } from "zustand";

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
  setClothingAnalysis: (analysis: ClothingAnalysis | null) => void;
  setBodyAnalysis: (analysis: BodyAnalysis | null) => void;
  setCurrentImage: (uri: string | null) => void;
  setAnalyzing: (analyzing: boolean) => void;
  clearAnalysis: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  clothingAnalysis: null,
  bodyAnalysis: null,
  currentImageUri: null,
  isAnalyzing: false,
  setClothingAnalysis: (clothingAnalysis) => set({ clothingAnalysis }),
  setBodyAnalysis: (bodyAnalysis) => set({ bodyAnalysis }),
  setCurrentImage: (currentImageUri) => set({ currentImageUri }),
  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  clearAnalysis: () => set({ clothingAnalysis: null, bodyAnalysis: null, currentImageUri: null }),
}));

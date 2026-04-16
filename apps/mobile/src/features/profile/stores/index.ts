﻿import { create } from "zustand";

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

// ==================== Profile Store ====================

import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import {
  profileApi,
  type UserProfile,
  type UpdateProfileDto,
  type BodyAnalysisReport,
  type ColorAnalysisReport,
} from "../../../services/api/profile.api";
import apiClient from "../../../services/api/client";
import type { ApiResponse } from "../../../types";

interface Completeness {
  percentage: number;
  missingFields: string[];
}

interface ProfileState {
  profile: UserProfile | null;
  completeness: Completeness | null;
  bodyAnalysis: BodyAnalysisReport | null;
  colorAnalysis: ColorAnalysisReport | null;
  isLoading: boolean;
  error: string | null;

  loadProfile: () => Promise<void>;
  loadCompleteness: () => Promise<void>;
  loadBodyAnalysis: () => Promise<void>;
  loadColorAnalysis: () => Promise<void>;
  updateProfile: (data: UpdateProfileDto) => Promise<void>;
  refreshAll: () => Promise<void>;
  clearProfile: () => void;
}

export const useProfileStore = createWithEqualityFn<ProfileState>(
  (set) => ({
    profile: null,
    completeness: null,
    bodyAnalysis: null,
    colorAnalysis: null,
    isLoading: false,
    error: null,

    loadProfile: async () => {
      set({ isLoading: true, error: null });
      try {
        const response: ApiResponse<UserProfile> = await profileApi.getProfile();
        if (response.success && response.data) {
          set({ profile: response.data, isLoading: false });
        } else {
          set({ error: response.error?.message || "Failed to fetch profile", isLoading: false });
        }
      } catch (err) {
        set({ error: (err as Error).message, isLoading: false });
      }
    },

    loadCompleteness: async () => {
      try {
        const response: ApiResponse<Completeness> = await apiClient.get<Completeness>(
          "/profile/completeness"
        );
        if (response.success && response.data) {
          set({ completeness: response.data });
        }
      } catch {
        // Non-blocking completeness load
      }
    },

    loadBodyAnalysis: async () => {
      try {
        const response: ApiResponse<BodyAnalysisReport> = await profileApi.getBodyAnalysis();
        if (response.success && response.data) {
          set({ bodyAnalysis: response.data });
        }
      } catch {
        // Non-blocking analysis load
      }
    },

    loadColorAnalysis: async () => {
      try {
        const response: ApiResponse<ColorAnalysisReport> = await profileApi.getColorAnalysis();
        if (response.success && response.data) {
          set({ colorAnalysis: response.data });
        }
      } catch {
        // Non-blocking analysis load
      }
    },

    updateProfile: async (payload: UpdateProfileDto) => {
      set({ isLoading: true, error: null });
      try {
        const response: ApiResponse<UserProfile> = await profileApi.updateProfile(payload);
        if (response.success && response.data) {
          set({ profile: response.data, isLoading: false });
        } else {
          set({ error: response.error?.message || "Failed to update profile", isLoading: false });
        }
      } catch (err) {
        set({ error: (err as Error).message, isLoading: false });
      }
    },

    refreshAll: async () => {
      set({ isLoading: true, error: null });
      try {
        const [profileRes, completenessRes, bodyRes, colorRes] = await Promise.all([
          profileApi.getProfile(),
          apiClient.get<Completeness>("/profile/completeness"),
          profileApi.getBodyAnalysis(),
          profileApi.getColorAnalysis(),
        ]);

        set({
          profile: profileRes.success ? profileRes.data ?? null : null,
          completeness: completenessRes.success ? completenessRes.data ?? null : null,
          bodyAnalysis: bodyRes.success ? bodyRes.data ?? null : null,
          colorAnalysis: colorRes.success ? colorRes.data ?? null : null,
          isLoading: false,
        });
      } catch (err) {
        set({ error: (err as Error).message, isLoading: false });
      }
    },

    clearProfile: () =>
      set({
        profile: null,
        completeness: null,
        bodyAnalysis: null,
        colorAnalysis: null,
        error: null,
      }),
  }),
  shallow
);

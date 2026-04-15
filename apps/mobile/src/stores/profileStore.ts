import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import {
  profileApi,
  type UserProfile,
  type UpdateProfileDto,
  type BodyAnalysisReport,
  type ColorAnalysisReport,
} from "../services/api/profile.api";
import apiClient from "../services/api/client";
import type { ApiResponse } from "../types";

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

export const useProfile = () => useProfileStore((s) => s.profile);
export const useProfileCompleteness = () => useProfileStore((s) => s.completeness);
export const useProfileBodyAnalysis = () => useProfileStore((s) => s.bodyAnalysis);
export const useProfileColorAnalysis = () => useProfileStore((s) => s.colorAnalysis);
export const useProfileLoading = () => useProfileStore((s) => s.isLoading);
export const useProfileError = () => useProfileStore((s) => s.error);

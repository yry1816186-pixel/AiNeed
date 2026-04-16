﻿﻿﻿﻿import { createWithEqualityFn } from "zustand/traditional";
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

export const useProfile = () => useProfileStore((s) => s.profile);
export const useProfileCompleteness = () => useProfileStore((s) => s.completeness);
export const useProfileBodyAnalysis = () => useProfileStore((s) => s.bodyAnalysis);
export const useProfileColorAnalysis = () => useProfileStore((s) => s.colorAnalysis);
export const useProfileLoading = () => useProfileStore((s) => s.isLoading);
export const useProfileError = () => useProfileStore((s) => s.error);

// ==================== Style Quiz Store ====================

export interface QuizImage {
  id: string;
  url: string;
  caption?: string;
}

interface StyleQuizQuestion {
  id: string;
  text: string;
  options: Array<{ id: string; text: string; image?: QuizImage }>;
}

interface StyleQuizResult {
  styleType: string;
  description: string;
  confidence: number;
  recommendations: string[];
}

interface StyleQuizState {
  currentQuizId: string | null;
  questions: StyleQuizQuestion[];
  currentQuestionIndex: number;
  answers: Record<string, string>;
  result: StyleQuizResult | null;
  isLoading: boolean;
  error: string | null;

  loadQuiz: (quizId: string) => Promise<void>;
  answerQuestion: (questionId: string, optionId: string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  submitQuiz: () => Promise<void>;
  reset: () => void;
}

export const useStyleQuizStore = createWithEqualityFn<StyleQuizState>(
  (set, get) => ({
    currentQuizId: null,
    questions: [],
    currentQuestionIndex: 0,
    answers: {},
    result: null,
    isLoading: false,
    error: null,

    loadQuiz: async (quizId: string) => {
      set({ isLoading: true, error: null, currentQuizId: quizId });
      try {
        // Stub - will be connected to API
        set({ isLoading: false });
      } catch {
        set({ error: "Failed to load quiz", isLoading: false });
      }
    },

    answerQuestion: (questionId: string, optionId: string) => {
      set((state) => ({
        answers: { ...state.answers, [questionId]: optionId },
      }));
    },

    nextQuestion: () => {
      set((state) => ({
        currentQuestionIndex: Math.min(
          state.currentQuestionIndex + 1,
          state.questions.length - 1
        ),
      }));
    },

    prevQuestion: () => {
      set((state) => ({
        currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0),
      }));
    },

    submitQuiz: async () => {
      set({ isLoading: true, error: null });
      try {
        // Stub - will be connected to API
        set({ isLoading: false });
      } catch {
        set({ error: "Failed to submit quiz", isLoading: false });
      }
    },

    reset: () => {
      set({
        currentQuizId: null,
        questions: [],
        currentQuestionIndex: 0,
        answers: {},
        result: null,
        error: null,
      });
    },
  }),
  shallow
);

// Selector hooks for StyleQuizScreen
export const useStyleQuizCurrentQuiz = () =>
  useStyleQuizStore((s) => ({
    currentQuizId: s.currentQuizId,
    questions: s.questions,
    currentQuestionIndex: s.currentQuestionIndex,
  }));

export const useStyleQuizProgress = () =>
  useStyleQuizStore((s) => ({
    currentQuestionIndex: s.currentQuestionIndex,
    totalQuestions: s.questions.length,
    answers: s.answers,
  }));

export const useStyleQuizResult = () => useStyleQuizStore((s) => s.result);
export const useStyleQuizLoading = () => useStyleQuizStore((s) => s.isLoading);
export const useStyleQuizError = () => useStyleQuizStore((s) => s.error);

// ==================== Quiz Store (for quizService) ====================

export interface QuizQuestion {
  id: string;
  text: string;
  category: string;
  options: QuizAnswer[];
  imageUrl?: string;
}

export interface QuizAnswer {
  id: string;
  text: string;
  value: string;
  imageUrl?: string;
}

export interface QuizResult {
  styleType: string;
  styleName: string;
  description: string;
  confidence: number;
  recommendations: string[];
  colorSeason?: string;
}

interface QuizState {
  currentQuizId: string | null;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  answers: Record<string, string>;
  result: QuizResult | null;
  isLoading: boolean;
  error: string | null;

  loadQuiz: (quizId: string) => Promise<void>;
  answerQuestion: (questionId: string, answerId: string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  submitQuiz: () => Promise<void>;
  reset: () => void;
}

export const useQuizStore = createWithEqualityFn<QuizState>(
  (set, get) => ({
    currentQuizId: null,
    questions: [],
    currentQuestionIndex: 0,
    answers: {},
    result: null,
    isLoading: false,
    error: null,

    loadQuiz: async (quizId: string) => {
      set({ isLoading: true, error: null, currentQuizId: quizId });
      try {
        // Stub - will be connected to API
        set({ isLoading: false });
      } catch {
        set({ error: "Failed to load quiz", isLoading: false });
      }
    },

    answerQuestion: (questionId: string, answerId: string) => {
      set((state) => ({
        answers: { ...state.answers, [questionId]: answerId },
      }));
    },

    nextQuestion: () => {
      set((state) => ({
        currentQuestionIndex: Math.min(
          state.currentQuestionIndex + 1,
          state.questions.length - 1
        ),
      }));
    },

    prevQuestion: () => {
      set((state) => ({
        currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0),
      }));
    },

    submitQuiz: async () => {
      set({ isLoading: true, error: null });
      try {
        // Stub - will be connected to API
        set({ isLoading: false });
      } catch {
        set({ error: "Failed to submit quiz", isLoading: false });
      }
    },

    reset: () => {
      set({
        currentQuizId: null,
        questions: [],
        currentQuestionIndex: 0,
        answers: {},
        result: null,
        error: null,
      });
    },
  }),
  shallow
);

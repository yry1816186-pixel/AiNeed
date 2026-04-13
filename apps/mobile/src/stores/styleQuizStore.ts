import { createWithEqualityFn } from "zustand/traditional";
import { persist, createJSONStorage } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  styleQuizApi,
  type QuizData,
  type QuizResult,
  type QuizProgress,
} from "../services/api/style-quiz.api";
import type { ApiResponse } from "../types";

interface StyleQuizState {
  currentQuiz: QuizData | null;
  progress: { questionIndex: number; answers: Record<string, string> };
  result: QuizResult | null;
  isLoading: boolean;
  error: string | null;

  loadQuiz: (quizId: string) => Promise<void>;
  selectAnswer: (quizId: string, questionId: string, optionId: string) => Promise<void>;
  submitAll: (quizId: string) => Promise<void>;
  loadProgress: (quizId: string) => Promise<void>;
  reset: () => void;
}

const INITIAL_PROGRESS = { questionIndex: 0, answers: {} as Record<string, string> };

export const useStyleQuizStore = createWithEqualityFn<StyleQuizState>()(
  persist(
    (set, get) => ({
      currentQuiz: null,
      progress: { ...INITIAL_PROGRESS },
      result: null,
      isLoading: false,
      error: null,

      loadQuiz: async (quizId: string) => {
        set({ isLoading: true, error: null });
        try {
          const response: ApiResponse<QuizData> = await styleQuizApi.getQuiz(quizId);
          if (response.success && response.data) {
            set({ currentQuiz: response.data, isLoading: false });
          } else {
            set({
              error: response.error?.message || "Failed to load quiz",
              isLoading: false,
            });
          }
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
        }
      },

      selectAnswer: async (quizId: string, questionId: string, optionId: string) => {
        const state = get();
        const newAnswers = { ...state.progress.answers, [questionId]: optionId };
        const newQuestionIndex = state.progress.questionIndex + 1;

        set({
          progress: { questionIndex: newQuestionIndex, answers: newAnswers },
        });

        try {
          await styleQuizApi.saveProgress(quizId, newQuestionIndex, newAnswers);
        } catch {
          // Progress save failure is non-blocking; state is already updated locally
        }
      },

      submitAll: async (quizId: string) => {
        set({ isLoading: true, error: null });
        try {
          const { progress } = get();
          const answers = Object.entries(progress.answers).map(
            ([questionId, optionId]) => ({ questionId, optionId }),
          );

          const response: ApiResponse<QuizResult> = await styleQuizApi.batchSubmit(
            quizId,
            answers,
          );
          if (response.success && response.data) {
            set({ result: response.data, isLoading: false });
          } else {
            set({
              error: response.error?.message || "Failed to submit quiz",
              isLoading: false,
            });
          }
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
        }
      },

      loadProgress: async (quizId: string) => {
        try {
          const response: ApiResponse<QuizProgress | null> =
            await styleQuizApi.getProgress(quizId);
          if (response.success && response.data) {
            set({
              progress: {
                questionIndex: response.data.questionIndex,
                answers: response.data.answers,
              },
            });
          }
        } catch {
          // If progress load fails, keep existing local progress
        }
      },

      reset: () =>
        set({
          currentQuiz: null,
          progress: { ...INITIAL_PROGRESS },
          result: null,
          isLoading: false,
          error: null,
        }),
    }),
    {
      name: "style-quiz-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        progress: state.progress,
      }),
    },
  ),
  shallow,
);

export const useStyleQuizCurrentQuiz = () =>
  useStyleQuizStore((s) => s.currentQuiz);
export const useStyleQuizProgress = () =>
  useStyleQuizStore((s) => s.progress);
export const useStyleQuizResult = () =>
  useStyleQuizStore((s) => s.result);
export const useStyleQuizLoading = () =>
  useStyleQuizStore((s) => s.isLoading);
export const useStyleQuizError = () =>
  useStyleQuizStore((s) => s.error);

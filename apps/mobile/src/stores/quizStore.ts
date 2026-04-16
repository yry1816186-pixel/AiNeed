import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import apiClient from "../services/api/client";
import type { ApiResponse } from "../types";

interface QuizOption {
  id: string;
  text: string;
  imageUrl?: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  title?: string;
  subtitle?: string;
  type: "single" | "multiple" | "image_choice";
  options: QuizOption[];
  category: string;
  order: number;
  images?: QuizImage[];
}

export interface QuizImage {
  id: string;
  uri: string;
  thumbnailUri?: string;
  label: string;
}

export interface QuizAnswer {
  questionId: string;
  selectedImageIndex: number;
  duration?: number;
}

export interface QuizResult {
  styleProfile: string;
  colorSeason: string;
  bodyTypeRecommendation: string;
  confidence: number;
  recommendations: string[];
  styleTags?: string[];
  colorPalette?: string[];
  occasionPreferences?: string[];
}

interface QuizState {
  questions: QuizQuestion[];
  currentIndex: number;
  currentQuestionIndex: number;
  answers: Record<string, string>;
  answerList: QuizAnswer[];
  result: QuizResult | null;
  isLoading: boolean;
  error: string | null;
  fetchQuestions: () => Promise<void>;
  selectAnswer: (questionId: string, answerId: string) => void;
  selectAnswerWithDuration: (questionId: string, imageIndex: number, duration: number) => void;
  submitQuiz: () => Promise<void>;
  resetQuiz: () => void;
  setQuestions: (questions: QuizQuestion[]) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useQuizStore = createWithEqualityFn<QuizState>(
  (set, get) => ({
    questions: [],
    currentIndex: 0,
    currentQuestionIndex: 0,
    answers: {},
    answerList: [],
    result: null,
    isLoading: false,
    error: null,

    fetchQuestions: async () => {
      set({ isLoading: true, error: null });
      try {
        const response: ApiResponse<QuizQuestion[]> = await apiClient.get<QuizQuestion[]>(
          "/quiz/questions"
        );
        if (response.success && response.data) {
          const sorted = [...response.data].sort((a, b) => a.order - b.order);
          set({ questions: sorted, isLoading: false });
        } else {
          set({
            error: response.error?.message || "Failed to fetch questions",
            isLoading: false,
          });
        }
      } catch (err) {
        set({ error: (err as Error).message, isLoading: false });
      }
    },

    selectAnswer: (questionId, answerId) => {
      const state = get();
      const newAnswers = { ...state.answers, [questionId]: answerId };
      const questionIndex = state.questions.findIndex((q) => q.id === questionId);
      const nextIndex =
        questionIndex >= 0 && questionIndex < state.questions.length - 1
          ? questionIndex + 1
          : state.currentIndex;
      set({ answers: newAnswers, currentIndex: nextIndex, currentQuestionIndex: nextIndex });
    },

    selectAnswerWithDuration: (questionId, imageIndex, duration) => {
      const state = get();
      const existing = state.answerList.findIndex((a) => a.questionId === questionId);
      const newAnswer: QuizAnswer = { questionId, selectedImageIndex: imageIndex, duration };
      const newAnswerList = [...state.answerList];
      if (existing >= 0) {
        newAnswerList[existing] = newAnswer;
      } else {
        newAnswerList.push(newAnswer);
      }
      const questionIndex = state.questions.findIndex((q) => q.id === questionId);
      const nextIndex =
        questionIndex >= 0 && questionIndex < state.questions.length - 1
          ? questionIndex + 1
          : state.currentQuestionIndex;
      set({
        answerList: newAnswerList,
        answers: { ...state.answers, [questionId]: String(imageIndex) },
        currentQuestionIndex: nextIndex,
      });
    },

    submitQuiz: async () => {
      set({ isLoading: true, error: null });
      try {
        const { answers } = get();
        const response: ApiResponse<QuizResult> = await apiClient.post<QuizResult>("/quiz/submit", {
          answers,
        });
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

    resetQuiz: () =>
      set({
        questions: [],
        currentIndex: 0,
        currentQuestionIndex: 0,
        answers: {},
        answerList: [],
        result: null,
        isLoading: false,
        error: null,
      }),

    setQuestions: (questions) => set({ questions }),

    nextQuestion: () =>
      set((state) => ({
        currentQuestionIndex: Math.min(state.currentQuestionIndex + 1, state.questions.length - 1),
      })),

    previousQuestion: () =>
      set((state) => ({
        currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0),
      })),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error }),
  }),
  shallow
);

export const useQuizQuestions = () => useQuizStore((s) => s.questions);
export const useQuizCurrentIndex = () => useQuizStore((s) => s.currentIndex);
export const useQuizAnswers = () => useQuizStore((s) => s.answers);
export const useQuizResult = () => useQuizStore((s) => s.result);
export const useQuizLoading = () => useQuizStore((s) => s.isLoading);
export const useQuizError = () => useQuizStore((s) => s.error);

import apiClient from "./client";
import type { ApiResponse } from "../../types";

export interface QuizOption {
  id: string;
  text: string;
  imageUrl?: string;
}

export interface QuizQuestionData {
  id: string;
  title: string;
  subtitle?: string;
  type: "single" | "multiple" | "image_choice";
  options: QuizOption[];
  category: string;
  order: number;
  images?: {
    id: string;
    uri: string;
    thumbnailUri?: string;
    label: string;
  }[];
}

export interface QuizData {
  id: string;
  title: string;
  questions: QuizQuestionData[];
}

export interface AnswerResponse {
  questionId: string;
  optionId: string;
  correct?: boolean;
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

export interface QuizProgress {
  questionIndex: number;
  answers: Record<string, string>;
}

export const styleQuizApi = {
  async getQuiz(quizId: string): Promise<ApiResponse<QuizData>> {
    return apiClient.get<QuizData>(`/quizzes/${quizId}`);
  },

  async submitAnswer(
    quizId: string,
    questionId: string,
    optionId: string
  ): Promise<ApiResponse<AnswerResponse>> {
    return apiClient.post<AnswerResponse>(`/quizzes/${quizId}/answers`, {
      questionId,
      optionId,
    });
  },

  async batchSubmit(
    quizId: string,
    answers: { questionId: string; optionId: string }[]
  ): Promise<ApiResponse<QuizResult>> {
    return apiClient.post<QuizResult>(`/quizzes/${quizId}/batch-answers`, {
      answers,
    });
  },

  async getProgress(quizId: string): Promise<ApiResponse<QuizProgress | null>> {
    return apiClient.get<QuizProgress | null>(`/quizzes/${quizId}/progress`);
  },

  async saveProgress(
    quizId: string,
    questionIndex: number,
    answers: Record<string, string>
  ): Promise<ApiResponse<{ saved: boolean }>> {
    return apiClient.post<{ saved: boolean }>(`/quizzes/${quizId}/progress`, {
      questionIndex,
      answers,
    });
  },

  async getResult(quizId: string): Promise<ApiResponse<QuizResult>> {
    return apiClient.get<QuizResult>(`/quizzes/${quizId}/result`);
  },
};

export default styleQuizApi;

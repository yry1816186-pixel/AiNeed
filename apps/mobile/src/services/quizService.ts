import apiClient from "./api/client";
import type { ApiResponse } from "../types/api";
import type { QuizQuestion, QuizAnswer, QuizResult } from "../stores/quizStore";

export const quizApi = {
  getQuestions: (): Promise<ApiResponse<QuizQuestion[]>> =>
    apiClient.get<QuizQuestion[]>("/quiz/questions"),

  submitQuiz: (answers: QuizAnswer[]): Promise<ApiResponse<QuizResult>> =>
    apiClient.post<QuizResult>("/quiz/submit", { answers }),

  getResult: (): Promise<ApiResponse<QuizResult>> =>
    apiClient.get<QuizResult>("/quiz/result"),
};

export default quizApi;

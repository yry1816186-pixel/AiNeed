import { get, post, put, del } from '@/services/request';
import type { PaginatedResponse, PaginationParams } from '@/types/api';

export interface QuizQuestion {
  id: string;
  category: string;
  questionText: string;
  imageUrl: string | null;
  order: number;
  isActive: boolean;
  answers: QuizAnswer[];
  createdAt: string;
  updatedAt: string;
}

export interface QuizAnswer {
  id: string;
  answerText: string;
  weight: Record<string, number>;
  order: number;
}

export const styleQuizApi = {
  getQuestions: (params: PaginationParams & { category?: string; isActive?: boolean }) =>
    get<PaginatedResponse<QuizQuestion>>('/style-quiz/questions', { params }),
  getQuestion: (id: string) => get<QuizQuestion>(`/style-quiz/questions/${id}`),
  createQuestion: (data: CreateQuestionDto) => post<QuizQuestion>('/style-quiz/questions', data),
  updateQuestion: (id: string, data: UpdateQuestionDto) => put<QuizQuestion>(`/style-quiz/questions/${id}`, data),
  deleteQuestion: (id: string) => del(`/style-quiz/questions/${id}`),
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return post<{ url: string }>('/storage/upload', formData);
  },
};

export interface CreateQuestionDto {
  category: string;
  questionText: string;
  imageUrl?: string;
  order: number;
  answers: Omit<QuizAnswer, 'id'>[];
}

export interface UpdateQuestionDto extends Partial<CreateQuestionDto> {
  isActive?: boolean;
}

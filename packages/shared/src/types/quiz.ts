import type { QuizQuestionType, PriceRange } from './enums';

export interface QuizQuestion {
  id: string;
  quizId: string;
  content: string;
  imageUrls: string[];
  questionType: QuizQuestionType;
  dimension: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuizAnswer {
  id: string;
  userId: string;
  questionId: string;
  selectedImageIndex?: number;
  selectedOption?: string;
  sliderValue?: number;
  responseTimeMs?: number;
  createdAt: string;
}

export interface QuizResult {
  id: string;
  userId: string;
  quizId: string;
  occasionPreferences: Record<string, unknown>;
  colorPreferences: Record<string, unknown>;
  styleKeywords: string[];
  priceRange: PriceRange;
  confidenceScore: number;
  isLatest: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StyleDimension {
  name: string;
  key: string;
  score: number;
  label: string;
  description: string;
}

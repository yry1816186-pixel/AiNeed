import type {
  Gender,
  BodyType,
  SkinTone,
  FaceShape,
  ColorSeasonType,
  OnboardingStep,
} from './enums';

export interface UserProfile {
  id: string;
  userId: string;
  bodyType?: BodyType;
  skinTone?: SkinTone;
  faceShape?: FaceShape;
  colorSeason?: ColorSeasonType;
  height?: number;
  weight?: number;
  shoulder?: number;
  bust?: number;
  waist?: number;
  hip?: number;
  inseam?: number;
  stylePreferences?: Record<string, unknown>;
  colorPreferences?: Record<string, unknown>;
  priceRangeMin?: number;
  priceRangeMax?: number;
  onboardingStep: OnboardingStep;
  onboardingCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BasicInfoPayload {
  nickname?: string;
  gender?: Gender;
  birthDate?: string;
  height?: number;
  weight?: number;
}

export interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  basicInfo?: BasicInfoPayload;
  photoUploaded?: boolean;
  quizCompleted?: boolean;
}

export interface OnboardingProgress {
  userId: string;
  currentStep: OnboardingStep;
  totalSteps: number;
  completedSteps: number;
  percentage: number;
  isCompleted: boolean;
  completedAt?: string;
}

import apiClient from '../../../services/api/client';
import type { ApiResponse } from '../../../types/api';

export interface BodyType {
  type: "rectangle" | "triangle" | "inverted_triangle" | "hourglass" | "oval";
  label: string;
  description: string;
}

export interface SkinTone {
  type: "fair" | "light" | "medium" | "olive" | "tan" | "dark";
  label: string;
}

export interface ColorSeason {
  type: "spring" | "summer" | "autumn" | "winter";
  label: string;
  bestColors: string[];
  neutralColors: string[];
  avoidColors: string[];
}

export interface UserProfile {
  id: string;
  userId: string;
  nickname?: string;
  avatar?: string;
  gender?: "male" | "female" | "other";
  birthDate?: string;

  height?: number;
  weight?: number;
  shoulder?: number;
  bust?: number;
  waist?: number;
  hip?: number;
  inseam?: number;

  bodyType?: BodyType["type"];
  skinTone?: SkinTone["type"];
  faceShape?: string;
  colorSeason?: ColorSeason["type"];

  stylePreferences?: {
    preferredStyles: string[];
    avoidedStyles: string[];
    preferredColors: string[];
    avoidedColors: string[];
    fitGoals: string[];
  };

  sizeTop?: string;
  sizeBottom?: string;
  sizeShoes?: string;
  budget?: "low" | "medium" | "high" | "luxury";

  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileDto {
  nickname?: string;
  avatar?: string;
  gender?: "male" | "female" | "other";
  birthDate?: string;

  height?: number;
  weight?: number;
  shoulder?: number;
  bust?: number;
  waist?: number;
  hip?: number;
  inseam?: number;

  bodyType?: BodyType["type"];
  skinTone?: SkinTone["type"];
  faceShape?: string;
  colorSeason?: ColorSeason["type"];

  stylePreferences?: {
    preferredStyles: string[];
    avoidedStyles: string[];
    preferredColors: string[];
    avoidedColors: string[];
    fitGoals: string[];
  };

  sizeTop?: string;
  sizeBottom?: string;
  sizeShoes?: string;
  budget?: "low" | "medium" | "high" | "luxury";
}

export interface BodyAnalysisReport {
  bodyType: BodyType;
  recommendations: {
    tops: string[];
    bottoms: string[];
    dresses: string[];
    idealStyles: string[];
    avoidStyles: string[];
  };
  tips: string[];
}

export interface ColorAnalysisReport {
  colorSeason: ColorSeason;
  bestColors: string[];
  neutralColors: string[];
  avoidColors: string[];
  metalPreference: "gold" | "silver" | "both";
}

export const profileApi = {
  getProfile: (): Promise<ApiResponse<UserProfile>> => apiClient.get<UserProfile>("/profile"),

  updateProfile: (data: UpdateProfileDto): Promise<ApiResponse<UserProfile>> =>
    apiClient.put<UserProfile>("/profile", data),

  getBodyAnalysis: (): Promise<ApiResponse<BodyAnalysisReport>> =>
    apiClient.get<BodyAnalysisReport>("/profile/body-analysis"),

  getColorAnalysis: (): Promise<ApiResponse<ColorAnalysisReport>> =>
    apiClient.get<ColorAnalysisReport>("/profile/color-analysis"),

  getStyleRecommendations: (): Promise<ApiResponse<{ styles: string[]; reasons: string[] }>> =>
    apiClient.get<{ styles: string[]; reasons: string[] }>("/profile/style-recommendations"),

  getBodyMetrics: (): Promise<
    ApiResponse<{
      bmi: number;
      bmiCategory: string;
      waistHipRatio: number;
      chestWaistRatio: number;
    }>
  > =>
    apiClient.get<{
      bmi: number;
      bmiCategory: string;
      waistHipRatio: number;
      chestWaistRatio: number;
    }>("/profile/body-metrics"),
};

export default profileApi;

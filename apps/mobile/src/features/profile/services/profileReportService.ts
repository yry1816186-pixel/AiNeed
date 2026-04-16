import apiClient from "./api/client";
import type { ApiResponse } from '../../../types/api';

export interface ProfileReportData {
  profile: {
    nickname?: string;
    avatar?: string;
    bodyType?: string;
    colorSeason?: string;
    shoulder?: number;
    bust?: number;
    waist?: number;
    hip?: number;
    stylePreferences?: {
      preferredStyles: string[];
      avoidedStyles: string[];
      preferredColors: string[];
      avoidedColors: string[];
      fitGoals: string[];
    };
  } | null;
  bodyAnalysis: {
    bodyType: string | null;
    bodyTypeName: string;
    description: string;
    recommendations: { category: string; advice: string; examples: string[] }[];
    idealStyles: string[];
    avoidStyles: string[];
  } | null;
  colorAnalysis: {
    colorSeason: string | null;
    colorSeasonName: string;
    bestColors: string[];
    neutralColors: string[];
    avoidColors: string[];
    metalPreference: string;
  } | null;
  styleRecommendations: {
    styles: string[];
    occasions: { occasion: string; suggestions: string[] }[];
    tips: string[];
  } | null;
  bodyMetrics: {
    bmi: number;
    bmiCategory: string;
    waistHipRatio: number;
    chestWaistRatio: number;
  } | null;
}

interface ProfileData {
  nickname?: string;
  avatar?: string;
  bodyType?: string;
  colorSeason?: string;
  shoulder?: number;
  bust?: number;
  waist?: number;
  hip?: number;
  stylePreferences?: {
    preferredStyles: string[];
    avoidedStyles: string[];
    preferredColors: string[];
    avoidedColors: string[];
    fitGoals: string[];
  };
}

interface BodyAnalysisData {
  bodyType: string | null;
  bodyTypeName: string;
  description: string;
  recommendations: { category: string; advice: string; examples: string[] }[];
  idealStyles: string[];
  avoidStyles: string[];
}

interface ColorAnalysisData {
  colorSeason: string | null;
  colorSeasonName: string;
  bestColors: string[];
  neutralColors: string[];
  avoidColors: string[];
  metalPreference: string;
}

interface StyleRecommendationsData {
  styles: string[];
  occasions: { occasion: string; suggestions: string[] }[];
  tips: string[];
}

interface BodyMetricsData {
  bmi: number;
  bmiCategory: string;
  waistHipRatio: number;
  chestWaistRatio: number;
}

function extractSettledResult<T>(result: PromiseSettledResult<ApiResponse<T>>): T | null {
  if (result.status === "fulfilled" && result.value.success && result.value.data) {
    return result.value.data;
  }
  return null;
}

export const profileReportService = {
  getFullReport: async (): Promise<ApiResponse<ProfileReportData>> => {
    const [profileResult, bodyAnalysisResult, colorAnalysisResult, styleRecsResult, metricsResult] =
      await Promise.allSettled([
        apiClient.get<ProfileData>("/profile"),
        apiClient.get<BodyAnalysisData>("/profile/body-analysis"),
        apiClient.get<ColorAnalysisData>("/profile/color-analysis"),
        apiClient.get<StyleRecommendationsData>("/profile/style-recommendations"),
        apiClient.get<BodyMetricsData>("/profile/body-metrics"),
      ]);

    const profile = extractSettledResult<ProfileData>(profileResult);
    const bodyAnalysis = extractSettledResult<BodyAnalysisData>(bodyAnalysisResult);
    const colorAnalysis = extractSettledResult<ColorAnalysisData>(colorAnalysisResult);
    const styleRecommendations = extractSettledResult<StyleRecommendationsData>(styleRecsResult);
    const bodyMetrics = extractSettledResult<BodyMetricsData>(metricsResult);

    const hasAnyData =
      profile || bodyAnalysis || colorAnalysis || styleRecommendations || bodyMetrics;

    if (!hasAnyData) {
      const firstError = [
        profileResult,
        bodyAnalysisResult,
        colorAnalysisResult,
        styleRecsResult,
        metricsResult,
      ].find((r): r is PromiseRejectedResult => r.status === "rejected");
      return {
        success: false,
        error: {
          code: "REPORT_FETCH_FAILED",
          message: firstError?.reason?.message ?? "Failed to fetch profile report data",
        },
      };
    }

    return {
      success: true,
      data: {
        profile,
        bodyAnalysis,
        colorAnalysis,
        styleRecommendations,
        bodyMetrics,
      },
    };
  },
};

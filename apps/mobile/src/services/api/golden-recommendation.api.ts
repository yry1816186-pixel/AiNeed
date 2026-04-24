import apiClient from "./client";
import { ApiResponse } from "../../types";

export interface GoldenProfile {
  bodyType: string;
  occasion: string;
  stylePreference: string[];
  budget: { min: number; max: number };
}

export interface GoldenProfileEntry {
  profile_id: string;
  profile: GoldenProfile;
}

export interface GoldenOutfitItem {
  category: string;
  name: string;
  price: number;
}

export interface GoldenMatchScores {
  bodyType: number;
  occasion: number;
  color: number;
  style: number;
  budget: number;
}

export interface GoldenOutfit {
  id: string;
  name: string;
  items: GoldenOutfitItem[];
  total_price: number;
  explanation: string;
  match_scores: GoldenMatchScores;
}

export interface GoldenRecommendation {
  profile_id: string;
  profile: GoldenProfile;
  outfits: GoldenOutfit[];
}

function matchProfile(
  profiles: GoldenProfileEntry[],
  params: {
    bodyType?: string;
    occasion?: string;
    stylePreference?: string[];
    budgetMin?: number;
    budgetMax?: number;
  }
): GoldenProfileEntry | null {
  const { bodyType, occasion, stylePreference, budgetMin, budgetMax } = params;
  let bestMatch: GoldenProfileEntry | null = null;
  let bestScore = -1;

  for (const entry of profiles) {
    let score = 0;

    if (bodyType && entry.profile.bodyType === bodyType) {
      score += 40;
    }
    if (occasion && entry.profile.occasion === occasion) {
      score += 30;
    }

    if (stylePreference && entry.profile.stylePreference) {
      const overlap = stylePreference.filter((s) =>
        entry.profile.stylePreference.includes(s)
      ).length;
      score += overlap * 10;
    }

    if (budgetMin !== undefined && budgetMax !== undefined && entry.profile.budget) {
      const budgetOverlap =
        Math.min(budgetMax, entry.profile.budget.max) -
        Math.max(budgetMin, entry.profile.budget.min);
      if (budgetOverlap > 0) {
        score += 20;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestMatch;
}

export const goldenRecommendationApi = {
  async getAllProfiles(): Promise<ApiResponse<GoldenProfileEntry[]>> {
    return apiClient.get<GoldenProfileEntry[]>("/recommendations/golden/profiles");
  },

  async getGoldenRecommendation(profileId: string): Promise<ApiResponse<GoldenRecommendation>> {
    return apiClient.get<GoldenRecommendation>(`/recommendations/golden/${profileId}`);
  },

  async findMatchingGoldenRecommendation(params: {
    bodyType?: string;
    occasion?: string;
    stylePreference?: string[];
    budgetMin?: number;
    budgetMax?: number;
  }): Promise<ApiResponse<GoldenRecommendation>> {
    const profilesResponse = await goldenRecommendationApi.getAllProfiles();

    if (!profilesResponse.success || !profilesResponse.data) {
      return {
        success: false,
        error: profilesResponse.error ?? {
          code: "GOLDEN_PROFILES_UNAVAILABLE",
          message: "Failed to load golden profiles",
        },
      };
    }

    const matchedProfile = matchProfile(profilesResponse.data, params);

    if (!matchedProfile) {
      return {
        success: false,
        error: {
          code: "NO_MATCHING_PROFILE",
          message: "No matching golden profile found",
        },
      };
    }

    return goldenRecommendationApi.getGoldenRecommendation(matchedProfile.profile_id);
  },
};

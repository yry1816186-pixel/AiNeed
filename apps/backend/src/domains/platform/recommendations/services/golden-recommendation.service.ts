import * as fs from "fs";
import * as path from "path";

import { Injectable, Logger, NotFoundException } from "@nestjs/common";

export interface GoldenMatchScores {
  bodyType: number;
  occasion: number;
  color: number;
  style: number;
  budget: number;
}

export interface GoldenOutfitItem {
  category: string;
  name: string;
  price: number;
}

export interface GoldenOutfit {
  id: string;
  name: string;
  items: GoldenOutfitItem[];
  total_price: number;
  explanation: string;
  match_scores: GoldenMatchScores;
}

export interface GoldenProfile {
  bodyType: string;
  occasion: string;
  stylePreference: string[];
  budget: { min: number; max: number };
}

export interface GoldenRecommendation {
  profile_id: string;
  profile: GoldenProfile;
  outfits: GoldenOutfit[];
}

@Injectable()
export class GoldenRecommendationService {
  private readonly logger = new Logger(GoldenRecommendationService.name);
  private goldenData: GoldenRecommendation[] | null = null;

  private async loadData(): Promise<GoldenRecommendation[]> {
    if (this.goldenData) {
      return this.goldenData;
    }

    const dataPath = path.resolve(process.cwd(), "ml", "data", "golden_recommendations.json");

    try {
      const raw = fs.readFileSync(dataPath, "utf-8");
      this.goldenData = JSON.parse(raw) as GoldenRecommendation[];
      this.logger.log(`Loaded ${this.goldenData.length} golden recommendation profiles`);
      return this.goldenData;
    } catch (error) {
      this.logger.warn(
        `Failed to load golden recommendations from ${dataPath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [];
    }
  }

  async getGoldenRecommendation(profileId: string): Promise<GoldenRecommendation> {
    const data = await this.loadData();
    const found = data.find((item) => item.profile_id === profileId);

    if (!found) {
      throw new NotFoundException(
        `Golden recommendation for profile "${profileId}" not found. Available profiles: ${data
          .map((d) => d.profile_id)
          .join(", ")}`
      );
    }

    return found;
  }

  async getAllGoldenProfiles(): Promise<Array<{ profile_id: string; profile: GoldenProfile }>> {
    const data = await this.loadData();
    return data.map((item) => ({
      profile_id: item.profile_id,
      profile: item.profile,
    }));
  }

  async findMatchingProfile(params: {
    bodyType?: string;
    occasion?: string;
    stylePreference?: string[];
    budgetMin?: number;
    budgetMax?: number;
  }): Promise<GoldenRecommendation | null> {
    const data = await this.loadData();
    const { bodyType, occasion, stylePreference, budgetMin, budgetMax } = params;

    let bestMatch: GoldenRecommendation | null = null;
    let bestScore = -1;

    for (const entry of data) {
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

  clearCache(): void {
    this.goldenData = null;
    this.logger.log("Golden recommendation cache cleared");
  }
}

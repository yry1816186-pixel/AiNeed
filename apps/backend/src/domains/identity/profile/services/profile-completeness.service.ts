import { Injectable } from "@nestjs/common";

export interface UserProfile {
  gender?: string | null;
  birthDate?: Date | null;
  nickname?: string | null;
  height?: number | null;
  weight?: number | null;
  bodyType?: string | null;
  colorSeason?: string | null;
  styleProfiles?: unknown[];
  stylePreferences?: unknown[];
  colorPreferences?: unknown[];
  photos?: unknown[];
  primaryScenarios?: string[];
  styleExpression?: string[];
  garmentPreference?: unknown;
  wardrobeItems?: unknown[];
}

export interface CompletenessResult {
  percentage: number;
  missingFields: string[];
}

/**
 * ProfileCompletenessService calculates profile completion percentage
 * using a gender-free weighted scoring system:
 * - Scenarios (20%): at least one primaryScenarios entry
 * - Body type (25%): bodyType (10%), height/weight (15%)
 * - Style (20%): at least one styleExpression entry (10%), at least one stylePreference (10%)
 * - Wardrobe (20%): at least one wardrobe item (10%), garmentPreference (10%)
 * - Photos (15%): at least one UserPhoto exists
 */
@Injectable()
export class ProfileCompletenessService {
  calculateCompleteness(userProfile: UserProfile): CompletenessResult {
    const missingFields: string[] = [];
    let totalScore = 0;

    // Scenarios (20%)
    const hasScenarios = this.hasItems(userProfile.primaryScenarios);
    if (!hasScenarios) {
      missingFields.push("穿搭场景");
    }
    totalScore += (hasScenarios ? 1 : 0) * 20;

    // Body type (25%)
    const bodyTypeScore = this.toBooleanScore(userProfile.bodyType);
    const heightScore = this.toBooleanScore(userProfile.height);
    const weightScore = this.toBooleanScore(userProfile.weight);

    if (!bodyTypeScore) {
      missingFields.push("体型");
    }
    if (!heightScore && !weightScore) {
      missingFields.push("身材数据");
    }

    totalScore += bodyTypeScore * 10 + (heightScore || weightScore ? 1 : 0) * 15;

    // Style (20%)
    const hasStyleExpression = this.hasItems(userProfile.styleExpression);
    const hasStylePreference = this.hasItems(userProfile.stylePreferences);

    if (!hasStyleExpression) {
      missingFields.push("风格表达");
    }
    if (!hasStylePreference) {
      missingFields.push("风格偏好");
    }

    totalScore += (hasStyleExpression ? 1 : 0) * 10 + (hasStylePreference ? 1 : 0) * 10;

    // Wardrobe (20%)
    const hasWardrobeItems = this.hasItems(userProfile.wardrobeItems);
    const hasGarmentPreference = this.toBooleanScore(userProfile.garmentPreference);

    if (!hasWardrobeItems) {
      missingFields.push("衣橱");
    }
    if (!hasGarmentPreference) {
      missingFields.push("服装偏好");
    }

    totalScore += (hasWardrobeItems ? 1 : 0) * 10 + hasGarmentPreference * 10;

    // Photos (15%)
    const hasPhotos = this.hasItems(userProfile.photos);

    if (!hasPhotos) {
      missingFields.push("个人照片");
    }

    totalScore += (hasPhotos ? 1 : 0) * 15;

    return {
      percentage: Math.min(100, Math.max(0, totalScore)),
      missingFields,
    };
  }

  private toBooleanScore(value: unknown): number {
    if (value === null || value === undefined || value === "") {
      return 0;
    }
    return 1;
  }

  private hasItems(array: unknown[] | undefined | null): boolean {
    return Array.isArray(array) && array.length > 0;
  }
}

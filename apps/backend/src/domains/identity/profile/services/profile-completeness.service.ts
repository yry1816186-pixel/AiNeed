/* eslint-disable @typescript-eslint/no-explicit-any */
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
}

export interface CompletenessResult {
  percentage: number;
  missingFields: string[];
}

/**
 * ProfileCompletenessService calculates profile completion percentage
 * using a weighted scoring system:
 * - Basic info (30%): gender (10%), age/birthdate (10%), nickname (10%)
 * - Body data (25%): height (8%), weight (8%), bodyType (9%)
 * - Style preferences (20%): at least one StyleProfile (10%), at least one StylePreference (10%)
 * - Color preferences (15%): colorSeason filled (8%), at least one ColorPreference (7%)
 * - Photos (10%): at least one UserPhoto exists
 */
@Injectable()
export class ProfileCompletenessService {
  calculateCompleteness(userProfile: UserProfile): CompletenessResult {
    const missingFields: string[] = [];
    let totalScore = 0;

    // Basic info (30%)
    const genderScore = this.toBooleanScore(userProfile.gender);
    const birthDateScore = this.toBooleanScore(userProfile.birthDate);
    const nicknameScore = this.toBooleanScore(userProfile.nickname);

    if (!genderScore) {missingFields.push("性别");}
    if (!birthDateScore) {missingFields.push("出生日期");}
    if (!nicknameScore) {missingFields.push("昵称");}

    totalScore += genderScore * 10 + birthDateScore * 10 + nicknameScore * 10;

    // Body data (25%)
    const heightScore = this.toBooleanScore(userProfile.height);
    const weightScore = this.toBooleanScore(userProfile.weight);
    const bodyTypeScore = this.toBooleanScore(userProfile.bodyType);

    if (!heightScore && !weightScore && !bodyTypeScore) {
      missingFields.push("身材数据");
    }

    totalScore += heightScore * 8 + weightScore * 8 + bodyTypeScore * 9;

    // Style preferences (20%)
    const hasStyleProfile = this.hasItems(userProfile.styleProfiles);
    const hasStylePreference = this.hasItems(userProfile.stylePreferences);

    if (!hasStyleProfile) {missingFields.push("风格档案");}
    if (!hasStylePreference) {missingFields.push("风格偏好");}

    totalScore += (hasStyleProfile ? 1 : 0) * 10 + (hasStylePreference ? 1 : 0) * 10;

    // Color preferences (15%)
    const hasColorSeason = this.toBooleanScore(userProfile.colorSeason);
    const hasColorPreference = this.hasItems(userProfile.colorPreferences);

    if (!hasColorSeason && !hasColorPreference) {
      missingFields.push("色彩分析");
    }

    totalScore += hasColorSeason * 8 + (hasColorPreference ? 1 : 0) * 7;

    // Photos (10%)
    const hasPhotos = this.hasItems(userProfile.photos);

    if (!hasPhotos) {
      missingFields.push("个人照片");
    }

    totalScore += (hasPhotos ? 1 : 0) * 10;

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

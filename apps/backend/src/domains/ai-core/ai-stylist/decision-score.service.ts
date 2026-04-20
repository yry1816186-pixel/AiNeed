/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from "@nestjs/common";

import { type DecisionNodeType, type DecisionContext, type UserProfile } from "./types";

@Injectable()
export class DecisionScoreService {
  calculateOptionScores(
    opt: { id: string; label: string; fitTypes?: string[] },
    nodeType: DecisionNodeType,
    context: DecisionContext,
    userProfile: UserProfile
  ): { fitScore: number; styleScore: number; preferenceScore: number } {
    return {
      fitScore: this.calculateFitScore(opt, nodeType, userProfile),
      styleScore: this.calculateStyleScore(opt, nodeType, context, userProfile),
      preferenceScore: this.calculatePreferenceScore(opt, nodeType, userProfile),
    };
  }

  calculateCompositeScore(scores: {
    fitScore: number;
    styleScore: number;
    preferenceScore: number;
  }): number {
    return scores.fitScore * 0.3 + scores.styleScore * 0.3 + scores.preferenceScore * 0.4;
  }

  private calculateFitScore(
    opt: { id: string; label: string; fitTypes?: string[] },
    nodeType: DecisionNodeType,
    userProfile: UserProfile
  ): number {
    const bodyType = userProfile.bodyType?.toLowerCase();

    if (!bodyType) {
      return 50;
    }

    if (opt.fitTypes && opt.fitTypes.length > 0) {
      return opt.fitTypes.includes(bodyType) ? 85 : 40;
    }

    const bodyTypeScores: Record<string, Record<string, number>> = {
      hourglass: {
        fitted: 90,
        regular: 75,
        loose: 60,
        oversized: 50,
        slim: 85,
        straight: 70,
        wide: 65,
        skirt_a: 90,
      },
      rectangle: {
        fitted: 70,
        regular: 80,
        loose: 75,
        oversized: 85,
        slim: 75,
        straight: 80,
        wide: 70,
        skirt_a: 70,
      },
      triangle: {
        fitted: 60,
        regular: 75,
        loose: 80,
        oversized: 70,
        slim: 55,
        straight: 85,
        wide: 90,
        skirt_a: 90,
      },
      inverted_triangle: {
        fitted: 60,
        regular: 70,
        loose: 85,
        oversized: 90,
        slim: 80,
        straight: 75,
        wide: 70,
        skirt_a: 60,
      },
      oval: {
        fitted: 45,
        regular: 70,
        loose: 85,
        oversized: 80,
        slim: 50,
        straight: 75,
        wide: 90,
        skirt_a: 75,
      },
    };

    const typeScores = bodyTypeScores[bodyType];
    const optionScore = typeScores?.[opt.id];
    if (optionScore !== undefined) {
      return optionScore;
    }

    return 60;
  }

  private calculateStyleScore(
    opt: { id: string; label: string },
    nodeType: DecisionNodeType,
    context: DecisionContext,
    userProfile: UserProfile
  ): number {
    let score = 50;

    if (context.preferredStyles.length > 0) {
      const isPreferred = context.preferredStyles.some(
        (style) =>
          style.toLowerCase().includes(opt.label.toLowerCase()) ||
          opt.label.toLowerCase().includes(style.toLowerCase())
      );
      if (isPreferred) {
        score += 30;
      }
    }

    if (context.styleAvoidances.length > 0) {
      const isAvoided = context.styleAvoidances.some(
        (avoid) =>
          avoid.toLowerCase().includes(opt.label.toLowerCase()) ||
          opt.label.toLowerCase().includes(avoid.toLowerCase())
      );
      if (isAvoided) {
        score -= 40;
      }
    }

    if (userProfile.stylePreferences.length > 0) {
      const matchesPreference = userProfile.stylePreferences.some(
        (pref) =>
          pref.toLowerCase().includes(opt.label.toLowerCase()) ||
          opt.label.toLowerCase().includes(pref.toLowerCase())
      );
      if (matchesPreference) {
        score += 20;
      }
    }

    if (context.occasion) {
      const occasionStyleBonus = this.getOccasionStyleBonus(opt.id, context.occasion);
      score += occasionStyleBonus;
    }

    return Math.max(0, Math.min(100, score));
  }

  private getOccasionStyleBonus(styleId: string, occasion: string): number {
    const occasionStyles: Record<string, string[]> = {
      interview: ["smart_casual", "minimalist"],
      work: ["smart_casual", "minimalist", "french"],
      date: ["french", "korean", "japanese"],
      travel: ["korean", "sporty", "streetwear"],
      party: ["streetwear", "vintage", "french"],
      daily: ["japanese", "korean", "minimalist"],
      campus: ["korean", "japanese", "sporty"],
    };

    const recommendedStyles = occasionStyles[occasion] || [];
    return recommendedStyles.includes(styleId) ? 15 : 0;
  }

  private calculatePreferenceScore(
    opt: { id: string; label: string },
    nodeType: DecisionNodeType,
    userProfile: UserProfile
  ): number {
    let score = 50;

    const relevantBehaviors = userProfile.behaviorHistory.filter((b) => {
      if (!b.category) {
        return false;
      }
      return (
        b.category.toLowerCase() === nodeType.toLowerCase() ||
        b.value?.toLowerCase().includes(opt.label.toLowerCase())
      );
    });

    const now = Date.now();
    let totalWeight = 0;

    for (const behavior of relevantBehaviors) {
      const age = now - behavior.timestamp.getTime();
      const recencyFactor = Math.max(0.1, 1 - age / (30 * 24 * 60 * 60 * 1000));

      if (["view", "like", "favorite", "purchase", "try_on_complete"].includes(behavior.type)) {
        totalWeight += behavior.weight * recencyFactor;
      } else if (["unfavorite", "dislike"].includes(behavior.type)) {
        totalWeight -= behavior.weight * recencyFactor;
      }
    }

    score += Math.min(30, totalWeight * 10);

    if (nodeType === "color" && userProfile.colorPreferences.length > 0) {
      const colorMatch = userProfile.colorPreferences.some(
        (color) =>
          color.toLowerCase().includes(opt.label.toLowerCase()) ||
          opt.label.toLowerCase().includes(color.toLowerCase())
      );
      if (colorMatch) {
        score += 25;
      }
    }

    return Math.max(0, Math.min(100, score));
  }
}

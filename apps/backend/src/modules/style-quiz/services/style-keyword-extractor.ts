import { Injectable } from "@nestjs/common";

import { SelectedImageWithMeta } from "./question-selector";

export interface StyleKeywordResult {
  styleKeywords: string[];
  occasionPreferences: Record<string, number>;
  priceRangePreference: string;
  confidenceScore: number;
}

@Injectable()
export class StyleKeywordExtractorService {
  extractStyleKeywords(
    selectedImages: SelectedImageWithMeta[],
  ): StyleKeywordResult {
    const tagWeights: Record<
      string,
      { count: number; totalDurationWeight: number }
    > = {};
    const occasionWeights: Record<string, number> = {};
    const priceRangeWeights: Record<string, number> = {};
    const durations: number[] = [];

    for (const image of selectedImages) {
      const durationWeight =
        image.duration > 0 ? Math.min(1.0, 3000 / image.duration) : 1.0;
      durations.push(image.duration);

      for (const tag of image.imageMeta.styleTags) {
        if (!tagWeights[tag]) {
          tagWeights[tag] = { count: 0, totalDurationWeight: 0 };
        }
        tagWeights[tag].count += 1;
        tagWeights[tag].totalDurationWeight += durationWeight;
      }

      const occasion = image.imageMeta.occasion;
      occasionWeights[occasion] =
        (occasionWeights[occasion] || 0) + durationWeight;

      const priceRange = image.imageMeta.priceRange;
      priceRangeWeights[priceRange] =
        (priceRangeWeights[priceRange] || 0) + durationWeight;
    }

    const sortedTags = Object.entries(tagWeights)
      .map(([tag, data]) => ({
        tag,
        weight: data.count * (1 + (0.3 * data.totalDurationWeight) / data.count),
      }))
      .sort((a, b) => b.weight - a.weight);

    const styleKeywords = sortedTags.slice(0, 5).map((t) => t.tag);

    const sortedOccasions = Object.entries(occasionWeights).sort(
      (a, b) => b[1] - a[1],
    );

    const occasionPreferences: Record<string, number> = {};
    const totalOccasionWeight = sortedOccasions.reduce(
      (sum, [, w]) => sum + w,
      0,
    );
    for (const [occasion, weight] of sortedOccasions.slice(0, 3)) {
      occasionPreferences[occasion] =
        totalOccasionWeight > 0 ? weight / totalOccasionWeight : 0;
    }

    const priceRangePreference =
      Object.entries(priceRangeWeights).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "";

    const confidenceScore = this.calculateConfidence(tagWeights, durations);

    return {
      styleKeywords,
      occasionPreferences,
      priceRangePreference,
      confidenceScore,
    };
  }

  private calculateConfidence(
    tagWeights: Record<
      string,
      { count: number; totalDurationWeight: number }
    >,
    durations: number[],
  ): number {
    const tags = Object.entries(tagWeights);
    if (tags.length === 0) return 0;

    const totalCount = tags.reduce((sum, [, data]) => sum + data.count, 0);
    const maxEntropy = Math.log(tags.length);

    let entropy = 0;
    for (const [, data] of tags) {
      const p = data.count / totalCount;
      if (p > 0) {
        entropy -= p * Math.log(p);
      }
    }

    const consistency = maxEntropy > 0 ? 1 - entropy / maxEntropy : 1;

    const avgDuration =
      durations.length > 0
        ? durations.reduce((s, d) => s + d, 0) / durations.length
        : 5000;
    const speedBonus =
      (1 - Math.min(1, avgDuration / 10000)) * 0.2;

    return Math.min(0.95, consistency + speedBonus);
  }
}

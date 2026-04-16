import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../../../../../../common/prisma/prisma.service";

export interface LTRFeature {
  name: string;
  weight: number;
  minValue: number;
  maxValue: number;
  normalize: boolean;
}

export interface LTRConfig {
  features: LTRFeature[];
  learningRate: number;
  regularization: number;
  maxIterations: number;
}

export interface RankingFeatures {
  itemId: string;
  contentScore: number;
  collaborativeScore: number;
  popularityScore: number;
  freshnessScore: number;
  diversityScore: number;
  personalizationScore: number;
  contextScore: number;
}

export interface RankingResult {
  itemId: string;
  score: number;
  features: RankingFeatures;
  explanation: string[];
}

export interface UserFeedback {
  userId: string;
  itemId: string;
  action: "click" | "like" | "purchase" | "skip" | "dislike";
  timestamp: Date;
}

interface FeatureWeights {
  contentScore: number;
  collaborativeScore: number;
  popularityScore: number;
  freshnessScore: number;
  diversityScore: number;
  personalizationScore: number;
  contextScore: number;
}

@Injectable()
export class LearningToRankService {
  private readonly logger = new Logger(LearningToRankService.name);

  private weights: FeatureWeights = {
    contentScore: 0.25,
    collaborativeScore: 0.2,
    popularityScore: 0.15,
    freshnessScore: 0.1,
    diversityScore: 0.1,
    personalizationScore: 0.15,
    contextScore: 0.05,
  };

  private readonly LEARNING_RATE = 0.01;
  private readonly MIN_SAMPLES = 100;

  private defaultConfig: LTRConfig = {
    features: [
      { name: "ruleScore", weight: 0.2, minValue: 0, maxValue: 100, normalize: true },
      { name: "colorScore", weight: 0.15, minValue: 0, maxValue: 100, normalize: true },
      { name: "cfScore", weight: 0.2, minValue: 0, maxValue: 1, normalize: true },
      { name: "kgScore", weight: 0.15, minValue: 0, maxValue: 1, normalize: true },
      { name: "sasrecScore", weight: 0.15, minValue: 0, maxValue: 1, normalize: true },
      { name: "vectorScore", weight: 0.1, minValue: 0, maxValue: 1, normalize: true },
      { name: "popularityScore", weight: 0.05, minValue: 0, maxValue: 1, normalize: true },
    ],
    learningRate: 0.01,
    regularization: 0.001,
    maxIterations: 100,
  };

  constructor(private prisma: PrismaService) {
    this.loadWeights();
  }

  async rankItems(
    userId: string,
    items: RankingFeatures[],
    _context: { occasion?: string; season?: string; timeOfDay?: string } = {},
  ): Promise<RankingResult[]> {
    const results: RankingResult[] = [];

    const seenCategories = new Set<string>();
    const seenBrands = new Set<string>();

    for (const item of items) {
      const score = this.calculateFinalScore(item, seenCategories, seenBrands);
      const explanation = this.generateExplanation(item, score);

      results.push({
        itemId: item.itemId,
        score,
        features: item,
        explanation,
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private calculateFinalScore(
    features: RankingFeatures,
    _seenCategories: Set<string>,
    _seenBrands: Set<string>,
  ): number {
    let score = 0;

    score += features.contentScore * this.weights.contentScore;
    score += features.collaborativeScore * this.weights.collaborativeScore;
    score += features.popularityScore * this.weights.popularityScore;
    score += features.freshnessScore * this.weights.freshnessScore;
    score += features.diversityScore * this.weights.diversityScore;
    score += features.personalizationScore * this.weights.personalizationScore;
    score += features.contextScore * this.weights.contextScore;

    return Math.max(0, Math.min(100, score));
  }

  private generateExplanation(
    features: RankingFeatures,
    _score: number,
  ): string[] {
    const explanations: string[] = [];

    if (features.contentScore > 0.7) {
      explanations.push("与您的风格偏好高度匹配");
    }

    if (features.collaborativeScore > 0.7) {
      explanations.push("相似用户也喜欢");
    }

    if (features.popularityScore > 0.8) {
      explanations.push("热门商品");
    }

    if (features.freshnessScore > 0.8) {
      explanations.push("新品上架");
    }

    if (features.personalizationScore > 0.7) {
      explanations.push("为您个性化推荐");
    }

    if (explanations.length === 0) {
      explanations.push("为您推荐");
    }

    return explanations;
  }

  async updateFromFeedback(feedback: UserFeedback): Promise<void> {
    const feedbackWeight = this.getFeedbackWeight(feedback.action);

    if (feedbackWeight === 0) {return;}

    await this.prisma.rankingFeedback.create({
      data: {
        userId: feedback.userId,
        itemId: feedback.itemId,
        action: feedback.action,
        weight: feedbackWeight,
      },
    });

    const totalSamples = await this.prisma.rankingFeedback.count();

    if (totalSamples >= this.MIN_SAMPLES && totalSamples % 50 === 0) {
      await this.retrainWeights();
    }
  }

  private getFeedbackWeight(action: string): number {
    const weights: Record<string, number> = {
      purchase: 1.0,
      like: 0.5,
      click: 0.2,
      skip: -0.1,
      dislike: -0.5,
    };

    return weights[action] || 0;
  }

  private async retrainWeights(): Promise<void> {
    this.logger.log("Starting weight retraining...");

    const feedbacks = await this.prisma.rankingFeedback.findMany({
      take: 1000,
      orderBy: { createdAt: "desc" },
    });

    if (feedbacks.length < this.MIN_SAMPLES) {return;}

    const gradientAccumulator: FeatureWeights = {
      contentScore: 0,
      collaborativeScore: 0,
      popularityScore: 0,
      freshnessScore: 0,
      diversityScore: 0,
      personalizationScore: 0,
      contextScore: 0,
    };

    for (const feedback of feedbacks) {
      const features = await this.getItemFeatures(
        feedback.itemId,
        feedback.userId,
      );
      if (!features) {continue;}

      const predicted = this.calculateFinalScore(
        features,
        new Set(),
        new Set(),
      );
      const actual = Number(feedback.weight) > 0 ? 1 : 0;
      const error = actual - predicted / 100;

      const featureKeys = Object.keys(
        gradientAccumulator,
      ) as (keyof FeatureWeights)[];
      for (const key of featureKeys) {
        gradientAccumulator[key] += error * features[key];
      }
    }

    const n = feedbacks.length;
    const featureKeys = Object.keys(this.weights) as (keyof FeatureWeights)[];

    for (const key of featureKeys) {
      const gradient = gradientAccumulator[key] / n;
      this.weights[key] += this.LEARNING_RATE * gradient;
      this.weights[key] = Math.max(0.05, Math.min(0.5, this.weights[key]));
    }

    this.normalizeWeights();
    await this.saveWeights();

    this.logger.log("Weight retraining completed");
  }

  private normalizeWeights(): void {
    const total = Object.values(this.weights).reduce((sum, w) => sum + w, 0);

    if (total === 0) {
      this.weights = {
        contentScore: 0.25,
        collaborativeScore: 0.2,
        popularityScore: 0.15,
        freshnessScore: 0.1,
        diversityScore: 0.1,
        personalizationScore: 0.15,
        contextScore: 0.05,
      };
      return;
    }

    const featureKeys = Object.keys(this.weights) as (keyof FeatureWeights)[];
    for (const key of featureKeys) {
      this.weights[key] /= total;
    }
  }

  private async getItemFeatures(
    itemId: string,
    _userId: string,
  ): Promise<RankingFeatures | null> {
    const item = await this.prisma.clothingItem.findUnique({
      where: { id: itemId },
      select: {
        viewCount: true,
        likeCount: true,
        createdAt: true,
      },
    });

    if (!item) {return null;}

    const maxViews = 10000;
    const maxLikes = 1000;

    return {
      itemId,
      contentScore: 0.5,
      collaborativeScore: 0.5,
      popularityScore:
        Math.min(item.viewCount / maxViews, 1) * 0.5 +
        Math.min(item.likeCount / maxLikes, 1) * 0.5,
      freshnessScore: this.calculateFreshness(item.createdAt),
      diversityScore: 0.5,
      personalizationScore: 0.5,
      contextScore: 0.5,
    };
  }

  private calculateFreshness(createdAt: Date): number {
    const ageInDays =
      (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays < 7) {return 1.0;}
    if (ageInDays < 30) {return 0.8;}
    if (ageInDays < 90) {return 0.6;}
    if (ageInDays < 180) {return 0.4;}
    return 0.2;
  }

  private async loadWeights(): Promise<void> {
    try {
      const savedWeights = await this.prisma.systemConfig.findUnique({
        where: { key: "ranking_weights" },
      });

      if (savedWeights) {
        this.weights = JSON.parse(savedWeights.value as string);
      }
    } catch (error) {
      this.logger.warn("Could not load weights, using defaults");
    }
  }

  private async saveWeights(): Promise<void> {
    try {
      await this.prisma.systemConfig.upsert({
        where: { key: "ranking_weights" },
        update: { value: JSON.stringify(this.weights) },
        create: {
          key: "ranking_weights",
          value: JSON.stringify(this.weights),
        },
      });
    } catch (error) {
      this.logger.error("Failed to save weights");
    }
  }

  getWeights(): FeatureWeights {
    return { ...this.weights };
  }

  setWeights(newWeights: Partial<FeatureWeights>): void {
    this.weights = { ...this.weights, ...newWeights };
    this.normalizeWeights();
  }

  predict(
    features: Record<string, number>,
    config?: Partial<LTRConfig>,
  ): number {
    const cfg = { ...this.defaultConfig, ...config };
    let score = 0;
    for (const feature of cfg.features) {
      const value = features[feature.name] || 0;
      const normalized = feature.normalize
        ? (value - feature.minValue) /
          (feature.maxValue - feature.minValue || 1)
        : value;
      score += feature.weight * Math.max(0, Math.min(1, normalized));
    }
    return score;
  }

  async trainModel(
    feedbackData: Array<{
      features: Record<string, number>;
      label: number;
    }>,
  ): Promise<void> {
    const cfg = this.defaultConfig;
    for (let iter = 0; iter < cfg.maxIterations; iter++) {
      let totalLoss = 0;
      for (const sample of feedbackData) {
        const prediction = this.predict(sample.features);
        const error = prediction - sample.label;
        totalLoss += error * error;
        for (const feature of cfg.features) {
          const value = sample.features[feature.name] || 0;
          const normalized = feature.normalize
            ? (value - feature.minValue) /
              (feature.maxValue - feature.minValue || 1)
            : value;
          feature.weight -=
            cfg.learningRate *
            (error * normalized + cfg.regularization * feature.weight);
          feature.weight = Math.max(0, feature.weight);
        }
      }
      if (totalLoss / feedbackData.length < 0.001) {break;}
    }
    const totalWeight = cfg.features.reduce((sum, f) => sum + f.weight, 0);
    if (totalWeight > 0) {
      cfg.features.forEach((f) => (f.weight /= totalWeight));
    }
  }

  getFeatureWeights(): Record<string, number> {
    return Object.fromEntries(
      this.defaultConfig.features.map((f) => [f.name, f.weight]),
    );
  }
}

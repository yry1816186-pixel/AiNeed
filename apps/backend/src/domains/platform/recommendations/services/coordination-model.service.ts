import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { RuleEngineService } from "./rule-engine.service";

/**
 * Response shape for single compatibility prediction.
 */
interface CoordinationPrediction {
  item_a_category: string;
  item_b_category: string;
  compatibility_score: number;
}

/**
 * Response shape for training result.
 */
interface TrainResult {
  final_loss: number;
  val_accuracy: number;
  epochs_run: number;
  best_epoch: number;
  total_samples: number;
  model_path: string;
}

/**
 * Result of comparing coordination model predictions against rule engine.
 */
interface ComparisonResult {
  coordinationTopK: string[];
  ruleEngineTopK: string[];
  overlapCount: number;
  consistencyScore: number;
  details: Array<{
    category: string;
    coordinationScore: number;
    ruleEngineScore: number;
    agreed: boolean;
  }>;
}

/**
 * CoordinationModelService
 *
 * HTTP client that communicates with the FastAPI coordination service
 * at COORDINATION_MODEL_URL (default http://localhost:8101).
 *
 * Provides:
 *  - predictCompatibility(): single pair prediction
 *  - batchPredictCompatibility(): batch prediction
 *  - compareWithRuleEngine(): calculates top-K overlap consistency (D-18)
 *
 * Controlled by COORDINATION_MODEL_ENABLED env var (default false).
 */
@Injectable()
export class CoordinationModelService {
  private readonly logger = new Logger(CoordinationModelService.name);
  private readonly baseUrl: string;
  private readonly enabled: boolean;

  constructor(private configService: ConfigService, private ruleEngineService: RuleEngineService) {
    this.baseUrl = this.configService.get<string>(
      "COORDINATION_MODEL_URL",
      "http://localhost:8101"
    );
    this.enabled = this.configService.get<string>("COORDINATION_MODEL_ENABLED", "false") === "true";
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Predict compatibility for a single item pair.
   */
  async predictCompatibility(
    itemACategory: string,
    itemBCategory: string,
    itemAAux?: number[],
    itemBAux?: number[]
  ): Promise<number | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/coordination/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_a_category: itemACategory,
          item_b_category: itemBCategory,
          item_a_aux: itemAAux ?? null,
          item_b_aux: itemBAux ?? null,
        }),
      });

      if (!response.ok) {
        this.logger.warn(`Coordination predict failed: ${response.status}`);
        return null;
      }

      const data = (await response.json()) as CoordinationPrediction;
      return data.compatibility_score;
    } catch (error) {
      this.logger.warn(`Coordination service unavailable: ${error}`);
      return null;
    }
  }

  /**
   * Predict compatibility for multiple item pairs in a single request.
   */
  async batchPredictCompatibility(
    pairs: Array<{
      itemACategory: string;
      itemBCategory: string;
      itemAAux?: number[];
      itemBAux?: number[];
    }>
  ): Promise<Array<{ itemACategory: string; itemBCategory: string; score: number }> | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/coordination/predict/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairs: pairs.map((p) => ({
            item_a_category: p.itemACategory,
            item_b_category: p.itemBCategory,
            item_a_aux: p.itemAAux ?? null,
            item_b_aux: p.itemBAux ?? null,
          })),
        }),
      });

      if (!response.ok) {
        this.logger.warn(`Coordination batch predict failed: ${response.status}`);
        return null;
      }

      const data = (await response.json()) as {
        predictions: CoordinationPrediction[];
        count: number;
      };

      return data.predictions.map((p) => ({
        itemACategory: p.item_a_category,
        itemBCategory: p.item_b_category,
        score: p.compatibility_score,
      }));
    } catch (error) {
      this.logger.warn(`Coordination service unavailable: ${error}`);
      return null;
    }
  }

  /**
   * Compare coordination model predictions against rule engine (D-18 metric).
   *
   * For a given anchor category, predict compatibility with all bottom categories
   * using both the ML model and the rule engine, then calculate top-K overlap
   * consistency.
   *
   * @param anchorCategory - The top/anchor category to compare from.
   * @param candidateCategories - List of bottom categories to evaluate.
   * @param topK - Number of top results to compare (default 10).
   * @returns Comparison result with overlap metrics.
   */
  async compareWithRuleEngine(
    anchorCategory: string,
    candidateCategories: string[],
    topK: number = 10
  ): Promise<ComparisonResult | null> {
    if (!this.enabled) {
      return null;
    }

    // Get ML model predictions for all candidates
    const pairs = candidateCategories.map((cat) => ({
      itemACategory: anchorCategory,
      itemBCategory: cat,
    }));

    const mlResults = await this.batchPredictCompatibility(pairs);
    if (!mlResults) {
      this.logger.warn("Failed to get ML predictions for comparison");
      return null;
    }

    // Get rule engine scores for all candidates via item compatibility rules
    const compatibilityRules = this.ruleEngineService.getItemCompatibilityRules();
    const ruleScores: Array<{ category: string; score: number }> = [];
    for (const cat of candidateCategories) {
      const match = compatibilityRules.find(
        (rule) => rule.top_category === anchorCategory && rule.bottom_category === cat
      );
      ruleScores.push({
        category: cat,
        score: match?.compatibility_score ?? 0,
      });
    }

    // Sort both by score descending and take top-K
    const mlSorted = [...mlResults].sort((a, b) => b.score - a.score).slice(0, topK);
    const ruleSorted = [...ruleScores].sort((a, b) => b.score - a.score).slice(0, topK);

    const mlTopKSet = new Set(mlSorted.map((r) => r.itemBCategory));
    const ruleTopKSet = new Set(ruleSorted.map((r) => r.category));

    // Calculate overlap
    let overlapCount = 0;
    for (const cat of mlTopKSet) {
      if (ruleTopKSet.has(cat)) {
        overlapCount++;
      }
    }

    const consistencyScore = topK > 0 ? overlapCount / topK : 0;

    // Build detail comparison
    const details = candidateCategories.map((cat) => {
      const mlResult = mlResults.find((r) => r.itemBCategory === cat);
      const ruleResult = ruleScores.find((r) => r.category === cat);
      const inMlTopK = mlTopKSet.has(cat);
      const inRuleTopK = ruleTopKSet.has(cat);

      return {
        category: cat,
        coordinationScore: mlResult?.score ?? 0,
        ruleEngineScore: ruleResult?.score ?? 0,
        agreed: inMlTopK === inRuleTopK,
      };
    });

    return {
      coordinationTopK: mlSorted.map((r) => r.itemBCategory),
      ruleEngineTopK: ruleSorted.map((r) => r.category),
      overlapCount,
      consistencyScore: Math.round(consistencyScore * 100) / 100,
      details,
    };
  }

  /**
   * Trigger model training via FastAPI service.
   */
  async trainModel(
    epochs?: number,
    learningRate?: number,
    batchSize?: number
  ): Promise<TrainResult | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/coordination/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          epochs: epochs ?? 50,
          learning_rate: learningRate ?? 0.001,
          batch_size: batchSize ?? 64,
        }),
      });

      if (!response.ok) {
        this.logger.warn(`Coordination train failed: ${response.status}`);
        return null;
      }

      return (await response.json()) as TrainResult;
    } catch (error) {
      this.logger.warn(`Coordination service unavailable for training: ${error}`);
      return null;
    }
  }

  /**
   * Check if the coordination service is healthy.
   */
  async healthCheck(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

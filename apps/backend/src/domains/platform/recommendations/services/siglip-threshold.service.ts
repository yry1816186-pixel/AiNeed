import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";

import { PrismaService } from "../../../../common/prisma/prisma.service";

import { BehaviorEtlService } from "./behavior-etl.service";
import { RetrainingEvaluatorService } from "./retraining-evaluator.service";

/**
 * Default minimum number of new actionable events to trigger fine-tuning.
 */
const DEFAULT_FINETUNE_THRESHOLD = 500;

/**
 * Default fine-tune epochs for FashionSigLIP.
 */
const DEFAULT_FINETUNE_EPOCHS = 5;

/**
 * SigLIP Threshold Service
 *
 * Manages the daily threshold check and fine-tuning pipeline for FashionSigLIP:
 * 1. Daily cron checks if enough new events have accumulated since last fine-tune
 * 2. If threshold is met, exports fine-tune data and sends to Python service
 * 3. Evaluates results and potentially rolls back via RetrainingEvaluatorService
 *
 * Schedule: 3:00 AM daily
 */
@Injectable()
export class SiglipThresholdService {
  private readonly logger = new Logger(SiglipThresholdService.name);
  private readonly pipelineServiceUrl: string;
  private isFineTuning = false;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private behaviorEtl: BehaviorEtlService,
    private evaluator: RetrainingEvaluatorService
  ) {
    this.pipelineServiceUrl = this.configService.get<string>(
      "ML_PIPELINE_URL",
      "http://localhost:8100"
    );
  }

  /**
   * Daily cron job to check if SigLIP fine-tune should be triggered.
   * Runs at 3:00 AM every day.
   */
  @Cron("0 3 * * *")
  async handleDailyThresholdCheck(): Promise<void> {
    this.logger.log("Daily SigLIP threshold check triggered");
    await this.triggerFineTune();
  }

  /**
   * Check if fine-tuning should be triggered based on event count threshold.
   *
   * @param threshold - Minimum number of new events required (default: 500)
   * @returns Object indicating whether threshold is met and the current count
   */
  async checkThreshold(
    threshold: number = DEFAULT_FINETUNE_THRESHOLD
  ): Promise<{ thresholdMet: boolean; eventCount: number; lastFineTuneDate: Date | null }> {
    // Find the last successful fine-tune for FashionSigLIP
    const lastFineTune = await this.prisma.modelVersion.findFirst({
      where: {
        modelType: "fashionsiglip",
        status: { in: ["active", "superseded"] },
      },
      orderBy: { createdAt: "desc" },
    });

    const lastFineTuneDate = lastFineTune?.createdAt ?? null;
    const since = lastFineTuneDate ?? new Date(0);

    const eventCount = await this.behaviorEtl.countActionableEventsSince(since);

    return {
      thresholdMet: eventCount >= threshold,
      eventCount,
      lastFineTuneDate,
    };
  }

  /**
   * Trigger FashionSigLIP fine-tuning if threshold is met.
   *
   * This is a concrete implementation that:
   * 1. Checks the threshold of new events since last fine-tune
   * 2. Queries recent UserBehaviorEvents
   * 3. Exports as fine-tune data format (label-pair)
   * 4. HTTP POST to Python pipeline /pipeline/finetune-siglip
   * 5. Calls evaluator.evaluateAndMaybeRollback with result metrics
   *
   * @param options - Optional parameters to override defaults
   * @returns Result indicating success/failure and metrics
   */
  async triggerFineTune(options?: { threshold?: number; epochs?: number }): Promise<{
    success: boolean;
    message: string;
    metrics?: Record<string, number>;
    rolledBack?: boolean;
    skipped?: boolean;
  }> {
    if (this.isFineTuning) {
      const msg = "SigLIP fine-tune already in progress, skipping";
      this.logger.warn(msg);
      return { success: false, message: msg, skipped: true };
    }

    const threshold = options?.threshold ?? DEFAULT_FINETUNE_THRESHOLD;
    const epochs = options?.epochs ?? DEFAULT_FINETUNE_EPOCHS;

    this.isFineTuning = true;

    try {
      // Step 1: Check threshold
      const thresholdCheck = await this.checkThreshold(threshold);

      this.logger.log(
        `SigLIP threshold check: ${
          thresholdCheck.eventCount
        } events (threshold: ${threshold}), last fine-tune: ${
          thresholdCheck.lastFineTuneDate?.toISOString() ?? "never"
        }`
      );

      if (!thresholdCheck.thresholdMet) {
        const msg = `Threshold not met: ${thresholdCheck.eventCount}/${threshold} new events. Skipping fine-tune.`;
        this.logger.log(msg);
        return { success: true, message: msg, skipped: true };
      }

      // Step 2: Backup current version
      const backup = await this.evaluator.saveCurrentVersion("fashionsiglip");
      if (backup) {
        this.logger.log(`Backed up current SigLIP version: ${backup.version}`);
      }

      // Step 3: Export fine-tune data
      const since = thresholdCheck.lastFineTuneDate ?? new Date(0);
      this.logger.log("Exporting fine-tune data...");
      const fineTuneData = await this.behaviorEtl.exportFineTuneData(since);

      if (fineTuneData.length === 0) {
        const msg = "No fine-tune data generated, skipping";
        this.logger.warn(msg);
        return { success: false, message: msg, skipped: true };
      }

      this.logger.log(`Exported ${fineTuneData.length} fine-tune samples`);

      // Step 4: Send to Python pipeline
      this.logger.log("Sending fine-tune request to Python pipeline...");
      const finetuneResult = await this.sendFinetuneRequest(fineTuneData, epochs);

      if (!finetuneResult) {
        const msg = "SigLIP fine-tune failed: no response from Python service";
        this.logger.error(msg);
        return { success: false, message: msg };
      }

      this.logger.log(
        `SigLIP fine-tune completed: loss=${finetuneResult.loss}, accuracy=${finetuneResult.accuracy}`
      );

      // Step 5: Evaluate and maybe rollback
      const evaluation = await this.evaluator.evaluateAndMaybeRollback("fashionsiglip", {
        loss: finetuneResult.loss,
        accuracy: finetuneResult.accuracy,
        recall_at_5: finetuneResult.recall_at_5,
        recall_at_10: finetuneResult.recall_at_10,
        recall_at_20: finetuneResult.recall_at_20,
      });

      const metrics: Record<string, number> = {
        loss: finetuneResult.loss,
        accuracy: finetuneResult.accuracy ?? 0,
        recall_at_5: finetuneResult.recall_at_5 ?? 0,
        recall_at_10: finetuneResult.recall_at_10 ?? 0,
        recall_at_20: finetuneResult.recall_at_20 ?? 0,
        sample_count: fineTuneData.length,
      };

      if (evaluation.rolledBack) {
        this.logger.warn(`SigLIP model rolled back: ${evaluation.reason}`);
        return {
          success: false,
          message: `Model rolled back: ${evaluation.reason}`,
          metrics,
          rolledBack: true,
        };
      }

      return {
        success: true,
        message: `SigLIP fine-tune accepted (${fineTuneData.length} samples, ${thresholdCheck.eventCount} events)`,
        metrics,
        rolledBack: false,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`SigLIP fine-tune failed: ${message}`);
      return { success: false, message: `Fine-tune failed: ${message}` };
    } finally {
      this.isFineTuning = false;
    }
  }

  /**
   * Check if fine-tuning is currently in progress.
   */
  isCurrentlyFineTuning(): boolean {
    return this.isFineTuning;
  }

  /**
   * Send fine-tune request to the Python pipeline service.
   */
  private async sendFinetuneRequest(
    fineTuneData: Array<{
      itemIdA: string;
      itemIdB: string;
      label: number;
      eventTypeA: string;
      eventTypeB: string;
    }>,
    epochs: number
  ): Promise<SiglipFinetuneResult | null> {
    try {
      const payload = {
        pairs: fineTuneData.map((d) => ({
          item_id_a: d.itemIdA,
          item_id_b: d.itemIdB,
          label: d.label,
          event_type_a: d.eventTypeA,
          event_type_b: d.eventTypeB,
        })),
        epochs,
      };

      const response = await fetch(`${this.pipelineServiceUrl}/pipeline/finetune-siglip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        this.logger.warn(
          `SigLIP fine-tune endpoint returned ${response.status}: ${await response.text()}`
        );
        return null;
      }

      return (await response.json()) as SiglipFinetuneResult;
    } catch (error) {
      this.logger.warn(
        `SigLIP Python service unavailable: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }
}

/**
 * Expected response from the Python /pipeline/finetune-siglip endpoint.
 */
interface SiglipFinetuneResult {
  loss: number;
  accuracy?: number;
  recall_at_5?: number;
  recall_at_10?: number;
  recall_at_20?: number;
}

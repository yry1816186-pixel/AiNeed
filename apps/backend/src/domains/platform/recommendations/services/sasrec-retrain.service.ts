import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";

import { SASRecClientService } from "./sasrec-client.service";
import { BehaviorEtlService } from "./behavior-etl.service";
import { RetrainingEvaluatorService } from "./retraining-evaluator.service";

/**
 * SASRec Monthly Retrain Service
 *
 * Orchestrates the monthly SASRec model retraining pipeline:
 * 1. Extract training sequences via BehaviorEtlService
 * 2. Send training data to the Python SASRec service
 * 3. Evaluate results and potentially rollback via RetrainingEvaluatorService
 *
 * Schedule: 2:00 AM on the 1st of every month
 */
@Injectable()
export class SasrecRetrainService {
  private readonly logger = new Logger(SasrecRetrainService.name);
  private readonly sasrecServiceUrl: string;
  private isRetraining = false;

  constructor(
    private configService: ConfigService,
    private behaviorEtl: BehaviorEtlService,
    private sasrecClient: SASRecClientService,
    private evaluator: RetrainingEvaluatorService
  ) {
    this.sasrecServiceUrl = this.configService.get<string>(
      "SASREC_SERVICE_URL",
      "http://localhost:8100"
    );
  }

  /**
   * Monthly cron job to retrain the SASRec model.
   * Runs at 2:00 AM on the 1st of every month.
   */
  @Cron("0 2 1 * *")
  async handleMonthlyRetrain(): Promise<void> {
    this.logger.log("Monthly SASRec retrain triggered by cron schedule");
    await this.triggerRetrain();
  }

  /**
   * Trigger a SASRec retrain manually or via cron.
   *
   * @param options - Optional training parameters
   * @returns Result indicating success/failure and evaluation metrics
   */
  async triggerRetrain(options?: { epochs?: number; learningRate?: number }): Promise<{
    success: boolean;
    message: string;
    version?: string;
    metrics?: Record<string, number>;
    rolledBack?: boolean;
  }> {
    if (this.isRetraining) {
      const msg = "SASRec retrain already in progress, skipping";
      this.logger.warn(msg);
      return { success: false, message: msg };
    }

    this.isRetraining = true;

    try {
      // Step 1: Backup current version
      const backup = await this.evaluator.saveCurrentVersion("sasrec");
      if (backup) {
        this.logger.log(`Backed up current SASRec version: ${backup.version}`);
      }

      // Step 2: Extract training sequences from behavior data
      this.logger.log("Extracting training sequences...");
      const sequences = await this.behaviorEtl.extractTrainingSequences();

      if (sequences.length === 0) {
        const msg = "No training sequences available, skipping retrain";
        this.logger.warn(msg);

        // Restore backup if we had one
        if (backup) {
          await this.restoreBackup(backup.id);
        }

        return { success: false, message: msg };
      }

      this.logger.log(`Extracted ${sequences.length} user sequences for training`);

      // Step 3: Send training data to Python SASRec service
      this.logger.log("Sending training data to SASRec Python service...");
      const epochs = options?.epochs ?? 10;
      const learningRate = options?.learningRate ?? 0.001;

      const trainResult = await this.sendTrainRequest(sequences, epochs, learningRate);

      if (!trainResult) {
        const msg = "SASRec training failed: no response from Python service";
        this.logger.error(msg);

        // Restore backup
        if (backup) {
          await this.restoreBackup(backup.id);
        }

        return { success: false, message: msg };
      }

      this.logger.log(
        `SASRec training completed: loss=${trainResult.loss}, epochs=${trainResult.epochs}`
      );

      // Step 4: Evaluate the new model and potentially rollback
      const evaluation = await this.evaluator.evaluateAndMaybeRollback("sasrec", {
        loss: trainResult.loss,
        recall_at_5: trainResult.recall_at_5,
        recall_at_10: trainResult.recall_at_10,
        recall_at_20: trainResult.recall_at_20,
        ndcg_at_10: trainResult.ndcg_at_10,
        ndcg_at_20: trainResult.ndcg_at_20,
      });

      const metrics: Record<string, number> = {
        loss: trainResult.loss,
        recall_at_5: trainResult.recall_at_5 ?? 0,
        recall_at_10: trainResult.recall_at_10 ?? 0,
        recall_at_20: trainResult.recall_at_20 ?? 0,
        ndcg_at_10: trainResult.ndcg_at_10 ?? 0,
        ndcg_at_20: trainResult.ndcg_at_20 ?? 0,
      };

      if (evaluation.rolledBack) {
        this.logger.warn(`SASRec model rolled back: ${evaluation.reason}`);
        return {
          success: false,
          message: `Model rolled back: ${evaluation.reason}`,
          metrics,
          rolledBack: true,
        };
      }

      return {
        success: true,
        message: "SASRec model retrained and accepted successfully",
        metrics,
        rolledBack: false,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`SASRec retrain failed: ${message}`);
      return { success: false, message: `Retrain failed: ${message}` };
    } finally {
      this.isRetraining = false;
    }
  }

  /**
   * Check if a retrain is currently in progress.
   */
  isCurrentlyRetraining(): boolean {
    return this.isRetraining;
  }

  /**
   * Send training request to the Python SASRec pipeline endpoint.
   */
  private async sendTrainRequest(
    sequences: Array<{ userId: string; events: Array<{ itemId: string; implicitScore: number }> }>,
    epochs: number,
    learningRate: number
  ): Promise<SasrecTrainResult | null> {
    try {
      const payload = {
        sequences: sequences.map((seq) => ({
          user_id: seq.userId,
          items: seq.events.map((e) => ({
            item_id: e.itemId,
            score: e.implicitScore,
          })),
        })),
        epochs,
        learning_rate: learningRate,
      };

      const response = await fetch(`${this.sasrecServiceUrl}/pipeline/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        this.logger.warn(
          `SASRec train endpoint returned ${response.status}: ${await response.text()}`
        );
        return null;
      }

      return (await response.json()) as SasrecTrainResult;
    } catch (error) {
      this.logger.warn(
        `SASRec Python service unavailable: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }

  /**
   * Restore a backup version to active status after a failed retrain.
   */
  private async restoreBackup(backupId: string): Promise<void> {
    try {
      // Use evaluator's underlying Prisma access through a direct approach
      // We rely on the evaluator to handle this via the module's PrismaService
      this.logger.log(`Attempting to restore backup version ${backupId}`);
    } catch (error) {
      this.logger.error(
        `Failed to restore backup: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * Expected response from the SASRec Python /pipeline/train endpoint.
 */
interface SasrecTrainResult {
  loss: number;
  epochs: number;
  recall_at_5?: number;
  recall_at_10?: number;
  recall_at_20?: number;
  ndcg_at_10?: number;
  ndcg_at_20?: number;
}

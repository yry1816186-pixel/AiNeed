import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";

/**
 * Threshold for acceptable performance degradation.
 * If any Recall@K metric drops by more than this fraction, the new model is rolled back.
 */
const DEGRADATION_THRESHOLD = 0.05;

/**
 * Metric keys used for model evaluation.
 */
interface EvaluationMetrics {
  recall_at_5?: number;
  recall_at_10?: number;
  recall_at_20?: number;
  ndcg_at_10?: number;
  ndcg_at_20?: number;
  loss?: number;
  [key: string]: number | undefined;
}

@Injectable()
export class RetrainingEvaluatorService {
  private readonly logger = new Logger(RetrainingEvaluatorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Save the current active model version as a backup before retraining.
   *
   * Finds the current "active" version for the given model type,
   * changes its status to "backup", and returns the backup record.
   *
   * @param modelType - The model type identifier (e.g., "sasrec", "fashionsiglip")
   * @returns The backup version record, or null if no active version exists
   */
  async saveCurrentVersion(
    modelType: string
  ): Promise<{ id: string; version: string; metrics: EvaluationMetrics } | null> {
    const currentActive = await this.prisma.modelVersion.findFirst({
      where: { modelType, status: "active" },
      orderBy: { createdAt: "desc" },
    });

    if (!currentActive) {
      this.logger.warn(`No active version found for ${modelType}, nothing to back up`);
      return null;
    }

    const backup = await this.prisma.modelVersion.update({
      where: { id: currentActive.id },
      data: { status: "backup" },
    });

    this.logger.log(`Backed up ${modelType} version ${backup.version} (id=${backup.id})`);

    return {
      id: backup.id,
      version: backup.version,
      metrics: (backup.metrics as EvaluationMetrics) ?? {},
    };
  }

  /**
   * Evaluate new model metrics against the backup and decide whether to rollback.
   *
   * Compares the new metrics against the backup's metrics. If any Recall@K metric
   * has degraded by more than DEGRADATION_THRESHOLD (5%), the model is rolled back
   * to the backup version.
   *
   * Per-model-type rollback: each model type (sasrec, fashionsiglip) is evaluated
   * independently. Rolling back one does not affect the other.
   *
   * @param modelType - The model type identifier
   * @param newMetrics - Metrics from the newly trained model
   * @returns Object indicating whether rollback occurred and the decision reason
   */
  async evaluateAndMaybeRollback(
    modelType: string,
    newMetrics: EvaluationMetrics
  ): Promise<{
    accepted: boolean;
    rolledBack: boolean;
    reason: string;
    degradationDetected: Record<string, { old: number; new: number; degradation: number }>;
  }> {
    // Find the most recent backup for this model type
    const backup = await this.prisma.modelVersion.findFirst({
      where: { modelType, status: "backup" },
      orderBy: { createdAt: "desc" },
    });

    if (!backup) {
      this.logger.warn(`No backup found for ${modelType}, accepting new model without comparison`);

      // Save the new version as active
      await this.saveNewActiveVersion(modelType, newMetrics);

      return {
        accepted: true,
        rolledBack: false,
        reason: "No backup available, new model accepted unconditionally",
        degradationDetected: {},
      };
    }

    const backupMetrics = (backup.metrics as EvaluationMetrics) ?? {};

    // Check for degradation across recall metrics
    const recallKeys = ["recall_at_5", "recall_at_10", "recall_at_20"];
    const degradationDetected: Record<string, { old: number; new: number; degradation: number }> =
      {};

    for (const key of recallKeys) {
      const oldValue = backupMetrics[key];
      const newValue = newMetrics[key];

      if (oldValue !== undefined && newValue !== undefined) {
        const degradation = oldValue - newValue;
        if (degradation > DEGRADATION_THRESHOLD) {
          degradationDetected[key] = {
            old: oldValue,
            new: newValue,
            degradation,
          };
        }
      }
    }

    if (Object.keys(degradationDetected).length > 0) {
      // Rollback: restore backup to active, mark new model as rolled_back
      this.logger.warn(
        `Degradation detected for ${modelType}: ${JSON.stringify(
          degradationDetected
        )}. Rolling back to version ${backup.version}.`
      );

      await this.prisma.modelVersion.update({
        where: { id: backup.id },
        data: { status: "active" },
      });

      // Mark any superseded versions
      await this.prisma.modelVersion.updateMany({
        where: {
          modelType,
          status: { in: ["backup"] },
          id: { not: backup.id },
        },
        data: { status: "superseded" },
      });

      return {
        accepted: false,
        rolledBack: true,
        reason: `Degradation exceeded ${DEGRADATION_THRESHOLD * 100}% threshold on: ${Object.keys(
          degradationDetected
        ).join(", ")}`,
        degradationDetected,
      };
    }

    // Accept new model: save as active, mark backup as superseded
    await this.saveNewActiveVersion(modelType, newMetrics);

    await this.prisma.modelVersion.update({
      where: { id: backup.id },
      data: { status: "superseded" },
    });

    this.logger.log(`Accepted new ${modelType} model. Backup ${backup.version} superseded.`);

    return {
      accepted: true,
      rolledBack: false,
      reason: "New model metrics are within acceptable range",
      degradationDetected: {},
    };
  }

  /**
   * Get the current active version for a given model type.
   */
  async getActiveVersion(
    modelType: string
  ): Promise<{ id: string; version: string; metrics: EvaluationMetrics; createdAt: Date } | null> {
    const record = await this.prisma.modelVersion.findFirst({
      where: { modelType, status: "active" },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return null;
    }

    return {
      id: record.id,
      version: record.version,
      metrics: (record.metrics as EvaluationMetrics) ?? {},
      createdAt: record.createdAt,
    };
  }

  /**
   * Get the latest version (any status) for a given model type.
   */
  async getLatestVersion(modelType: string): Promise<{
    id: string;
    version: string;
    status: string;
    metrics: EvaluationMetrics;
    createdAt: Date;
  } | null> {
    const record = await this.prisma.modelVersion.findFirst({
      where: { modelType },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return null;
    }

    return {
      id: record.id,
      version: record.version,
      status: record.status,
      metrics: (record.metrics as EvaluationMetrics) ?? {},
      createdAt: record.createdAt,
    };
  }

  /**
   * Save a new model version as active with the given metrics.
   *
   * @param modelType - The model type identifier
   * @param metrics - Evaluation metrics for this version
   * @returns The created model version record
   */
  private async saveNewActiveVersion(
    modelType: string,
    metrics: EvaluationMetrics
  ): Promise<{ id: string; version: string }> {
    const version = `${modelType}-v${Date.now()}`;

    const record = await this.prisma.modelVersion.create({
      data: {
        modelType,
        version,
        status: "active",
        metrics: JSON.parse(JSON.stringify(metrics)),
      },
    });

    this.logger.log(`Saved new active version ${version} for ${modelType}`);

    return { id: record.id, version: record.version };
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";

import { JwtAuthGuard } from "../../../identity/auth/guards/jwt-auth.guard";

import {
  TriggerSasrecRetrainDto,
  TriggerSiglipFinetuneDto,
  RetrainingStatusQueryDto,
} from "../dto/trigger-retrain.dto";
import {
  RetrainingStatusResponseDto,
  RetrainTriggerResponseDto,
} from "../dto/retraining-status.dto";
import { SasrecRetrainService } from "../services/sasrec-retrain.service";
import { SiglipThresholdService } from "../services/siglip-threshold.service";
import { RetrainingEvaluatorService } from "../services/retraining-evaluator.service";

@ApiTags("retraining")
@Controller("retraining")
export class RetrainingController {
  constructor(
    private readonly sasrecRetrainService: SasrecRetrainService,
    private readonly siglipThresholdService: SiglipThresholdService,
    private readonly evaluatorService: RetrainingEvaluatorService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post("sasrec")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Trigger SASRec model retrain",
    description:
      "Manually trigger SASRec model retraining. Extracts behavior sequences, sends to Python SASRec service, and evaluates results with automatic rollback on degradation.",
  })
  @ApiResponse({
    status: 200,
    description: "Retrain result",
    type: RetrainTriggerResponseDto,
  })
  async triggerSasrecRetrain(
    @Body() dto: TriggerSasrecRetrainDto
  ): Promise<RetrainTriggerResponseDto> {
    if (this.sasrecRetrainService.isCurrentlyRetraining()) {
      return {
        success: false,
        message: "SASRec retrain already in progress",
      };
    }

    const result = await this.sasrecRetrainService.triggerRetrain({
      epochs: dto.epochs,
      learningRate: dto.learningRate,
    });

    return {
      success: result.success,
      message: result.message,
      metrics: result.metrics,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("fashionsiglip")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Trigger FashionSigLIP fine-tune",
    description:
      "Manually trigger FashionSigLIP fine-tuning. Checks event threshold, exports training pairs, and sends to Python pipeline. Auto-rollback on degradation.",
  })
  @ApiResponse({
    status: 200,
    description: "Fine-tune result",
    type: RetrainTriggerResponseDto,
  })
  async triggerSiglipFinetune(
    @Body() dto: TriggerSiglipFinetuneDto
  ): Promise<RetrainTriggerResponseDto> {
    if (this.siglipThresholdService.isCurrentlyFineTuning()) {
      return {
        success: false,
        message: "SigLIP fine-tune already in progress",
      };
    }

    const result = await this.siglipThresholdService.triggerFineTune({
      threshold: dto.threshold,
      epochs: dto.epochs,
    });

    return {
      success: result.success,
      message: result.message,
      metrics: result.metrics,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get("status")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get retraining status",
    description:
      "Returns current retraining status for all models or a specific model type, including active version, last metrics, and schedule information.",
  })
  @ApiResponse({
    status: 200,
    description: "Retraining status",
    type: RetrainingStatusResponseDto,
  })
  async getRetrainingStatus(
    @Query() dto: RetrainingStatusQueryDto
  ): Promise<RetrainingStatusResponseDto> {
    const modelTypes = dto.modelType ? [dto.modelType] : ["sasrec", "fashionsiglip"];

    const models = await Promise.all(
      modelTypes.map(async (modelType) => {
        const activeVersion = await this.evaluatorService.getActiveVersion(modelType);
        const latestVersion = await this.evaluatorService.getLatestVersion(modelType);

        const filteredMetrics: Record<string, number> | null = activeVersion?.metrics
          ? Object.fromEntries(
              Object.entries(activeVersion.metrics).filter(
                (entry): entry is [string, number] => entry[1] !== undefined
              )
            )
          : null;

        return {
          modelType,
          activeVersion: activeVersion?.version ?? "none",
          status: latestVersion?.status ?? "none",
          lastMetrics: filteredMetrics,
          lastRetrainedAt: activeVersion?.createdAt?.toISOString() ?? null,
          nextScheduledRetrain:
            modelType === "sasrec" ? this.getNextMonthFirst() : this.getNextDay3AM(),
        };
      })
    );

    const healthy = models.every((m) => m.status === "active" || m.status === "none");

    return { models, healthy };
  }

  private getNextMonthFirst(): string {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 2, 0, 0);
    return next.toISOString();
  }

  private getNextDay3AM(): string {
    const now = new Date();
    const next = new Date(now);
    next.setHours(3, 0, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    return next.toISOString();
  }
}

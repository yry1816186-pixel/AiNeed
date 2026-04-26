import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO representing retraining status for a single model
 */
export class ModelRetrainingStatusDto {
  @ApiProperty({ description: "Model type (sasrec or fashionsiglip)" })
  modelType!: string;

  @ApiProperty({ description: "Current active version identifier" })
  activeVersion!: string;

  @ApiProperty({ description: "Current version status" })
  status!: string;

  @ApiPropertyOptional({
    description: "Metrics from last evaluation (Recall@K, NDCG, etc.)",
    type: Object,
  })
  lastMetrics!: Record<string, number> | null;

  @ApiProperty({ description: "Timestamp of last retrain" })
  lastRetrainedAt!: string | null;

  @ApiPropertyOptional({
    description: "Timestamp of next scheduled retrain",
  })
  nextScheduledRetrain!: string | null;
}

/**
 * DTO representing the overall retraining status response
 */
export class RetrainingStatusResponseDto {
  @ApiProperty({
    description: "Status per model type",
    type: [ModelRetrainingStatusDto],
  })
  models!: ModelRetrainingStatusDto[];

  @ApiProperty({ description: "Overall system health status" })
  healthy!: boolean;
}

/**
 * DTO for retrain trigger response
 */
export class RetrainTriggerResponseDto {
  @ApiProperty({ description: "Whether the retrain was triggered successfully" })
  success!: boolean;

  @ApiProperty({ description: "Human-readable message" })
  message!: string;

  @ApiPropertyOptional({ description: "New version identifier", type: String })
  version?: string;

  @ApiPropertyOptional({ description: "Evaluation metrics", type: Object })
  metrics?: Record<string, number>;
}

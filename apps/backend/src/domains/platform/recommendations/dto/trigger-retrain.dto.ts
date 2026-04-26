import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsInt, Min, Max, IsString } from "class-validator";
import { Type } from "class-transformer";

/**
 * DTO for triggering SASRec model retrain
 */
export class TriggerSasrecRetrainDto {
  @ApiPropertyOptional({
    description: "Number of training epochs (default: 10)",
    default: 10,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  epochs?: number = 10;

  @ApiPropertyOptional({
    description: "Learning rate (default: 0.001)",
    default: 0.001,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  learningRate?: number = 0.001;
}

/**
 * DTO for triggering FashionSigLIP fine-tune
 */
export class TriggerSiglipFinetuneDto {
  @ApiPropertyOptional({
    description: "Minimum number of new samples to trigger fine-tune (default: 500)",
    default: 500,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  threshold?: number = 500;

  @ApiPropertyOptional({
    description: "Fine-tune epochs (default: 5)",
    default: 5,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  epochs?: number = 5;
}

/**
 * DTO for retraining status query
 */
export class RetrainingStatusQueryDto {
  @ApiPropertyOptional({
    description: "Filter by model type: 'sasrec' or 'fashionsiglip'",
    example: "sasrec",
  })
  @IsOptional()
  @IsString()
  modelType?: string;
}

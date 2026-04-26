import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * DTO for single pair compatibility prediction request.
 */
export class CoordinationPredictDto {
  @ApiProperty({
    description: "Category name for item A (e.g. 't_shirt', 'blazer')",
    example: "t_shirt",
  })
  @IsString()
  itemACategory!: string;

  @ApiProperty({
    description: "Category name for item B (e.g. 'jeans', 'trousers')",
    example: "jeans",
  })
  @IsString()
  itemBCategory!: string;

  @ApiPropertyOptional({
    description: "16-dimensional auxiliary features for item A",
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  itemAAux?: number[];

  @ApiPropertyOptional({
    description: "16-dimensional auxiliary features for item B",
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  itemBAux?: number[];
}

/**
 * DTO for training request.
 */
export class CoordinationTrainDto {
  @ApiPropertyOptional({
    description: "Maximum number of training epochs",
    default: 50,
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  epochs?: number;

  @ApiPropertyOptional({
    description: "Learning rate for Adam optimizer",
    default: 0.001,
    minimum: 0.0001,
    maximum: 0.1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  @Max(0.1)
  learningRate?: number;

  @ApiPropertyOptional({
    description: "Training batch size",
    default: 64,
    minimum: 8,
    maximum: 512,
  })
  @IsOptional()
  @IsNumber()
  @Min(8)
  @Max(512)
  batchSize?: number;
}

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsNumber, Min, Max } from "class-validator";

export class RecommendOutfitDto {
  @ApiProperty({ description: "基础商品ID", format: "uuid" })
  @IsString()
  baseItemId!: string;

  @ApiPropertyOptional({ description: "用户体型（如：slim、average、athletic）" })
  @IsOptional()
  @IsString()
  userBodyType?: string;

  @ApiPropertyOptional({ description: "场合（如：daily、work、party）" })
  @IsOptional()
  @IsString()
  occasion?: string;

  @ApiPropertyOptional({ description: "返回数量，默认5", example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  topK?: number;
}

export class BatchEnrichDto {
  @ApiPropertyOptional({ description: "处理数量限制，默认100", example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;
}

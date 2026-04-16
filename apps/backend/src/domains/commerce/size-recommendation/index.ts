/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsIn, IsArray, IsOptional } from "class-validator";

export class SizeRecommendationResponse {
  @ApiProperty({ description: "推荐尺码" })
  recommendedSize!: string;

  @ApiProperty({ description: "置信度", enum: ["high", "medium", "low"] })
  @IsIn(["high", "medium", "low"])
  confidence!: "high" | "medium" | "low";

  @ApiProperty({ description: "推荐理由", type: [String] })
  @IsArray()
  @IsString({ each: true })
  reasons!: string[];
}

export class SizeChartDto {
  @ApiProperty({
    description: "尺码表",
    type: "array",
  })
  sizes!: Array<{
    size: string;
    chest: string;
    waist: string;
    hips: string;
    height: string;
  }>;
}

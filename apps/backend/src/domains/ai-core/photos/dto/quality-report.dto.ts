/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional, IsString, IsArray, Min, Max } from "class-validator";

export class CompositionDto {
  @ApiProperty({ description: "是否检测到人像" })
  @IsBoolean()
  hasPerson!: boolean;

  @ApiProperty({ description: "人像是否居中" })
  @IsBoolean()
  personCentered!: boolean;

  @ApiProperty({ description: "是否为全身照" })
  @IsBoolean()
  fullBody!: boolean;
}

export class QualityReportDto {
  @ApiProperty({ description: "清晰度分数 (0-100)", minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0) @Max(100)
  sharpness!: number;

  @ApiProperty({ description: "亮度分数 (0-100)", minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0) @Max(100)
  brightness!: number;

  @ApiProperty({ description: "对比度分数 (0-100)", minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0) @Max(100)
  contrast!: number;

  @ApiProperty({ description: "构图分析", type: CompositionDto })
  composition!: CompositionDto;

  @ApiProperty({ description: "综合评分 (0-100)", minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0) @Max(100)
  overallScore!: number;

  @ApiProperty({ description: "是否通过质量检测" })
  @IsBoolean()
  passed!: boolean;

  @ApiProperty({ description: "改善建议", type: [String] })
  @IsArray()
  @IsString({ each: true })
  suggestions!: string[];
}

export class QualityCheckResponseDto {
  @ApiProperty({ description: "质量报告", type: QualityReportDto })
  report!: QualityReportDto;

  @ApiProperty({ description: "检测耗时(ms)" })
  @IsNumber()
  processingTime!: number;
}

export class EnhanceRequestDto {
  @ApiPropertyOptional({ description: "需要增强的问题列表", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  issues?: string[];
}

export class EnhanceResponseDto {
  @ApiProperty({ description: "增强后的图片 (base64)" })
  @IsString()
  enhancedImage!: string;

  @ApiProperty({ description: "增强后质量报告", type: QualityReportDto })
  enhancedReport!: QualityReportDto;

  @ApiProperty({ description: "增强耗时(ms)" })
  @IsNumber()
  processingTime!: number;
}

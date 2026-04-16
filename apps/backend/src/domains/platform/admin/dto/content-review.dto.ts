/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  IsNumber,
  Min,
  Max,
} from "class-validator";

export class ReviewQueueQueryDto {
  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页数量", default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: "内容类型", enum: ["post", "comment"] })
  @IsOptional()
  @IsEnum(["post", "comment"])
  contentType?: string;

  @ApiPropertyOptional({ description: "优先级", enum: ["high", "medium", "low"] })
  @IsOptional()
  @IsEnum(["high", "medium", "low"])
  priority?: string;

  @ApiPropertyOptional({ description: "开始日期" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "结束日期" })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ReviewActionDto {
  @ApiProperty({ description: "审核动作", enum: ["approve", "reject", "delete"] })
  @IsEnum(["approve", "reject", "delete"])
  action!: "approve" | "reject" | "delete";

  @ApiPropertyOptional({ description: "审核备注" })
  @IsOptional()
  @IsString()
  note?: string;
}

export class BatchReviewDto {
  @ApiProperty({ description: "内容ID列表" })
  @IsArray()
  @IsString({ each: true })
  ids!: string[];

  @ApiProperty({ description: "审核动作", enum: ["approve", "reject", "delete"] })
  @IsEnum(["approve", "reject", "delete"])
  action!: "approve" | "reject" | "delete";

  @ApiPropertyOptional({ description: "审核备注" })
  @IsOptional()
  @IsString()
  note?: string;
}

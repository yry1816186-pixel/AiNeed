import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
} from "class-validator";

/**
 * 编辑某日穿搭方案 DTO — CAL-05
 */
export class EditDayPlanDto {
  @ApiProperty({ description: "替换的穿搭方案 ID", example: "uuid-of-outfit" })
  @IsString({ message: "穿搭方案 ID 必须是字符串" })
  @IsUUID("4", { message: "穿搭方案 ID 必须是有效的 UUID v4" })
  outfitId!: string;
}

/**
 * 触发 AI 自动生成周计划请求 DTO — CAL-03
 */
export class GenerateWeeklyPlanDto {
  @ApiPropertyOptional({ description: "用户纬度，用于获取天气", example: 39.9042 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "纬度必须是数字" })
  @Min(-90, { message: "纬度范围为 -90 到 90" })
  @Max(90, { message: "纬度范围为 -90 到 90" })
  latitude?: number;

  @ApiPropertyOptional({ description: "用户经度，用于获取天气", example: 116.4074 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "经度必须是数字" })
  @Min(-180, { message: "经度范围为 -180 到 180" })
  @Max(180, { message: "经度范围为 -180 到 180" })
  longitude?: number;
}

/**
 * 单日计划响应
 */
export class DayPlanResponseDto {
  @ApiProperty({ description: "计划 ID" })
  id!: string;

  @ApiProperty({ description: "计划日期 (YYYY-MM-DD)" })
  plannedDate!: string;

  @ApiProperty({ description: "关联穿搭方案 ID", nullable: true })
  outfitId!: string | null;

  @ApiProperty({ description: "天气上下文", nullable: true })
  weatherContext!: Record<string, unknown> | null;

  @ApiProperty({ description: "场景标签", nullable: true })
  sceneTag!: string | null;

  @ApiProperty({ description: "是否特殊事件" })
  isSpecialEvent!: boolean;

  @ApiProperty({ description: "事件名称", nullable: true })
  eventName!: string | null;

  @ApiProperty({ description: "来源: ai_generated | manual" })
  source!: string;

  @ApiProperty({ description: "穿搭方案详情", nullable: true })
  outfit!: {
    id: string;
    name: string | null;
    coverImage: string | null;
    occasions: string[];
    seasons: string[];
    style: string | null;
    rating: number | null;
  } | null;

  @ApiProperty({ description: "是否重复穿搭警告" })
  repeatWarning!: boolean;
}

/**
 * 周计划响应 DTO — CAL-03
 */
export class WeeklyPlanResponseDto {
  @ApiProperty({ description: "周起始日期 (YYYY-MM-DD)" })
  weekStart!: string;

  @ApiProperty({ description: "周结束日期 (YYYY-MM-DD)" })
  weekEnd!: string;

  @ApiProperty({ description: "每日计划列表", type: [DayPlanResponseDto] })
  plans!: DayPlanResponseDto[];
}

/**
 * 重复穿搭检查响应 DTO — D-11
 */
export class RepeatCheckResponseDto {
  @ApiProperty({ description: "是否检测到重复穿搭" })
  isRepeat!: boolean;

  @ApiProperty({ description: "重复的穿搭方案 ID 列表" })
  repeatingPlanIds!: string[];

  @ApiProperty({ description: "重复度百分比 (0-100)", nullable: true })
  overlapPercentage!: number | null;

  @ApiProperty({ description: "重复的服装项名称", type: [String] })
  overlappingItems!: string[];
}

import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsInt, Min, Max, IsString, IsDateString } from "class-validator";

/**
 * 穿搭日记查询参数 DTO
 */
export class DiaryQueryDto {
  @ApiPropertyOptional({
    description: "开始日期 (ISO 8601)",
    example: "2026-04-11",
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: "结束日期 (ISO 8601)",
    example: "2026-04-18",
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: "返回数量，默认20",
    default: 20,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * 周报查询参数 DTO
 */
export class WeeklyReportQueryDto {
  @ApiPropertyOptional({
    description: "返回数量，默认4",
    default: 4,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(52)
  limit?: number = 4;
}

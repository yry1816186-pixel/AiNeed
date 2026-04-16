/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsDateString, IsObject } from "class-validator";

export class ScanStatisticsQueryDto {
  @ApiPropertyOptional({ description: "开始日期" })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: "结束日期" })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class ProductDataUpdateDto {
  @ApiPropertyOptional({ description: "尺码表 (JSON)" })
  @IsOptional()
  @IsObject()
  sizeChart?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "材质说明" })
  @IsString()
  @IsOptional()
  materialNotes?: string;

  @ApiPropertyOptional({ description: "搭配建议" })
  @IsString()
  @IsOptional()
  stylingTips?: string;
}

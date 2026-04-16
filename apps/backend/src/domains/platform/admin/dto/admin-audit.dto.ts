/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsDateString,
} from "class-validator";

export class AuditLogQueryDto {
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

  @ApiPropertyOptional({ description: "操作用户ID" })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: "操作类型", example: "user.ban" })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: "资源类型", example: "user" })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({ description: "开始日期" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "结束日期" })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

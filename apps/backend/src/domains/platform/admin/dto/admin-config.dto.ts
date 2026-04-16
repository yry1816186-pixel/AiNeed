/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsNumber, Min, Max } from "class-validator";

export class SystemConfigDto {
  @ApiProperty({ description: "配置键" })
  @IsString()
  key!: string;

  @ApiProperty({ description: "配置值 (JSON)" })
  value!: Record<string, unknown>;

  @ApiPropertyOptional({ description: "配置说明" })
  @IsOptional()
  @IsString()
  description?: string;
}

export class SystemConfigQueryDto {
  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页数量", default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  pageSize?: number = 50;

  @ApiPropertyOptional({ description: "搜索关键词" })
  @IsOptional()
  @IsString()
  search?: string;
}

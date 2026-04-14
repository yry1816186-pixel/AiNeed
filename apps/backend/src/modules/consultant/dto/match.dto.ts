import { IsString, IsOptional, IsEnum, IsNumber, Min, IsBoolean, IsArray } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { ServiceTypeDto } from "./consultant.dto";

export class ConsultantMatchRequestDto {
  @ApiProperty({ description: "服务类型", enum: ServiceTypeDto })
  @IsEnum(ServiceTypeDto)
  serviceType!: ServiceTypeDto;

  @ApiPropertyOptional({ description: "预算范围下限", example: 200 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMin?: number;

  @ApiPropertyOptional({ description: "预算范围上限", example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMax?: number;

  @ApiPropertyOptional({ description: "特殊要求", example: "希望擅长职场穿搭的顾问" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "是否考虑线上服务", example: true })
  @IsOptional()
  @IsBoolean()
  preferOnline?: boolean = true;
}

export class MatchResultDto {
  @ApiProperty({ description: "顾问ID" })
  consultantId!: string;

  @ApiProperty({ description: "工作室名称" })
  studioName!: string;

  @ApiPropertyOptional({ description: "头像URL", nullable: true })
  avatar!: string | null;

  @ApiProperty({ description: "专长领域", type: [String] })
  specialties!: string[];

  @ApiProperty({ description: "评分" })
  rating!: number;

  @ApiProperty({ description: "评价数量" })
  reviewCount!: number;

  @ApiProperty({ description: "匹配百分比" })
  matchPercentage!: number;

  @ApiProperty({ description: "匹配理由", type: [String] })
  matchReasons!: string[];

  @ApiPropertyOptional({ description: "价格" })
  price?: number;
}

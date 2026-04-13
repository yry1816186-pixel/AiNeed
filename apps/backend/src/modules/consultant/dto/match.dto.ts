import { IsString, IsOptional, IsEnum, IsNumber, Min, IsBoolean } from "class-validator";
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
  consultantId!: string;
  studioName!: string;
  avatar!: string | null;
  specialties!: string[];
  rating!: number;
  reviewCount!: number;
  matchPercentage!: number;
  matchReasons!: string[];
  price?: number;
}

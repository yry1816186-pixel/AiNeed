import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateAvailabilityDto {
  @ApiProperty({ description: "星期几 (0=周日, 1=周一, ..., 6=周六)", example: 1 })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ description: "开始时间 (HH:mm)", example: "09:00" })
  @IsString()
  startTime!: string;

  @ApiProperty({ description: "结束时间 (HH:mm)", example: "18:00" })
  @IsString()
  endTime!: string;

  @ApiPropertyOptional({ description: "时段时长(分钟)", example: 60 })
  @IsOptional()
  @IsInt()
  @Min(15)
  slotDuration?: number = 60;

  @ApiPropertyOptional({ description: "是否可用", example: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean = true;
}

export class BatchCreateAvailabilityDto {
  @ApiProperty({ description: "时段模板列表" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilityDto)
  items!: CreateAvailabilityDto[];
}

export class AvailabilityQueryDto {
  @ApiPropertyOptional({ description: "顾问ID", example: "consultant-001" })
  @IsOptional()
  @IsString()
  consultantId?: string;

  @ApiPropertyOptional({ description: "星期几筛选", example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;
}

export class AvailableSlotsQueryDto {
  @ApiProperty({ description: "顾问ID" })
  @IsString()
  consultantId!: string;

  @ApiProperty({ description: "日期 (YYYY-MM-DD)", example: "2026-04-20" })
  @IsString()
  date!: string;
}

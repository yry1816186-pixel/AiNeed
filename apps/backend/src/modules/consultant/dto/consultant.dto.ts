import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsNumber,
  Min,
  Max,
  MinLength,
  IsArray,
  ValidateNested,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// ==================== 枚举 ====================

export enum ConsultantStatusDto {
  PENDING = "pending",
  ACTIVE = "active",
  SUSPENDED = "suspended",
  INACTIVE = "inactive",
}

export enum ServiceTypeDto {
  STYLING_CONSULTATION = "styling_consultation",
  WARDROBE_AUDIT = "wardrobe_audit",
  SHOPPING_COMPANION = "shopping_companion",
  COLOR_ANALYSIS = "color_analysis",
  SPECIAL_EVENT = "special_event",
}

export enum BookingStatusDto {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  NO_SHOW = "no_show",
}

// ==================== 顾问档案 DTO ====================

export class CreateConsultantProfileDto {
  @ApiProperty({ description: "工作室名称", example: "风尚造型工作室" })
  @IsString()
  @MinLength(1)
  studioName!: string;

  @ApiProperty({ description: "专长领域列表", example: ["色彩搭配", "日常穿搭", "职场形象"] })
  @IsArray()
  @IsString({ each: true })
  specialties!: string[];

  @ApiProperty({ description: "从业年限", example: 5 })
  @IsInt()
  @Min(0)
  yearsOfExperience!: number;

  @ApiProperty({ description: "资质认证列表", example: [{ name: "高级形象设计师", issuer: "中国形象设计协会" }] })
  @IsArray()
  certifications!: Record<string, unknown>[];

  @ApiPropertyOptional({ description: "案例作品列表", example: [{ title: "春季穿搭指南", images: [] }] })
  @IsOptional()
  @IsArray()
  portfolioCases?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: "个人简介", example: "10年时尚行业经验，专注职场形象设计" })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: "头像URL", example: "https://example.com/avatar.jpg" })
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class UpdateConsultantProfileDto {
  @ApiPropertyOptional({ description: "工作室名称", example: "风尚造型工作室" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  studioName?: string;

  @ApiPropertyOptional({ description: "专长领域列表", example: ["色彩搭配", "日常穿搭"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @ApiPropertyOptional({ description: "从业年限", example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @ApiPropertyOptional({ description: "资质认证列表", example: [{ name: "高级形象设计师" }] })
  @IsOptional()
  @IsArray()
  certifications?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: "案例作品列表", example: [{ title: "春季穿搭指南" }] })
  @IsOptional()
  @IsArray()
  portfolioCases?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: "个人简介", example: "10年时尚行业经验" })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: "头像URL", example: "https://example.com/avatar.jpg" })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ description: "顾问状态", example: "active", enum: ConsultantStatusDto })
  @IsOptional()
  @IsEnum(ConsultantStatusDto)
  status?: ConsultantStatusDto;
}

export class ConsultantQueryDto {
  @ApiPropertyOptional({ description: "页码", example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页数量", example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: "顾问状态筛选", example: "active", enum: ConsultantStatusDto })
  @IsOptional()
  @IsEnum(ConsultantStatusDto)
  status?: ConsultantStatusDto;

  @ApiPropertyOptional({ description: "专长领域筛选", example: "色彩搭配" })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional({ description: "排序字段", example: "rating" })
  @IsOptional()
  @IsString()
  sortBy?: string = "rating";
}

// ==================== 服务预约 DTO ====================

export class CreateServiceBookingDto {
  @ApiProperty({ description: "顾问ID", example: "consultant-001" })
  @IsString()
  consultantId!: string;

  @ApiProperty({ description: "服务类型", example: "styling_consultation", enum: ServiceTypeDto })
  @IsEnum(ServiceTypeDto)
  serviceType!: ServiceTypeDto;

  @ApiProperty({ description: "预约时间（ISO 8601）", example: "2026-04-20T14:00:00.000Z" })
  @IsDateString()
  scheduledAt!: string;

  @ApiPropertyOptional({ description: "服务时长（分钟）", example: 60 })
  @IsOptional()
  @IsInt()
  @Min(15)
  durationMinutes?: number = 60;

  @ApiPropertyOptional({ description: "备注", example: "希望了解职场穿搭建议" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: "价格（元）", example: 299.00 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ description: "货币单位", example: "CNY" })
  @IsOptional()
  @IsString()
  currency?: string = "CNY";
}

export class UpdateServiceBookingDto {
  @ApiPropertyOptional({ description: "预约状态", example: "confirmed", enum: BookingStatusDto })
  @IsOptional()
  @IsEnum(BookingStatusDto)
  status?: BookingStatusDto;

  @ApiPropertyOptional({ description: "取消原因", example: "时间冲突" })
  @IsOptional()
  @IsString()
  cancelReason?: string;

  @ApiPropertyOptional({ description: "预约时间（ISO 8601）", example: "2026-04-20T14:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: "服务时长（分钟）", example: 90 })
  @IsOptional()
  @IsInt()
  @Min(15)
  durationMinutes?: number;
}

export class BookingQueryDto {
  @ApiPropertyOptional({ description: "页码", example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页数量", example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: "预约状态筛选", example: "confirmed", enum: BookingStatusDto })
  @IsOptional()
  @IsEnum(BookingStatusDto)
  status?: BookingStatusDto;

  @ApiPropertyOptional({ description: "服务类型筛选", example: "styling_consultation", enum: ServiceTypeDto })
  @IsOptional()
  @IsEnum(ServiceTypeDto)
  serviceType?: ServiceTypeDto;

  @ApiPropertyOptional({ description: "顾问ID筛选", example: "consultant-001" })
  @IsOptional()
  @IsString()
  consultantId?: string;
}

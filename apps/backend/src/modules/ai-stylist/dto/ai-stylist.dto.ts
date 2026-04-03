import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PhotoType } from "@prisma/client";
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * 创建 AI 造型师会话 DTO
 */
export class CreateStylistSessionDto {
  @ApiPropertyOptional({ 
    example: "interview",
    description: "入口场景，如：interview(面试)、date(约会)、party(派对)、daily(日常)",
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: "入口场景必须是字符串" })
  @MaxLength(50, { message: "入口场景长度不能超过50个字符" })
  entry?: string;

  @ApiPropertyOptional({ 
    example: "准备面试穿搭",
    description: "用户目标，描述用户想要达成的造型目标",
    maxLength: 200
  })
  @IsOptional()
  @IsString({ message: "目标必须是字符串" })
  @MaxLength(200, { message: "目标长度不能超过200个字符" })
  goal?: string;

  @ApiPropertyOptional({ 
    description: "上下文信息，包含用户的偏好、体型、场合等额外信息",
    example: {
      bodyType: "slim",
      preferredStyle: "business",
      budget: "medium",
      season: "spring"
    }
  })
  @IsOptional()
  @IsObject({ message: "上下文必须是一个对象" })
  context?: Record<string, unknown>;
}

/**
 * 发送 AI 造型师消息 DTO
 */
export class SendStylistMessageDto {
  @ApiProperty({ 
    example: "我下周有一个重要的面试，需要一套正式的穿搭建议",
    description: "用户发送给 AI 造型师的消息内容",
    minLength: 1,
    maxLength: 2000
  })
  @IsString({ message: "消息内容必须是字符串" })
  @MinLength(1, { message: "消息内容不能为空" })
  @MaxLength(2000, { message: "消息长度不能超过2000个字符" })
  message!: string;

  @ApiPropertyOptional({ 
    description: "附加的照片 ID 列表",
    type: [String],
    example: ["uuid-1", "uuid-2"]
  })
  @IsOptional()
  @IsArray({ message: "照片 ID 列表必须是数组" })
  @IsUUID("4", { each: true, message: "每个照片 ID 必须是有效的 UUID" })
  photoIds?: string[];
}

/**
 * 上传 AI 造型师照片 DTO
 */
export class UploadStylistPhotoDto {
  @ApiPropertyOptional({ 
    enum: PhotoType,
    description: "照片类型：full_body-全身照、half_body-半身照、face-面部照、outfit-穿搭照",
    example: PhotoType.full_body
  })
  @IsOptional()
  @IsEnum(PhotoType, { message: "照片类型必须是有效的 PhotoType 枚举值" })
  type?: PhotoType;

  @ApiPropertyOptional({ 
    example: "我的日常穿搭照片",
    description: "照片描述",
    maxLength: 200
  })
  @IsOptional()
  @IsString({ message: "描述必须是字符串" })
  @MaxLength(200, { message: "描述长度不能超过200个字符" })
  description?: string;
}

/**
 * 附加照片到会话 DTO
 */
export class AttachStylistPhotoDto {
  @ApiProperty({ 
    description: "要附加的照片 ID",
    example: "123e4567-e89b-12d3-a456-426614174000"
  })
  @IsUUID("4", { message: "照片 ID 必须是有效的 UUID v4" })
  @MaxLength(191, { message: "照片 ID 长度不能超过191个字符" })
  photoId!: string;
}

/**
 * 会话查询参数 DTO
 */
export class GetSessionsQueryDto {
  @ApiPropertyOptional({ 
    description: "页码，从 1 开始",
    example: 1,
    minimum: 1,
    default: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "页码必须是数字" })
  @Min(1, { message: "页码最小为 1" })
  page?: number = 1;

  @ApiPropertyOptional({ 
    description: "每页数量",
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "每页数量必须是数字" })
  @Min(1, { message: "每页数量最小为 1" })
  @Max(100, { message: "每页数量最大为 100" })
  limit?: number = 20;

  @ApiPropertyOptional({ 
    description: "是否只返回活跃会话",
    example: true,
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;
}

/**
 * 会话评分 DTO
 */
export class RateSessionDto {
  @ApiProperty({ 
    description: "会话评分，1-5 星",
    example: 5,
    minimum: 1,
    maximum: 5
  })
  @IsNumber({}, { message: "评分必须是数字" })
  @Min(1, { message: "评分最小为 1" })
  @Max(5, { message: "评分最大为 5" })
  rating!: number;

  @ApiPropertyOptional({ 
    description: "评分反馈",
    example: "非常有用的建议！",
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: "反馈必须是字符串" })
  @MaxLength(500, { message: "反馈长度不能超过500个字符" })
  feedback?: string;
}

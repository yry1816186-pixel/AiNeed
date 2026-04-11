import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TryOnStatus } from "@prisma/client";
import { IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from "class-validator";

/**
 * 创建虚拟试衣请求 DTO
 */
export class CreateTryOnDto {
  @ApiProperty({
    description: "用户照片ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @IsUUID()
  @IsNotEmpty()
  photoId!: string;

  @ApiProperty({
    description: "服装项ID",
    example: "123e4567-e89b-12d3-a456-426614174001",
    format: "uuid",
  })
  @IsUUID()
  @IsNotEmpty()
  itemId!: string;
}

/**
 * 试衣记录响应 DTO
 */
export class TryOnResponseDto {
  @ApiProperty({ description: "试衣记录ID" })
  id!: string;

  @ApiProperty({ description: "用户ID" })
  userId!: string;

  @ApiProperty({ description: "照片ID" })
  photoId!: string;

  @ApiProperty({ description: "服装项ID" })
  itemId!: string;

  @ApiProperty({
    description: "试衣状态",
    enum: TryOnStatus,
    example: TryOnStatus.pending,
  })
  status!: TryOnStatus;

  @ApiPropertyOptional({ description: "结果图片URL" })
  resultImageUrl?: string;

  @ApiProperty({ description: "创建时间" })
  createdAt!: Date;

  @ApiProperty({ description: "更新时间" })
  updatedAt!: Date;
}

/**
 * 试衣历史查询参数 DTO
 */
export class GetTryOnHistoryQueryDto {
  @ApiPropertyOptional({
    description: "页码，默认1",
    default: 1,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "每页数量，默认20",
    default: 20,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: "按状态筛选",
    enum: TryOnStatus,
  })
  @IsOptional()
  status?: TryOnStatus;
}

/**
 * 试衣历史响应 DTO
 */
export class TryOnHistoryResponseDto {
  @ApiProperty({ type: [TryOnResponseDto], description: "试衣记录列表" })
  items!: TryOnResponseDto[];

  @ApiProperty({ description: "总数" })
  total!: number;

  @ApiProperty({ description: "当前页码" })
  page!: number;

  @ApiProperty({ description: "每页数量" })
  limit!: number;
}

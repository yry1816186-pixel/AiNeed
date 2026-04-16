/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AnalysisStatus, PhotoType } from "@prisma/client";

export class PhotoUploadResultDto {
  @ApiProperty({ description: "照片 ID", format: "uuid" })
  id!: string;

  @ApiProperty({ description: "照片 URL" })
  url!: string;

  @ApiPropertyOptional({ description: "缩略图 URL" })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: "缩略图 Data URI" })
  thumbnailDataUri?: string;

  @ApiProperty({ description: "照片类型", enum: PhotoType })
  type!: PhotoType;

  @ApiProperty({ description: "分析状态", enum: AnalysisStatus })
  status!: AnalysisStatus;
}

export class PhotoResponseDto {
  @ApiProperty({ description: "照片 ID", format: "uuid" })
  id!: string;

  @ApiProperty({ description: "用户 ID", format: "uuid" })
  userId!: string;

  @ApiProperty({ description: "照片类型", enum: PhotoType })
  type!: PhotoType;

  @ApiProperty({ description: "照片 URL" })
  url!: string;

  @ApiPropertyOptional({ description: "缩略图 URL" })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: "缩略图 Data URI" })
  thumbnailDataUri?: string;

  @ApiPropertyOptional({ description: "原始文件名" })
  originalName?: string;

  @ApiPropertyOptional({ description: "MIME 类型" })
  mimeType?: string;

  @ApiPropertyOptional({ description: "文件大小（字节）" })
  size?: number;

  @ApiPropertyOptional({ description: "AI 分析结果" })
  analysisResult?: Record<string, unknown>;

  @ApiProperty({ description: "分析状态", enum: AnalysisStatus })
  analysisStatus!: AnalysisStatus;

  @ApiPropertyOptional({ description: "分析完成时间" })
  analyzedAt?: Date;

  @ApiProperty({ description: "创建时间" })
  createdAt!: Date;
}

export class SuccessResponseDto {
  @ApiProperty({ description: "操作是否成功", example: true })
  success!: boolean;
}

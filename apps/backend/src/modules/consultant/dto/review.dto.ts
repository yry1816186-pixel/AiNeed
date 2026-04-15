import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
  IsBoolean,
} from "class-validator";

export const REVIEW_TAGS = [
  "专业",
  "耐心",
  "有创意",
  "准时",
  "沟通顺畅",
  "审美在线",
  "性价比高",
  "建议实用",
  "态度友好",
  "服务周到",
] as const;

export class CreateReviewDto {
  @ApiProperty({ description: "预约ID" })
  @IsString()
  bookingId!: string;

  @ApiProperty({ description: "评分 (1-5)", example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ description: "评价内容", example: "非常专业的造型建议" })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: "评价标签", example: ["专业", "审美在线"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: "服务前照片URL列表" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  beforeImages?: string[];

  @ApiPropertyOptional({ description: "服务后照片URL列表" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  afterImages?: string[];

  @ApiPropertyOptional({ description: "是否匿名", example: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}

export class ReviewQueryDto {
  @ApiPropertyOptional({ description: "顾问ID" })
  @IsOptional()
  @IsString()
  consultantId?: string;

  @ApiPropertyOptional({ description: "页码" })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页数量" })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: "排序方式", example: "latest" })
  @IsOptional()
  @IsString()
  sortBy?: "latest" | "highest" | "lowest" = "latest";
}

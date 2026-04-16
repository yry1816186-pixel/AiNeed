import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

import { CursorPaginationDto } from "../../../../common/dto/pagination.dto";

export class CreateBloggerProductDto {
  @ApiProperty({ description: "商品类型", example: "digital_scheme" })
  @IsString()
  type!: string;

  @ApiProperty({ description: "商品标题", example: "春季通勤穿搭方案" })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: "商品描述" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "价格", example: 29.9 })
  @IsNumber()
  @Min(0.01)
  @Max(99999)
  price!: number;

  @ApiProperty({ description: "图片列表", example: ["https://example.com/img1.jpg"] })
  @IsArray()
  @IsString({ each: true })
  images!: string[];

  @ApiPropertyOptional({ description: "关联服装ID" })
  @IsOptional()
  @IsString()
  relatedItemId?: string;
}

export class UpdateBloggerProductDto {
  @ApiPropertyOptional({ description: "商品标题" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "商品描述" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "价格" })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(99999)
  price?: number;

  @ApiPropertyOptional({ description: "图片列表" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: "状态" })
  @IsOptional()
  @IsString()
  status?: string;
}

export class BloggerProductQueryDto extends CursorPaginationDto {
  @ApiPropertyOptional({ description: "博主ID" })
  @IsOptional()
  @IsString()
  bloggerId?: string;

  @ApiPropertyOptional({ description: "商品类型" })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: "状态" })
  @IsOptional()
  @IsString()
  status?: string;
}

export class DashboardQueryDto {
  @ApiProperty({ description: "统计周期", example: "7d", enum: ["7d", "30d"] })
  @IsString()
  period!: "7d" | "30d";
}

export class PurchaseBloggerProductDto {
  @ApiProperty({ description: "商品ID" })
  @IsString()
  productId!: string;

  @ApiPropertyOptional({ description: "支付方式" })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

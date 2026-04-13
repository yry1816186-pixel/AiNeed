import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsBoolean,
  IsIn,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsUrl,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const ClothingCategoryValues = [
  "tops",
  "bottoms",
  "dresses",
  "outerwear",
  "footwear",
  "accessories",
  "activewear",
  "swimwear",
] as const;
type ClothingCategory = (typeof ClothingCategoryValues)[number];

export type ProductCategory = ClothingCategory;
export const ProductCategory = ClothingCategoryValues;

export enum ProductStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export class CreateProductDto {
  @ApiProperty({ description: "商品名称", example: "经典白色T恤" })
  @IsString()
  @MinLength(2, { message: "商品名称至少需要2个字符" })
  @MaxLength(200, { message: "商品名称不能超过200个字符" })
  name!: string;

  @ApiPropertyOptional({ description: "商品描述", example: "100%纯棉经典白色T恤" })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: "商品描述不能超过2000个字符" })
  description?: string;

  @ApiProperty({ description: "商品类别", example: "tops", enum: ClothingCategoryValues })
  @IsIn(ClothingCategoryValues, { message: "请选择有效的商品类别" })
  category!: ProductCategory;

  @ApiProperty({ description: "颜色列表", example: ["白色", "黑色"] })
  @IsArray()
  @IsString({ each: true, message: "颜色必须是字符串数组" })
  @MaxLength(20, { message: "最多支持20种颜色" })
  colors!: string[];

  @ApiProperty({ description: "尺码列表", example: ["S", "M", "L", "XL"] })
  @IsArray()
  @IsString({ each: true, message: "尺码必须是字符串数组" })
  @MaxLength(20, { message: "最多支持20种尺码" })
  sizes!: string[];

  @ApiProperty({ description: "价格（元）", example: 199.00 })
  @IsNumber({}, { message: "价格必须是数字" })
  @Min(0, { message: "价格不能为负数" })
  @Max(9999999, { message: "价格超出范围" })
  price!: number;

  @ApiPropertyOptional({ description: "原价（元）", example: 299.00 })
  @IsOptional()
  @IsNumber({}, { message: "原价必须是数字" })
  @Min(0, { message: "原价不能为负数" })
  originalPrice?: number;

  @ApiPropertyOptional({ description: "货币单位", example: "CNY" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: "商品图片URL列表", example: ["https://example.com/img1.jpg"] })
  @IsArray()
  @IsUrl({}, { each: true, message: "图片必须是有效的URL" })
  @MaxLength(10, { message: "最多上传10张图片" })
  images!: string[];

  @ApiPropertyOptional({ description: "标签列表", example: ["夏季", "纯棉"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: "库存数量", example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ description: "是否上架", example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ description: "商品名称", example: "经典白色T恤" })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: "商品名称至少需要2个字符" })
  @MaxLength(200, { message: "商品名称不能超过200个字符" })
  name?: string;

  @ApiPropertyOptional({ description: "商品描述", example: "100%纯棉经典白色T恤" })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: "商品描述不能超过2000个字符" })
  description?: string;

  @ApiPropertyOptional({ description: "商品类别", example: "tops", enum: ClothingCategoryValues })
  @IsOptional()
  @IsIn(ClothingCategoryValues, { message: "请选择有效的商品类别" })
  category?: ProductCategory;

  @ApiPropertyOptional({ description: "颜色列表", example: ["白色", "黑色"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: "颜色必须是字符串数组" })
  colors?: string[];

  @ApiPropertyOptional({ description: "尺码列表", example: ["S", "M", "L", "XL"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: "尺码必须是字符串数组" })
  sizes?: string[];

  @ApiPropertyOptional({ description: "价格（元）", example: 199.00 })
  @IsOptional()
  @IsNumber({}, { message: "价格必须是数字" })
  @Min(0, { message: "价格不能为负数" })
  price?: number;

  @ApiPropertyOptional({ description: "原价（元）", example: 299.00 })
  @IsOptional()
  @IsNumber({}, { message: "原价必须是数字" })
  @Min(0, { message: "原价不能为负数" })
  originalPrice?: number;

  @ApiPropertyOptional({ description: "商品图片URL列表", example: ["https://example.com/img1.jpg"] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true, message: "图片必须是有效的URL" })
  images?: string[];

  @ApiPropertyOptional({ description: "标签列表", example: ["夏季", "纯棉"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: "库存数量", example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ description: "是否上架", example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ProductQueryDto {
  @ApiPropertyOptional({ description: "每页数量", example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: "偏移量", example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ description: "商品状态", example: "active", enum: ["draft", "active", "inactive"] })
  @IsOptional()
  @IsIn(["draft", "active", "inactive"])
  status?: ProductStatus;
}

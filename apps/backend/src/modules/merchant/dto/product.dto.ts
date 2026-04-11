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
  @IsString()
  @MinLength(2, { message: "商品名称至少需要2个字符" })
  @MaxLength(200, { message: "商品名称不能超过200个字符" })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: "商品描述不能超过2000个字符" })
  description?: string;

  @IsIn(ClothingCategoryValues, { message: "请选择有效的商品类别" })
  category!: ProductCategory;

  @IsArray()
  @IsString({ each: true, message: "颜色必须是字符串数组" })
  @MaxLength(20, { message: "最多支持20种颜色" })
  colors!: string[];

  @IsArray()
  @IsString({ each: true, message: "尺码必须是字符串数组" })
  @MaxLength(20, { message: "最多支持20种尺码" })
  sizes!: string[];

  @IsNumber({}, { message: "价格必须是数字" })
  @Min(0, { message: "价格不能为负数" })
  @Max(9999999, { message: "价格超出范围" })
  price!: number;

  @IsOptional()
  @IsNumber({}, { message: "原价必须是数字" })
  @Min(0, { message: "原价不能为负数" })
  originalPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsArray()
  @IsUrl({}, { each: true, message: "图片必须是有效的URL" })
  @MaxLength(10, { message: "最多上传10张图片" })
  images!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: "商品名称至少需要2个字符" })
  @MaxLength(200, { message: "商品名称不能超过200个字符" })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: "商品描述不能超过2000个字符" })
  description?: string;

  @IsOptional()
  @IsIn(ClothingCategoryValues, { message: "请选择有效的商品类别" })
  category?: ProductCategory;

  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: "颜色必须是字符串数组" })
  colors?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: "尺码必须是字符串数组" })
  sizes?: string[];

  @IsOptional()
  @IsNumber({}, { message: "价格必须是数字" })
  @Min(0, { message: "价格不能为负数" })
  price?: number;

  @IsOptional()
  @IsNumber({}, { message: "原价必须是数字" })
  @Min(0, { message: "原价不能为负数" })
  originalPrice?: number;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true, message: "图片必须是有效的URL" })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ProductQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsIn(["draft", "active", "inactive"])
  status?: ProductStatus;
}

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested } from "class-validator";

export class GenerateQRCodeDto {
  @ApiProperty({ description: "商品ID" })
  @IsString()
  productId!: string;

  @ApiPropertyOptional({ description: "商品名称" })
  @IsString()
  @IsOptional()
  productName?: string;

  @ApiPropertyOptional({ description: "SKU编码" })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ description: "颜色" })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: "尺码" })
  @IsString()
  @IsOptional()
  size?: string;

  @ApiPropertyOptional({ description: "材质" })
  @IsString()
  @IsOptional()
  material?: string;

  @ApiPropertyOptional({ description: "价格" })
  @IsNumber()
  @IsOptional()
  price?: number;
}

export class BatchGenerateQRCodeDto {
  @ApiProperty({ description: "商品列表", type: [GenerateQRCodeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GenerateQRCodeDto)
  products!: GenerateQRCodeDto[];
}

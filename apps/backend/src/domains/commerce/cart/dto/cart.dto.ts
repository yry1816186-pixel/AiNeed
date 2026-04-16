/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, Min, Max, IsNotEmpty } from "class-validator";

export class AddToCartDto {
  @ApiProperty({ description: "商品ID" })
  @IsString()
  itemId!: string;

  @ApiProperty({ description: "颜色" })
  @IsNotEmpty()
  @IsString()
  color!: string;

  @ApiProperty({ description: "尺码" })
  @IsNotEmpty()
  @IsString()
  size!: string;

  @ApiProperty({ description: "数量", default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(99)
  quantity!: number;
}

export class UpdateCartItemDto {
  @ApiPropertyOptional({ description: "数量" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(99)
  quantity?: number;

  @ApiPropertyOptional({ description: "是否选中" })
  @IsOptional()
  @IsBoolean()
  selected?: boolean;
}

export class SelectAllCartDto {
  @ApiProperty({ description: "是否全选" })
  @IsBoolean()
  selected!: boolean;
}

export class BatchDeleteCartDto {
  @ApiProperty({ description: "购物车项ID列表", type: [String] })
  @IsArray()
  @IsString({ each: true })
  cartItemIds!: string[];
}

export class MoveToFavoritesDto {
  @ApiProperty({ description: "购物车项ID列表", type: [String] })
  @IsArray()
  @IsString({ each: true })
  cartItemIds!: string[];
}

export class UpdateCartSkuDto {
  @ApiPropertyOptional({ description: "颜色" })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: "尺码" })
  @IsOptional()
  @IsString()
  size?: string;
}

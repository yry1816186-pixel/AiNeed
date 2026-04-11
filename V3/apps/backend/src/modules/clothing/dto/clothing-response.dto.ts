import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BrandDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() logoUrl?: string;
  @ApiPropertyOptional() description?: string;
}

class CategoryDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() nameEn?: string;
  @ApiProperty() slug!: string;
  @ApiPropertyOptional() parentId?: string;
  @ApiProperty() sortOrder!: number;
}

export class ClothingItemResponseDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() brandId?: string;
  @ApiPropertyOptional() categoryId?: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() price?: number;
  @ApiPropertyOptional() originalPrice?: number;
  @ApiProperty() currency!: string;
  @ApiPropertyOptional() gender?: string;
  @ApiPropertyOptional() seasons?: string[];
  @ApiPropertyOptional() occasions?: string[];
  @ApiPropertyOptional() styleTags?: string[];
  @ApiPropertyOptional() colors?: string[];
  @ApiPropertyOptional() materials?: string[];
  @ApiPropertyOptional() fitType?: string;
  @ApiPropertyOptional() imageUrls?: string[];
  @ApiPropertyOptional() sourceUrl?: string;
  @ApiPropertyOptional() purchaseUrl?: string;
  @ApiPropertyOptional() sourceName?: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional({ type: BrandDto }) brand?: BrandDto;
  @ApiPropertyOptional({ type: CategoryDto }) category?: CategoryDto;
}

export class CategoryTreeResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() nameEn?: string;
  @ApiProperty() slug!: string;
  @ApiPropertyOptional() parentId?: string;
  @ApiProperty() sortOrder!: number;
  @ApiProperty({ type: [CategoryTreeResponseDto] }) children!: CategoryTreeResponseDto[];
}

export class BrandResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() logoUrl?: string;
  @ApiPropertyOptional() description?: string;
}

export class PaginatedClothingResponseDto {
  @ApiProperty({ type: [ClothingItemResponseDto] }) items!: ClothingItemResponseDto[];
  @ApiProperty() meta!: { total: number; page: number; limit: number; totalPages: number };
}

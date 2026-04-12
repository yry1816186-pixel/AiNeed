import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class DesignElement {
  @ApiProperty() type!: string;
  @ApiPropertyOptional() x!: number;
  @ApiPropertyOptional() y!: number;
  @ApiPropertyOptional() scaleX!: number;
  @ApiPropertyOptional() scaleY!: number;
  @ApiPropertyOptional() rotation!: number;
  @ApiPropertyOptional() width!: number;
  @ApiPropertyOptional() height!: number;
  @ApiPropertyOptional() imageUrl?: string;
  @ApiPropertyOptional() text?: string;
  @ApiPropertyOptional() fontFamily?: string;
  @ApiPropertyOptional() fontSize?: number;
  @ApiPropertyOptional() fontColor?: string;
  @ApiPropertyOptional() opacity?: number;
}

export class DesignResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() designData!: Record<string, unknown>;
  @ApiPropertyOptional() patternImageUrl?: string;
  @ApiPropertyOptional() previewImageUrl?: string;
  @ApiProperty() productType!: string;
  @ApiPropertyOptional() productTemplateId?: string;
  @ApiProperty() isPublic!: boolean;
  @ApiPropertyOptional() price?: number;
  @ApiProperty() likesCount!: number;
  @ApiProperty() purchasesCount!: number;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiProperty() status!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ProductTemplateResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() productType!: string;
  @ApiProperty() material!: string;
  @ApiProperty() baseCost!: number;
  @ApiProperty() suggestedPrice!: number;
  @ApiProperty() uvMapUrl!: string;
  @ApiPropertyOptional() previewModelUrl?: string;
  @ApiProperty({ type: [String] }) availableSizes!: string[];
  @ApiProperty() printArea!: Record<string, unknown>;
  @ApiPropertyOptional() podProvider?: string;
  @ApiPropertyOptional() podProductId?: string;
  @ApiProperty() isActive!: boolean;
}

export class PaginatedDesignResponseDto {
  @ApiProperty({ type: [DesignResponseDto] }) items!: DesignResponseDto[];
  @ApiProperty() meta!: { total: number; page: number; limit: number; totalPages: number };
}

export { DesignElement };

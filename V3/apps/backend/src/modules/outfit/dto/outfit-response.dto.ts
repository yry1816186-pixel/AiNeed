import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OutfitItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() outfitId!: string;
  @ApiProperty() clothingId!: string;
  @ApiPropertyOptional() slot?: string;
  @ApiProperty() sortOrder!: number;
}

export class OutfitResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiPropertyOptional() name?: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() occasion?: string;
  @ApiPropertyOptional() season?: string;
  @ApiProperty() styleTags!: string[];
  @ApiProperty() isPublic!: boolean;
  @ApiProperty() likesCount!: number;
  @ApiProperty() commentsCount!: number;
  @ApiProperty() createdAt!: string;
  @ApiPropertyOptional() items?: OutfitItemResponseDto[];
}

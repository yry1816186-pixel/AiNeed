import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OutfitImageStatus } from './generate-outfit-image.dto';

class OutfitItemResponseDto {
  @ApiProperty() name!: string;
  @ApiProperty() color!: string;
  @ApiProperty() category!: string;
}

export class OutfitImageResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty({ type: () => OutfitItemResponseDto, isArray: true })
  items!: OutfitItemResponseDto[];
  @ApiPropertyOptional() occasion?: string;
  @ApiPropertyOptional() styleTips?: string;
  @ApiPropertyOptional() prompt?: string;
  @ApiPropertyOptional() imageUrl?: string;
  @ApiProperty({ enum: OutfitImageStatus }) status!: string;
  @ApiProperty() cost!: number;
  @ApiPropertyOptional() metadata?: Record<string, unknown>;
  @ApiProperty() createdAt!: string;
}

export class OutfitImageBriefResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: OutfitImageStatus }) status!: string;
  @ApiProperty() createdAt!: string;
}

export class PaginatedOutfitImageResponseDto {
  @ApiProperty({ type: [OutfitImageResponseDto] })
  items!: OutfitImageResponseDto[];
  @ApiProperty()
  meta!: { total: number; page: number; limit: number; totalPages: number };
}

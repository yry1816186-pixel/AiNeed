import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class StudioOwnerDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() nickname?: string;
  @ApiPropertyOptional() avatarUrl?: string;
}

export class StudioResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiPropertyOptional() logoUrl?: string;
  @ApiPropertyOptional() coverImageUrl?: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() city?: string;
  @ApiPropertyOptional() address?: string;
  @ApiPropertyOptional() specialties?: string[];
  @ApiPropertyOptional() serviceTypes?: string[];
  @ApiPropertyOptional() priceRange?: string;
  @ApiPropertyOptional() portfolioImages?: string[];
  @ApiProperty() rating!: number;
  @ApiProperty() reviewCount!: number;
  @ApiProperty() orderCount!: number;
  @ApiProperty() isVerified!: boolean;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional({ type: StudioOwnerDto }) owner?: StudioOwnerDto;
}

export class StudioDetailResponseDto extends StudioResponseDto {
  @ApiPropertyOptional({ type: StudioOwnerDto }) owner!: StudioOwnerDto;
}

export class StudioReviewDto {
  @ApiProperty() id!: string;
  @ApiProperty() orderId!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() studioId!: string;
  @ApiProperty() rating!: number;
  @ApiPropertyOptional() content?: string;
  @ApiPropertyOptional() images?: string[];
  @ApiProperty() isAnonymous!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional() user?: { id: string; nickname: string; avatarUrl?: string };
}

export class PaginatedStudioResponseDto {
  @ApiProperty({ type: [StudioResponseDto] }) items!: StudioResponseDto[];
  @ApiProperty() meta!: { total: number; page: number; limit: number; totalPages: number };
}

export class PaginatedReviewResponseDto {
  @ApiProperty({ type: [StudioReviewDto] }) items!: StudioReviewDto[];
  @ApiProperty() meta!: { total: number; page: number; limit: number; totalPages: number };
}

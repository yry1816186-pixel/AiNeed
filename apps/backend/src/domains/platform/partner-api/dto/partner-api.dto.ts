import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PartnerRecommendationDto {
  @ApiProperty()
  userId!: string;

  @ApiPropertyOptional()
  occasion?: string;

  @ApiPropertyOptional()
  season?: string;

  @ApiPropertyOptional({ default: 20 })
  limit?: number;
}

export class PartnerTryOnDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  photoId!: string;

  @ApiProperty()
  itemId!: string;
}

export class PartnerBodyAnalysisDto {
  @ApiProperty({ description: "Base64-encoded image" })
  imageBase64!: string;
}

export class PartnerColorAnalysisDto {
  @ApiProperty({ description: "Base64-encoded image" })
  imageBase64!: string;
}

export class PartnerWardrobeTaggingDto {
  @ApiProperty()
  query!: string;

  @ApiPropertyOptional()
  category?: string;

  @ApiPropertyOptional({ default: 20 })
  limit?: number;
}

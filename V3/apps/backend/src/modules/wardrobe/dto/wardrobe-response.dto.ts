import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class WardrobeItemResponse {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiPropertyOptional() clothingId!: string | null;
  @ApiPropertyOptional() customName!: string | null;
  @ApiPropertyOptional() imageUrl!: string | null;
  @ApiPropertyOptional() category!: string | null;
  @ApiPropertyOptional() color!: string | null;
  @ApiPropertyOptional() brand!: string | null;
  @ApiPropertyOptional() notes!: string | null;
  @ApiProperty() addedAt!: Date;
}

class WardrobeStats {
  @ApiProperty() total!: number;
  @ApiProperty() byCategory!: Record<string, number>;
  @ApiProperty() byColor!: Record<string, number>;
  @ApiProperty() bySeason!: Record<string, number>;
  @ApiProperty() byStyle!: Record<string, number>;
}

class WardrobeListStats {
  @ApiProperty() byCategory!: Record<string, number>;
  @ApiProperty() byColor!: Record<string, number>;
  @ApiProperty() totalCount!: number;
}

export class WardrobeListResponse {
  @ApiProperty({ type: [WardrobeItemResponse] }) items!: WardrobeItemResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() stats!: WardrobeListStats;
}

export class WardrobeStatsResponse {
  @ApiProperty() total!: number;
  @ApiProperty() byCategory!: Record<string, number>;
  @ApiProperty() byColor!: Record<string, number>;
  @ApiProperty() bySeason!: Record<string, number>;
  @ApiProperty() byStyle!: Record<string, number>;
}

export { WardrobeItemResponse, WardrobeStats, WardrobeListStats };

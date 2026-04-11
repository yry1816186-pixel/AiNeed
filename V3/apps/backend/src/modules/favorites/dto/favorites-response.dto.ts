import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FavoriteItemDto {
  @ApiProperty({ description: '收藏记录ID' })
  id!: string;

  @ApiProperty({ description: '目标类型', example: 'clothing' })
  targetType!: string;

  @ApiProperty({ description: '目标ID' })
  targetId!: string;

  @ApiPropertyOptional({ description: '关联目标对象' })
  target?: Record<string, unknown>;

  @ApiProperty({ description: '收藏时间' })
  createdAt!: string;
}

export class FavoritesListDto {
  @ApiProperty({ type: [FavoriteItemDto] })
  items!: FavoriteItemDto[];

  @ApiProperty({ description: '总数' })
  total!: number;

  @ApiProperty({ description: '当前页' })
  page!: number;

  @ApiProperty({ description: '每页数量' })
  limit!: number;
}

export class FavoriteCheckResultDto {
  @ApiProperty({ description: '目标ID' })
  targetId!: string;

  @ApiProperty({ description: '是否已收藏' })
  isFavorited!: boolean;
}

export class FavoritesCheckDto {
  @ApiProperty({ type: [FavoriteCheckResultDto] })
  results!: FavoriteCheckResultDto[];
}

export class FavoritesCountDto {
  @ApiProperty({ description: '收藏数量' })
  count!: number;
}

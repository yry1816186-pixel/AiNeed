import { ApiProperty } from '@nestjs/swagger';
import type { ClothingItem } from '@prisma/client';
import { RecommendationChannelType } from '../channels/channel.interface';

export class RecommendationItemDto {
  @ApiProperty({ description: '服装信息' })
  clothing!: ClothingItem;

  @ApiProperty({ description: '推荐分数(0-1)', example: 0.85 })
  score!: number;

  @ApiProperty({ description: '推荐原因', example: '与您偏好的简约风格匹配' })
  reason!: string;
}

export class RecommendationResponseDto {
  @ApiProperty({ description: '推荐列表', type: [RecommendationItemDto] })
  items!: RecommendationItemDto[];

  @ApiProperty({ description: '主要推荐通道', enum: ['content', 'collaborative', 'trending'] as const })
  channel!: RecommendationChannelType;
}

export class SimilarItemDto {
  @ApiProperty({ description: '服装信息' })
  clothing!: ClothingItem;

  @ApiProperty({ description: '相似度(0-1)', example: 0.78 })
  similarity!: number;
}

export class SimilarResponseDto {
  @ApiProperty({ description: '相似商品列表', type: [SimilarItemDto] })
  items!: SimilarItemDto[];
}

export class TrendingItemDto {
  @ApiProperty({ description: '服装信息' })
  clothing!: ClothingItem;

  @ApiProperty({ description: '热门分数', example: 156.5 })
  score!: number;
}

export class TrendingResponseDto {
  @ApiProperty({ description: '热门商品列表', type: [TrendingItemDto] })
  items!: TrendingItemDto[];
}

export class TrackInteractionResponseDto {
  @ApiProperty({ description: '是否记录成功' })
  recorded!: boolean;
}

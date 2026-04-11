import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class OutfitItemDto {
  @ApiProperty() slot!: string;
  @ApiProperty() name!: string;
  @ApiProperty() category!: string;
  @ApiProperty() color!: string;
  @ApiPropertyOptional() secondaryColor?: string;
  @ApiProperty({ type: [String] }) styleTags!: string[];
  @ApiProperty() fitType!: string;
  @ApiProperty() material!: string;
  @ApiProperty() priceRange!: string;
  @ApiProperty() reason!: string;
}

class OutfitRecommendationDto {
  @ApiProperty() occasion!: string;
  @ApiProperty() season!: string;
  @ApiProperty({ type: [String] }) styleTags!: string[];
  @ApiProperty({ type: [OutfitItemDto] }) items!: OutfitItemDto[];
  @ApiProperty() overallReason!: string;
  @ApiProperty() colorScheme!: string;
  @ApiProperty() bodyTypeTip!: string;
  @ApiPropertyOptional() alternativeTip?: string;
}

export class SessionResponseDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() title?: string;
  @ApiProperty() createdAt!: string;
}

export class SessionListItemDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() title?: string;
  @ApiPropertyOptional() lastMessage?: string;
  @ApiProperty() createdAt!: string;
}

export class SessionListResponseDto {
  @ApiProperty({ type: [SessionListItemDto] }) items!: SessionListItemDto[];
}

export class MessageResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() role!: string;
  @ApiProperty() content!: string;
  @ApiPropertyOptional({ type: OutfitRecommendationDto }) metadata?: OutfitRecommendationDto;
  @ApiProperty() createdAt!: string;
}

export class MessageListResponseDto {
  @ApiProperty({ type: [MessageResponseDto] }) items!: MessageResponseDto[];
}

export class SseEventDto {
  @ApiProperty({ description: '事件类型', enum: ['text', 'outfit', 'done', 'error'] }) type!: 'text' | 'outfit' | 'done' | 'error';
  @ApiProperty() content!: string;
}

export { OutfitRecommendationDto, OutfitItemDto };

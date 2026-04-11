import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ClothingMapEntryResponseDto {
  @ApiProperty({ description: '主色hex' })
  color!: string;

  @ApiProperty({ description: '服装类型标识' })
  type!: string;

  @ApiPropertyOptional({ description: '图案标识' })
  pattern?: string;
}

export class AvatarResponseDto {
  @ApiProperty({ description: '形象ID', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: '模板ID', format: 'uuid' })
  templateId!: string;

  @ApiProperty({ description: '形象参数' })
  avatarParams!: Record<string, unknown>;

  @ApiPropertyOptional({
    description: '当前穿戴映射',
    example: {
      top: { color: '#E94560', type: 'tshirt' },
      bottom: { color: '#1A1A2E', type: 'jeans' },
    },
  })
  clothingMap!: Record<string, ClothingMapEntryResponseDto> | null;

  @ApiPropertyOptional({ description: '缩略图URL' })
  thumbnailUrl!: string | null;
}

export class ThumbnailDto {
  @ApiProperty({ description: '缩略图图片URL' })
  image_url!: string;
}

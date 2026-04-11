import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

const VALID_CLOTHING_SLOTS = [
  'top',
  'bottom',
  'shoes',
  'bag',
  'accessory',
  'outerwear',
  'hat',
] as const;

type ClothingSlot = (typeof VALID_CLOTHING_SLOTS)[number];

class ClothingSlotEntryDto {
  @ApiProperty({ description: '主色hex', example: '#E94560' })
  @IsString()
  color!: string;

  @ApiProperty({ description: '服装类型标识', example: 'tshirt' })
  @IsString()
  type!: string;

  @ApiPropertyOptional({ description: '图案标识' })
  @IsOptional()
  @IsString()
  pattern?: string;
}

export type ClothingMapDto = Record<ClothingSlot, ClothingSlotEntryDto>;

export class DressAvatarDto {
  @ApiProperty({
    description: '换装映射(只覆盖传入的slot)',
    example: {
      top: { color: '#E94560', type: 'tshirt' },
      bottom: { color: '#1A1A2E', type: 'jeans' },
    },
  })
  @IsObject()
  @ValidateNested()
  @Type(() => ClothingSlotEntryDto)
  clothing_map!: Record<string, ClothingSlotEntryDto>;
}

export { VALID_CLOTHING_SLOTS, ClothingSlotEntryDto };

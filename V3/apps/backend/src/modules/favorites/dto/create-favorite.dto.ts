import { IsString, IsUUID, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const TARGET_TYPES = ['clothing', 'outfit', 'post', 'design'] as const;
export type TargetType = (typeof TARGET_TYPES)[number];

export class CreateFavoriteDto {
  @ApiProperty({
    description: '收藏目标类型',
    enum: TARGET_TYPES,
    example: 'clothing',
  })
  @IsString()
  @IsIn(TARGET_TYPES)
  targetType!: TargetType;

  @ApiProperty({
    description: '收藏目标ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  targetId!: string;
}

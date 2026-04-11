import { IsString, IsOptional, IsUUID, IsIn, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const NOTIFICATION_TYPES = [
  'like',
  'comment',
  'follow',
  'system',
  'order_status',
  'tryon_complete',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const REFERENCE_TYPES = [
  'post',
  'comment',
  'user',
  'order',
  'custom_order',
  'bespoke_order',
  'tryon',
  'outfit',
  'design',
] as const;

export type ReferenceType = (typeof REFERENCE_TYPES)[number];

export class CreateNotificationDto {
  @ApiProperty({
    description: '通知类型',
    enum: NOTIFICATION_TYPES,
    example: 'like',
  })
  @IsString()
  @IsIn(NOTIFICATION_TYPES)
  type!: NotificationType;

  @ApiProperty({
    description: '通知标题',
    example: '有人赞了你的帖子',
  })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    description: '通知内容',
    example: '用户小明赞了你的帖子《今日穿搭》',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: '关联对象ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @ApiPropertyOptional({
    description: '关联对象类型',
    enum: REFERENCE_TYPES,
    example: 'post',
  })
  @IsOptional()
  @IsString()
  @IsIn(REFERENCE_TYPES)
  referenceType?: ReferenceType;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationItemDto {
  @ApiProperty({ description: '通知ID' })
  id!: string;

  @ApiProperty({ description: '用户ID' })
  userId!: string;

  @ApiProperty({ description: '通知类型', example: 'like' })
  type!: string;

  @ApiPropertyOptional({ description: '通知标题' })
  title?: string;

  @ApiPropertyOptional({ description: '通知内容' })
  content?: string;

  @ApiPropertyOptional({ description: '关联对象ID' })
  referenceId?: string;

  @ApiPropertyOptional({ description: '关联对象类型' })
  referenceType?: string;

  @ApiProperty({ description: '是否已读' })
  isRead!: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt!: string;
}

export class NotificationListDto {
  @ApiProperty({ type: [NotificationItemDto] })
  items!: NotificationItemDto[];

  @ApiProperty({ description: '总数' })
  total!: number;

  @ApiProperty({ description: '当前页' })
  page!: number;

  @ApiProperty({ description: '每页数量' })
  limit!: number;
}

export class UnreadCountDto {
  @ApiProperty({ description: '未读数量' })
  count!: number;
}

export class ReadResultDto {
  @ApiProperty({ description: '操作结果' })
  success!: boolean;
}

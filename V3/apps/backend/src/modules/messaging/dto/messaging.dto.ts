import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn, IsInt, Min } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ description: '对方用户ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  userId!: string;
}

export class SendMessageDto {
  @ApiProperty({ description: '消息内容', example: '你好！' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ description: '消息类型', enum: ['text', 'image'], default: 'text' })
  @IsOptional()
  @IsIn(['text', 'image'])
  messageType?: string;
}

export class GetMessagesQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20, example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: '游标：加载此ID之前的消息', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class MarkReadDto {
  @ApiPropertyOptional({ description: '消息ID列表，为空则标记房间全部已读', type: [String] })
  @IsOptional()
  @IsString({ each: true })
  messageIds?: string[];
}

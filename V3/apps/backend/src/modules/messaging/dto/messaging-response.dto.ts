import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoomParticipantDto {
  @ApiProperty({ description: '用户ID' })
  userId!: string;

  @ApiProperty({ description: '昵称' })
  nickname!: string;

  @ApiPropertyOptional({ description: '头像URL' })
  avatarUrl?: string | null;

  @ApiProperty({ description: '加入时间' })
  joinedAt!: string;
}

export class DirectMessageDto {
  @ApiProperty({ description: '消息ID' })
  id!: string;

  @ApiProperty({ description: '房间ID' })
  roomId!: string;

  @ApiProperty({ description: '发送者ID' })
  senderId!: string;

  @ApiProperty({ description: '消息内容' })
  content!: string;

  @ApiProperty({ description: '消息类型' })
  messageType!: string;

  @ApiProperty({ description: '是否已读' })
  isRead!: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt!: string;
}

export class ChatRoomDto {
  @ApiProperty({ description: '房间ID' })
  id!: string;

  @ApiProperty({ description: '创建时间' })
  createdAt!: string;

  @ApiProperty({ description: '参与者列表', type: [RoomParticipantDto] })
  participants!: RoomParticipantDto[];

  @ApiPropertyOptional({ description: '最后一条消息' })
  lastMessage?: DirectMessageDto | null;

  @ApiPropertyOptional({ description: '未读消息数' })
  unreadCount?: number;
}

export class UnreadCountDto {
  @ApiProperty({ description: '未读消息总数' })
  total!: number;
}

export class MarkReadResponseDto {
  @ApiProperty({ description: '标记已读的消息数量' })
  markedCount!: number;
}

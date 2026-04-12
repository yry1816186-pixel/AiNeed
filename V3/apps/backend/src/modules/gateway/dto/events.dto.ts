import { IsString, IsUUID, IsIn, IsOptional, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class JoinRoomDto {
  @IsUUID()
  roomId!: string;
}

export class LeaveRoomDto {
  @IsUUID()
  roomId!: string;
}

export class SendMessageDto {
  @IsUUID()
  roomId!: string;

  @IsString()
  @MaxLength(5000)
  content!: string;

  @IsIn(['text', 'image'])
  messageType!: 'text' | 'image';
}

export class TypingDto {
  @IsUUID()
  roomId!: string;
}

export class MessagePayload {
  @IsUUID()
  roomId!: string;

  @IsUUID()
  messageId!: string;

  @IsUUID()
  senderId!: string;

  @IsString()
  content!: string;

  @IsIn(['text', 'image'])
  messageType!: 'text' | 'image';

  @IsString()
  createdAt!: string;
}

export class NotificationPayload {
  @IsUUID()
  id!: string;

  @IsString()
  type!: string;

  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @IsOptional()
  @IsString()
  referenceType?: string;
}

export class OrderUpdatePayload {
  @IsUUID()
  orderId!: string;

  @IsString()
  status!: string;

  @IsString()
  updatedAt!: string;
}

export class TypingIndicatorPayload {
  @IsUUID()
  roomId!: string;

  @IsUUID()
  userId!: string;
}

export class UnreadCountPayload {
  @ValidateNested()
  @Type(() => UnreadCountEntry)
  counts!: UnreadCountEntry[];
}

export class UnreadCountEntry {
  @IsString()
  type!: string;

  @IsIn([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const)
  count!: number;
}

import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  MinLength,
  IsBoolean,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// ==================== 枚举 ====================

export enum SenderTypeDto {
  USER = "user",
  CONSULTANT = "consultant",
}

export enum MessageTypeDto {
  TEXT = "text",
  IMAGE = "image",
  FILE = "file",
  SYSTEM = "system",
}

// ==================== 聊天室 DTO ====================

export class CreateChatRoomDto {
  @ApiProperty({ description: "顾问 ID", example: "consultant_abc123" })
  @IsString()
  consultantId!: string;
}

export class UpdateChatRoomDto {
  @ApiPropertyOptional({ description: "聊天室是否激活", example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ChatRoomQueryDto {
  @ApiPropertyOptional({ description: "页码", example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页数量", example: 20, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: "是否只查询激活的聊天室", example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ==================== 聊天消息 DTO ====================

export class CreateChatMessageDto {
  @ApiProperty({ description: "聊天室 ID", example: "room_abc123" })
  @IsString()
  roomId!: string;

  @ApiProperty({ description: "发送者类型", enum: SenderTypeDto, example: SenderTypeDto.USER })
  @IsEnum(SenderTypeDto)
  senderType!: SenderTypeDto;

  @ApiProperty({ description: "消息内容", example: "你好，我想咨询穿搭建议" })
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiPropertyOptional({ description: "消息类型", enum: MessageTypeDto, example: MessageTypeDto.TEXT, default: MessageTypeDto.TEXT })
  @IsOptional()
  @IsEnum(MessageTypeDto)
  messageType?: MessageTypeDto = MessageTypeDto.TEXT;

  @ApiPropertyOptional({ description: "图片 URL", example: "https://cdn.example.com/image.jpg" })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: "文件 URL", example: "https://cdn.example.com/file.pdf" })
  @IsOptional()
  @IsString()
  fileUrl?: string;
}

export class MessageQueryDto {
  @ApiPropertyOptional({ description: "页码", example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页数量", example: 50, default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 50;

  @ApiPropertyOptional({ description: "按消息类型筛选", enum: MessageTypeDto })
  @IsOptional()
  @IsEnum(MessageTypeDto)
  messageType?: MessageTypeDto;

  @ApiPropertyOptional({ description: "获取此 ID 之前的消息", example: "msg_abc123" })
  @IsOptional()
  @IsString()
  beforeId?: string;
}

export class MarkReadDto {
  @ApiPropertyOptional({ description: "最后已读消息 ID", example: "msg_abc123" })
  @IsOptional()
  @IsString()
  lastMessageId?: string;
}

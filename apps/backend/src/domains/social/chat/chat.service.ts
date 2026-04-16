import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../common/prisma/prisma.service";

import {
  CreateChatRoomDto,
  UpdateChatRoomDto,
  ChatRoomQueryDto,
  CreateChatMessageDto,
  MessageQueryDto,
  MarkReadDto,
  MessageTypeDto,
} from "./dto";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== 聊天室 ====================

  async createRoom(userId: string, dto: CreateChatRoomDto) {
    // 验证顾问存在且为 active 状态
    const consultant = await this.prisma.consultantProfile.findUnique({
      where: { id: dto.consultantId },
    });

    if (!consultant) {
      throw new NotFoundException("顾问不存在");
    }

    if (consultant.status !== "active") {
      throw new BadRequestException("该顾问暂不可聊天");
    }

    // 不允许与自己聊天
    if (consultant.userId === userId) {
      throw new BadRequestException("不能与自己创建聊天室");
    }

    // 检查是否已有活跃聊天室
    const existingRoom = await this.prisma.chatRoom.findFirst({
      where: {
        userId,
        consultantId: dto.consultantId,
        isActive: true,
      },
    });

    if (existingRoom) {
      return this.getRoomById(userId, existingRoom.id);
    }

    return this.prisma.chatRoom.create({
      data: {
        userId,
        consultantId: dto.consultantId,
      },
      include: {
        consultant: {
          select: {
            id: true,
            studioName: true,
            avatar: true,
            user: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
        },
      },
    });
  }

  async getRoomsByUser(userId: string, query: ChatRoomQueryDto) {
    const { page = 1, pageSize = 20, isActive } = query;

    const where: Prisma.ChatRoomWhereInput = { userId };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [rooms, total] = await Promise.all([
      this.prisma.chatRoom.findMany({
        where,
        orderBy: { lastMessageAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          consultant: {
            select: {
              id: true,
              studioName: true,
              avatar: true,
              user: {
                select: {
                  id: true,
                  nickname: true,
                },
              },
            },
          },
          _count: {
            select: {
              messages: {
                where: {
                  isRead: false,
                  senderId: { not: userId },
                },
              },
            },
          },
        },
      }),
      this.prisma.chatRoom.count({ where }),
    ]);

    return {
      data: rooms.map((room) => ({
        ...room,
        unreadCount: room._count.messages,
      })),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getRoomById(userId: string, roomId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        consultant: {
          select: {
            id: true,
            studioName: true,
            avatar: true,
            user: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException("聊天室不存在");
    }

    // 验证权限：仅聊天参与者可访问
    await this.verifyRoomAccess(userId, room);

    return room;
  }

  async updateRoom(userId: string, roomId: string, dto: UpdateChatRoomDto) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException("聊天室不存在");
    }

    // 验证权限
    await this.verifyRoomAccess(userId, room);

    const data: Prisma.ChatRoomUpdateInput = {};
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    return this.prisma.chatRoom.update({
      where: { id: roomId },
      data,
      include: {
        consultant: {
          select: {
            id: true,
            studioName: true,
            avatar: true,
          },
        },
      },
    });
  }

  // ==================== 聊天消息 ====================

  async sendMessage(userId: string, dto: CreateChatMessageDto) {
    // 验证聊天室存在且用户有权限
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: dto.roomId },
    });

    if (!room) {
      throw new NotFoundException("聊天室不存在");
    }

    if (!room.isActive) {
      throw new BadRequestException("聊天室已关闭");
    }

    await this.verifyRoomAccess(userId, room);

    // 验证 senderType 与用户身份匹配
    const consultant = await this.prisma.consultantProfile.findUnique({
      where: { id: room.consultantId },
    });

    if (dto.senderType === "consultant") {
      if (consultant?.userId !== userId) {
        throw new ForbiddenException("仅顾问可以 consultant 身份发送消息");
      }
    } else {
      if (room.userId !== userId) {
        throw new ForbiddenException("仅客户可以 user 身份发送消息");
      }
    }

    // 创建消息并更新聊天室最后消息信息
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.chatMessage.create({
        data: {
          roomId: dto.roomId,
          senderId: userId,
          senderType: dto.senderType,
          content: dto.content,
          messageType: dto.messageType ?? "text",
          imageUrl: dto.imageUrl,
          fileUrl: dto.fileUrl,
        },
      });

      // 更新聊天室的最后消息预览和时间
      const preview =
        dto.messageType === "text" || !dto.messageType
          ? dto.content.substring(0, 50)
          : `[${dto.messageType}]`;

      await tx.chatRoom.update({
        where: { id: dto.roomId },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: preview,
        },
      });

      return message;
    });
  }

  async getMessages(userId: string, roomId: string, query: MessageQueryDto) {
    // 验证权限
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException("聊天室不存在");
    }

    await this.verifyRoomAccess(userId, room);

    const { page = 1, pageSize = 50, messageType, beforeId } = query;

    const where: Prisma.ChatMessageWhereInput = { roomId };

    if (messageType) {
      where.messageType = messageType;
    }

    // 游标分页：支持 beforeId 加载更早消息
    if (beforeId) {
      const beforeMessage = await this.prisma.chatMessage.findUnique({
        where: { id: beforeId },
        select: { createdAt: true },
      });
      if (beforeMessage) {
        where.createdAt = { lt: beforeMessage.createdAt };
      }
    }

    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: beforeId ? 0 : (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.chatMessage.count({ where }),
    ]);

    // 消息按时间正序返回（最新在底部）
    return {
      data: messages.reverse(),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async markAsRead(userId: string, roomId: string, dto: MarkReadDto) {
    // 验证权限
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException("聊天室不存在");
    }

    await this.verifyRoomAccess(userId, room);

    // 标记所有未读消息为已读
    const where: Prisma.ChatMessageWhereInput = {
      roomId,
      isRead: false,
      senderId: { not: userId },
    };

    if (dto.lastMessageId) {
      // 仅标记到指定消息
      const lastMsg = await this.prisma.chatMessage.findUnique({
        where: { id: dto.lastMessageId },
      });
      if (lastMsg) {
        where.createdAt = { lte: lastMsg.createdAt };
      }
    }

    const result = await this.prisma.chatMessage.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { markedCount: result.count };
  }

  async getUnreadCount(userId: string, roomId: string) {
    // 验证权限
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException("聊天室不存在");
    }

    await this.verifyRoomAccess(userId, room);

    const count = await this.prisma.chatMessage.count({
      where: {
        roomId,
        isRead: false,
        senderId: { not: userId },
      },
    });

    return { unreadCount: count };
  }

  /**
   * 判断用户是否为指定顾问身份
   */
  async isConsultant(userId: string, consultantId: string): Promise<boolean> {
    const consultant = await this.prisma.consultantProfile.findUnique({
      where: { id: consultantId },
    });
    return consultant?.userId === userId;
  }

  // ==================== 私有方法 ====================

  /**
   * 验证用户是否有权访问聊天室
   */
  private async verifyRoomAccess(
    userId: string,
    room: { userId: string; consultantId: string },
  ) {
    // 聊天室用户本人
    if (room.userId === userId) {
      return;
    }

    // 顾问本人
    const consultant = await this.prisma.consultantProfile.findUnique({
      where: { id: room.consultantId },
    });

    if (consultant?.userId === userId) {
      return;
    }

    throw new ForbiddenException("无权访问此聊天室");
  }
}

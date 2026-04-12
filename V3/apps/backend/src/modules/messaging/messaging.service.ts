import {
  Injectable,
  Logger,
  NotFoundException,
  HttpException,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomDto, SendMessageDto, GetMessagesQueryDto } from './dto/messaging.dto';
import {
  ChatRoomDto,
  DirectMessageDto,
  UnreadCountDto,
  MarkReadResponseDto,
} from './dto/messaging-response.dto';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getRooms(userId: string): Promise<ChatRoomDto[]> {
    const participations = await this.prisma.chatRoomParticipant.findMany({
      where: { userId },
      select: { roomId: true },
    });

    if (participations.length === 0) {
      return [];
    }

    const roomIds = participations.map((p) => p.roomId);

    const rooms = await this.prisma.chatRoom.findMany({
      where: { id: { in: roomIds } },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, nickname: true, avatarUrl: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const roomsWithUnread = await this.batchGetUnreadCounts(
      rooms,
      userId,
    );

    roomsWithUnread.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt ?? a.createdAt;
      const timeB = b.lastMessage?.createdAt ?? b.createdAt;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });

    return roomsWithUnread;
  }

  async createRoom(userId: string, dto: CreateRoomDto): Promise<ChatRoomDto> {
    if (userId === dto.userId) {
      throw new HttpException(
        { code: 'VALIDATION_ERROR', message: '不能与自己创建聊天' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!targetUser) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: '目标用户不存在' });
    }

    const existingRoom = await this.findExistingRoom(userId, dto.userId);
    if (existingRoom) {
      return this.getRoomDetail(existingRoom, userId);
    }

    const room = await this.prisma.chatRoom.create({
      data: {
        participants: {
          create: [{ userId }, { userId: dto.userId }],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, nickname: true, avatarUrl: true },
            },
          },
        },
      },
    });

    this.logger.log(`聊天室已创建: ${room.id}, 用户: ${userId} <-> ${dto.userId}`);

    return {
      id: room.id,
      createdAt: room.createdAt.toISOString(),
      participants: room.participants.map((p) => ({
        userId: p.user.id,
        nickname: p.user.nickname ?? '',
        avatarUrl: p.user.avatarUrl,
        joinedAt: p.joinedAt.toISOString(),
      })),
      lastMessage: null,
      unreadCount: 0,
    };
  }

  async getMessages(
    userId: string,
    roomId: string,
    query: GetMessagesQueryDto,
  ): Promise<{ data: DirectMessageDto[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    await this.verifyRoomAccess(userId, roomId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Record<string, unknown> = { roomId };

    if (query.cursor) {
      const cursorMessage = await this.prisma.directMessage.findUnique({
        where: { id: query.cursor },
        select: { createdAt: true },
      });

      if (cursorMessage) {
        where.createdAt = { lt: cursorMessage.createdAt };
      }
    }

    const [total, messages] = await Promise.all([
      this.prisma.directMessage.count({ where: { roomId } }),
      this.prisma.directMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.cursor ? 0 : (page - 1) * limit,
        take: limit,
      }),
    ]);

    const sortedMessages = [...messages].reverse();

    return {
      data: sortedMessages.map((m) => ({
        id: m.id,
        roomId: m.roomId,
        senderId: m.senderId,
        content: m.content,
        messageType: m.messageType,
        isRead: m.isRead,
        createdAt: m.createdAt.toISOString(),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async sendMessage(userId: string, roomId: string, dto: SendMessageDto): Promise<DirectMessageDto> {
    await this.verifyRoomAccess(userId, roomId);

    const message = await this.prisma.directMessage.create({
      data: {
        roomId,
        senderId: userId,
        content: dto.content,
        messageType: dto.messageType ?? 'text',
      },
    });

    this.logger.log(`消息已发送: ${message.id}, 房间: ${roomId}`);

    return {
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      content: message.content,
      messageType: message.messageType,
      isRead: message.isRead,
      createdAt: message.createdAt.toISOString(),
    };
  }

  async markRead(userId: string, messageId: string): Promise<MarkReadResponseDto> {
    const message = await this.prisma.directMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException({ code: 'MESSAGE_NOT_FOUND', message: '消息不存在' });
    }

    await this.verifyRoomAccess(userId, message.roomId);

    if (message.senderId === userId) {
      return { markedCount: 0 };
    }

    if (message.isRead) {
      return { markedCount: 0 };
    }

    await this.prisma.directMessage.update({
      where: { id: messageId },
      data: { isRead: true },
    });

    return { markedCount: 1 };
  }

  async getUnreadCount(userId: string): Promise<UnreadCountDto> {
    const participations = await this.prisma.chatRoomParticipant.findMany({
      where: { userId },
      select: { roomId: true },
    });

    if (participations.length === 0) {
      return { total: 0 };
    }

    const roomIds = participations.map((p) => p.roomId);

    const total = await this.prisma.directMessage.count({
      where: {
        roomId: { in: roomIds },
        senderId: { not: userId },
        isRead: false,
      },
    });

    return { total };
  }

  private async verifyRoomAccess(userId: string, roomId: string): Promise<void> {
    const participant = await this.prisma.chatRoomParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (!participant) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: '无权访问此聊天室' });
    }
  }

  private async findExistingRoom(userId: string, otherUserId: string): Promise<string | null> {
    const userRooms = await this.prisma.chatRoomParticipant.findMany({
      where: { userId },
      select: { roomId: true },
    });

    if (userRooms.length === 0) {
      return null;
    }

    const roomIds = userRooms.map((r) => r.roomId);

    const shared = await this.prisma.chatRoomParticipant.findFirst({
      where: {
        roomId: { in: roomIds },
        userId: otherUserId,
      },
      select: { roomId: true },
    });

    return shared?.roomId ?? null;
  }

  private async batchGetUnreadCounts(
    rooms: Array<{
      id: string;
      createdAt: Date;
      participants: Array<{
        user: { id: string; nickname: string | null; avatarUrl: string | null };
        joinedAt: Date;
      }>;
      messages: Array<{
        id: string;
        roomId: string;
        senderId: string;
        content: string;
        messageType: string;
        isRead: boolean;
        createdAt: Date;
      }>;
    }>,
    userId: string,
  ): Promise<ChatRoomDto[]> {
    const roomIds = rooms.map((r) => r.id);

    const unreadCounts = await this.prisma.directMessage.groupBy({
      by: ['roomId'],
      where: {
        roomId: { in: roomIds },
        senderId: { not: userId },
        isRead: false,
      },
      _count: { id: true },
    });

    const unreadMap = new Map<string, number>();
    for (const row of unreadCounts) {
      unreadMap.set(row.roomId, row._count.id);
    }

    return rooms.map((room) => {
      const lastMessage = room.messages[0] ?? null;
      return {
        id: room.id,
        createdAt: room.createdAt.toISOString(),
        participants: room.participants.map((p) => ({
          userId: p.user.id,
          nickname: p.user.nickname ?? '',
          avatarUrl: p.user.avatarUrl,
          joinedAt: p.joinedAt.toISOString(),
        })),
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              roomId: lastMessage.roomId,
              senderId: lastMessage.senderId,
              content: lastMessage.content,
              messageType: lastMessage.messageType,
              isRead: lastMessage.isRead,
              createdAt: lastMessage.createdAt.toISOString(),
            }
          : null,
        unreadCount: unreadMap.get(room.id) ?? 0,
      };
    });
  }

  private async getRoomDetail(roomId: string, userId: string): Promise<ChatRoomDto> {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, nickname: true, avatarUrl: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!room) {
      throw new NotFoundException({ code: 'ROOM_NOT_FOUND', message: '聊天室不存在' });
    }

    const unreadCount = await this.prisma.directMessage.count({
      where: {
        roomId: room.id,
        senderId: { not: userId },
        isRead: false,
      },
    });

    const lastMessage = room.messages[0] ?? null;

    return {
      id: room.id,
      createdAt: room.createdAt.toISOString(),
      participants: room.participants.map((p) => ({
        userId: p.user.id,
        nickname: p.user.nickname ?? '',
        avatarUrl: p.user.avatarUrl,
        joinedAt: p.joinedAt.toISOString(),
      })),
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            roomId: lastMessage.roomId,
            senderId: lastMessage.senderId,
            content: lastMessage.content,
            messageType: lastMessage.messageType,
            isRead: lastMessage.isRead,
            createdAt: lastMessage.createdAt.toISOString(),
          }
        : null,
      unreadCount,
    };
  }
}

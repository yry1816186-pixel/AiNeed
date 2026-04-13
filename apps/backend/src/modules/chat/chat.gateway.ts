import {
  Logger,
  UsePipes,
  ValidationPipe,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';

import { REDIS_CLIENT } from '../../common/redis/redis.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EventBusService } from '../ws/services/event-bus.service';
import { ChatService } from './chat.service';
import {
  CHAT_EVENTS,
  ChatMessageCreatedPayload,
  ChatMessageReadPayload,
} from '../ws/events';

interface ChatUserConnection {
  socketId: string;
  userId: string;
  activeRoomId?: string;
  connectedAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/ws/chat',
  transports: ['websocket', 'polling'],
})
@UsePipes(new ValidationPipe())
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  private userSocketMap = new Map<string, Set<string>>();
  private connections = new Map<string, ChatUserConnection>();
  private eventUnsubscribers: Array<() => void> = [];

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private eventBus: EventBusService,
    private chatService: ChatService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    const eventMappings = [
      { eventType: CHAT_EVENTS.MESSAGE_CREATED, handler: (envelope: any) => this.handleMessageCreated(envelope) },
      { eventType: CHAT_EVENTS.MESSAGE_READ, handler: (envelope: any) => this.handleMessageRead(envelope) },
    ];

    for (const mapping of eventMappings) {
      this.eventBus.on(mapping.eventType, mapping.handler);
      this.eventUnsubscribers.push(() => this.eventBus.off(mapping.eventType, mapping.handler));
    }

    this.logger.log('Chat WebSocket gateway initialized');
  }

  onModuleDestroy() {
    for (const unsubscribe of this.eventUnsubscribers) {
      unsubscribe();
    }
    this.eventUnsubscribers = [];
    this.connections.clear();
    this.userSocketMap.clear();
    this.logger.log('Chat WebSocket gateway destroyed');
  }

  afterInit(server: Server) {
    this.logger.log('Chat WebSocket server initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const userId = this.extractUserId(client);
      if (!userId) {
        this.logger.warn(`Chat client ${client.id} rejected: no valid token`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const connection: ChatUserConnection = {
        socketId: client.id,
        userId,
        connectedAt: new Date(),
      };

      this.connections.set(client.id, connection);

      if (!this.userSocketMap.has(userId)) {
        this.userSocketMap.set(userId, new Set());
      }
      this.userSocketMap.get(userId)!.add(client.id);

      await client.join(`chat:user:${userId}`);

      this.logger.log(`Chat client ${client.id} connected for user ${userId}`);

      client.emit('connected', {
        message: 'Connected to chat events',
        userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Chat connection error: ${message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const connection = this.connections.get(client.id);
    if (connection) {
      const { userId } = connection;
      const userSocketSet = this.userSocketMap.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSocketMap.delete(userId);
        }
      }
      this.connections.delete(client.id);
      this.logger.log(`Chat client ${client.id} disconnected for user ${userId}`);
    }
  }

  @SubscribeMessage('chat:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const connection = this.connections.get(client.id);
    if (!connection) return;

    // 验证用户有权访问此聊天室
    try {
      await this.chatService.getRoomById(connection.userId, data.roomId);
    } catch {
      client.emit('error', { message: '无权访问此聊天室' });
      return;
    }

    await client.join(`chat:room:${data.roomId}`);
    connection.activeRoomId = data.roomId;

    client.emit('chat:joined', { roomId: data.roomId });
    this.logger.debug(`Client ${client.id} joined chat room: ${data.roomId}`);
  }

  @SubscribeMessage('chat:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    await client.leave(`chat:room:${data.roomId}`);
    const connection = this.connections.get(client.id);
    if (connection?.activeRoomId === data.roomId) {
      connection.activeRoomId = undefined;
    }
    client.emit('chat:left', { roomId: data.roomId });
  }

  @SubscribeMessage('chat:message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; content: string; messageType: string; imageUrl?: string; fileUrl?: string },
  ) {
    const connection = this.connections.get(client.id);
    if (!connection) return;

    try {
      // 确定发送者类型
      const room = await this.prisma.chatRoom.findUnique({ where: { id: data.roomId } });
      if (!room) throw new Error('Room not found');

      const senderType = room.consultantId && (await this.chatService.isConsultant(connection.userId, room.consultantId)) ? 'consultant' : 'user';

      const message = await this.chatService.sendMessage(connection.userId, {
        roomId: data.roomId,
        senderType,
        content: data.content,
        messageType: data.messageType || 'text',
        imageUrl: data.imageUrl,
        fileUrl: data.fileUrl,
      });

      // 通过 EventBus 广播消息创建事件
      await this.eventBus.publish(CHAT_EVENTS.MESSAGE_CREATED, connection.userId, {
        roomId: data.roomId,
        messageId: message.id,
        senderId: connection.userId,
        senderType,
        messageType: data.messageType || 'text',
        content: data.content,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      client.emit('error', { message: `消息发送失败: ${msg}` });
    }
  }

  @SubscribeMessage('chat:typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; isTyping: boolean },
  ) {
    const connection = this.connections.get(client.id);
    if (!connection) return;

    const room = await this.prisma.chatRoom.findUnique({ where: { id: data.roomId } });
    if (!room) return;

    const senderType = room.consultantId && (await this.chatService.isConsultant(connection.userId, room.consultantId)) ? 'consultant' : 'user';

    // 直接向聊天室广播打字状态
    this.server.to(`chat:room:${data.roomId}`).emit('chat:typing', {
      roomId: data.roomId,
      senderId: connection.userId,
      senderType,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('chat:read')
  async handleRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; lastMessageId?: string },
  ) {
    const connection = this.connections.get(client.id);
    if (!connection) return;

    try {
      await this.chatService.markAsRead(connection.userId, data.roomId, { lastMessageId: data.lastMessageId });

      await this.eventBus.publish(CHAT_EVENTS.MESSAGE_READ, connection.userId, {
        roomId: data.roomId,
        readerId: connection.userId,
        lastMessageId: data.lastMessageId,
      });
    } catch {
      // Silently fail read receipts
    }
  }

  private async handleMessageCreated(envelope: { payload: ChatMessageCreatedPayload }) {
    const { roomId } = envelope.payload;
    this.server.to(`chat:room:${roomId}`).emit('chat:message', envelope.payload);
  }

  private async handleMessageRead(envelope: { payload: ChatMessageReadPayload }) {
    const { roomId } = envelope.payload;
    this.server.to(`chat:room:${roomId}`).emit('chat:read', envelope.payload);
  }

  private extractUserId(client: Socket): string | null {
    const auth = client.handshake.auth;
    const token = auth?.token;
    if (!token) return null;
    return this.validateToken(token as string);
  }

  private validateToken(token: string): string | null {
    try {
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      if (!jwtSecret) return null;
      const payload = this.jwtService.verify(token, { secret: jwtSecret });
      return payload.sub || payload.userId || null;
    } catch {
      return null;
    }
  }

  isUserOnline(userId: string): boolean {
    return this.userSocketMap.has(userId);
  }
}

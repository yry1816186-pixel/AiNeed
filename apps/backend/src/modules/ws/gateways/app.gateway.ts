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

import { REDIS_CLIENT } from '../../../common/redis/redis.service';
import { EventBusService } from '../services/event-bus.service';
import {
  PROFILE_EVENTS,
  QUIZ_EVENTS,
  NOTIFICATION_EVENTS,
  COMMUNITY_EVENTS,
} from '../events';

interface UserConnection {
  socketId: string;
  userId: string;
  connectedAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',').filter(Boolean) || (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000']),
    credentials: true,
  },
  namespace: '/ws/app',
  transports: ['websocket', 'polling'],
})
@UsePipes(new ValidationPipe())
export class AppGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AppGateway.name);

  private userSocketMap = new Map<string, Set<string>>();
  private connections = new Map<string, UserConnection>();

  private eventUnsubscribers: Array<() => void> = [];

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private eventBus: EventBusService,
  ) {}

  onModuleInit() {
    const eventMappings: Array<{ eventType: string; wsEvent: string }> = [
      { eventType: PROFILE_EVENTS.PROFILE_UPDATED, wsEvent: 'profile_updated' },
      { eventType: PROFILE_EVENTS.ONBOARDING_COMPLETED, wsEvent: 'onboarding_completed' },
      { eventType: QUIZ_EVENTS.QUIZ_PROGRESS_SAVED, wsEvent: 'quiz_progress_saved' },
      { eventType: NOTIFICATION_EVENTS.NEW_NOTIFICATION, wsEvent: 'new_notification' },
      { eventType: NOTIFICATION_EVENTS.NOTIFICATION_READ, wsEvent: 'notification_read' },
      { eventType: COMMUNITY_EVENTS.NEW_POST, wsEvent: 'new_post' },
      { eventType: COMMUNITY_EVENTS.NEW_COMMENT, wsEvent: 'new_comment' },
      { eventType: COMMUNITY_EVENTS.NEW_LIKE, wsEvent: 'new_like' },
    ];

    for (const mapping of eventMappings) {
      const handler = (envelope: { userId: string; payload: unknown }) => {
        this.pushToUser(envelope.userId, mapping.wsEvent, envelope.payload);
      };

      this.eventBus.on(mapping.eventType, handler);
      this.eventUnsubscribers.push(() => {
        this.eventBus.off(mapping.eventType, handler);
      });
    }

    this.logger.log('App WebSocket gateway initialized');
  }

  onModuleDestroy() {
    for (const unsubscribe of this.eventUnsubscribers) {
      unsubscribe();
    }
    this.eventUnsubscribers = [];
    this.connections.clear();
    this.userSocketMap.clear();
    this.logger.log('App WebSocket gateway destroyed');
  }

  afterInit(server: Server) {
    this.logger.log('App WebSocket server initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const userId = this.extractUserId(client);
      if (!userId) {
        this.logger.warn(`Client ${client.id} rejected: no valid token`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const connection: UserConnection = {
        socketId: client.id,
        userId,
        connectedAt: new Date(),
      };

      this.connections.set(client.id, connection);

      if (!this.userSocketMap.has(userId)) {
        this.userSocketMap.set(userId, new Set());
      }
      this.userSocketMap.get(userId)!.add(client.id);

      await client.join(`user:${userId}`);

      this.logger.log(`Client ${client.id} connected for user ${userId}`);

      client.emit('connected', {
        message: 'Connected to app events',
        userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Connection error: ${message}`);
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

      this.logger.log(`Client ${client.id} disconnected for user ${userId}`);
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    await client.join(data.room);
    this.logger.debug(`Client ${client.id} joined room: ${data.room}`);
    client.emit('joinedRoom', { room: data.room });
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    await client.leave(data.room);
    this.logger.debug(`Client ${client.id} left room: ${data.room}`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: Date.now() });
  }

  isUserOnline(userId: string): boolean {
    return this.userSocketMap.has(userId);
  }

  getOnlineUserCount(): number {
    return this.userSocketMap.size;
  }

  private pushToUser(userId: string, event: string, payload: unknown): void {
    const room = `user:${userId}`;
    this.server.to(room).emit(event, {
      type: event,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  private extractUserId(client: Socket): string | null {
    const auth = client.handshake.auth;

    const token = auth?.token;
    if (!token) {
      this.logger.warn(`Client ${client.id} rejected: token must be provided in auth object`);
      return null;
    }

    return this.validateToken(token as string);
  }

  private validateToken(token: string): string | null {
    try {
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      if (!jwtSecret) {
        this.logger.error('JWT_SECRET is not configured');
        return null;
      }

      const payload = this.jwtService.verify(token, {
        secret: jwtSecret,
      });

      const userId = payload.sub || payload.userId;
      return userId || null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.debug(`Token validation failed: ${message}`);
      return null;
    }
  }
}

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
import Redis from 'ioredis';
import { Server, Socket } from 'socket.io';

import { REDIS_CLIENT } from '../../../common/redis/redis.service';
import { AI_EVENTS } from '../events';
import { EventBusService } from '../services/event-bus.service';

interface UserConnection {
  socketId: string;
  userId: string;
  connectedAt: Date;
  lastHeartbeat: Date;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',').filter(Boolean) || (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000']),
    credentials: true,
  },
  namespace: '/ws/ai',
  transports: ['websocket', 'polling'],
})
@UsePipes(new ValidationPipe())
export class AIGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AIGateway.name);

  private userSocketMap = new Map<string, Set<string>>();
  private connections = new Map<string, UserConnection>();

  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_TIMEOUT = 60000;

  private eventUnsubscribers: Array<() => void> = [];

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private eventBus: EventBusService,
  ) {}

  onModuleInit() {
    const taskStartedHandler = (envelope: { userId: string; payload: Record<string, unknown> }) => {
      this.pushToUser(envelope.userId, 'ai_task_started', envelope.payload);
    };

    const taskProgressHandler = (envelope: { userId: string; payload: Record<string, unknown> }) => {
      const progress = typeof envelope.payload.progress === 'number'
        ? Math.max(0, Math.min(100, envelope.payload.progress))
        : 0;
      const clampedPayload = { ...envelope.payload, progress };

      this.pushToUser(envelope.userId, 'ai_task_progress', clampedPayload);

      const jobId = envelope.payload.jobId as string | undefined;
      if (jobId) {
        this.server.to(`task:${jobId}`).emit('ai_task_progress', {
          type: 'ai_task_progress',
          payload: clampedPayload,
          timestamp: new Date().toISOString(),
        });
      }
    };

    const taskCompletedHandler = (envelope: { userId: string; payload: Record<string, unknown> }) => {
      this.pushToUser(envelope.userId, 'ai_task_completed', envelope.payload);

      const jobId = envelope.payload.jobId as string | undefined;
      if (jobId) {
        this.server.to(`task:${jobId}`).emit('ai_task_completed', {
          type: 'ai_task_completed',
          payload: envelope.payload,
          timestamp: new Date().toISOString(),
        });
      }
    };

    this.eventBus.on(AI_EVENTS.AI_TASK_STARTED, taskStartedHandler);
    this.eventBus.on(AI_EVENTS.AI_TASK_PROGRESS, taskProgressHandler);
    this.eventBus.on(AI_EVENTS.AI_TASK_COMPLETED, taskCompletedHandler);

    this.eventUnsubscribers.push(
      () => this.eventBus.off(AI_EVENTS.AI_TASK_STARTED, taskStartedHandler),
      () => this.eventBus.off(AI_EVENTS.AI_TASK_PROGRESS, taskProgressHandler),
      () => this.eventBus.off(AI_EVENTS.AI_TASK_COMPLETED, taskCompletedHandler),
    );

    this.startHeartbeatCheck();

    this.logger.log('AI WebSocket gateway initialized');
  }

  onModuleDestroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    for (const unsubscribe of this.eventUnsubscribers) {
      unsubscribe();
    }
    this.eventUnsubscribers = [];

    this.connections.clear();
    this.userSocketMap.clear();

    this.logger.log('AI WebSocket gateway destroyed');
  }

  afterInit(server: Server) {
    this.logger.log('AI WebSocket server initialized');
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
        lastHeartbeat: new Date(),
      };

      this.connections.set(client.id, connection);

      if (!this.userSocketMap.has(userId)) {
        this.userSocketMap.set(userId, new Set());
      }
      this.userSocketMap.get(userId)!.add(client.id);

      await client.join(`user:${userId}`);

      this.logger.log(`Client ${client.id} connected for user ${userId}`);

      client.emit('connected', {
        message: 'Connected to AI task updates',
        userId,
        timestamp: new Date().toISOString(),
      });

      await this.sendPendingTaskUpdates(client, userId);
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

  @SubscribeMessage('subscribe_task')
  async handleSubscribeTask(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobId: string },
  ) {
    const { jobId } = data;
    const connection = this.connections.get(client.id);

    if (!connection) {
      return { error: 'Not connected' };
    }

    await client.join(`task:${jobId}`);

    this.logger.debug(`Client ${client.id} subscribed to task ${jobId}`);

    const taskStatus = await this.getTaskStatus(jobId);
    if (taskStatus) {
      client.emit('task_status', taskStatus);
    }

    return { subscribed: true, jobId };
  }

  @SubscribeMessage('unsubscribe_task')
  async handleUnsubscribeTask(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobId: string },
  ) {
    await client.leave(`task:${data.jobId}`);
    this.logger.debug(`Client ${client.id} unsubscribed from task ${data.jobId}`);
    return { unsubscribed: true, jobId: data.jobId };
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: Socket) {
    const connection = this.connections.get(client.id);
    if (connection) {
      connection.lastHeartbeat = new Date();
      client.emit('heartbeat_ack', { timestamp: Date.now() });
    }
  }

  isUserOnline(userId: string): boolean {
    return this.userSocketMap.has(userId);
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

  private async getTaskStatus(jobId: string): Promise<Record<string, unknown> | null> {
    const key = `job:${jobId}`;
    const data = await this.redis.get(key);
    if (!data) {return null;}
    try {
      return JSON.parse(data) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private async sendPendingTaskUpdates(client: Socket, userId: string): Promise<void> {
    try {
      const userJobsKey = `user_jobs:${userId}`;
      const jobIds = await this.redis.lrange(userJobsKey, 0, 10);

      for (const jobId of jobIds) {
        const jobStatus = await this.getTaskStatus(jobId);
        if (jobStatus) {
          const status = jobStatus.status as string;
          if (status === 'pending' || status === 'processing') {
            client.emit('task_status', jobStatus);
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error sending pending updates: ${message}`);
    }
  }

  private startHeartbeatCheck(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();

      for (const [socketId, connection] of this.connections.entries()) {
        const timeSinceLastHeartbeat = now - connection.lastHeartbeat.getTime();

        if (timeSinceLastHeartbeat > this.HEARTBEAT_TIMEOUT) {
          this.logger.warn(`Client ${socketId} timed out (no heartbeat)`);

          const socket = this.server.sockets.sockets.get(socketId);
          if (socket) {
            socket.disconnect(true);
          }
          this.connections.delete(socketId);
        }
      }
    }, 30000);
  }
}

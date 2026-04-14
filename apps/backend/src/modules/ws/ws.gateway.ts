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

import { REDIS_CLIENT } from '../../common/redis/redis.service';

export type AITaskEventType = 'task_created' | 'task_progress' | 'task_completed' | 'task_failed' | 'task_cancelled';

export interface AITaskData {
  jobId: string;
  progress?: number;
  stage?: string;
  message?: string;
  status?: string;
  result?: TaskResult;
  error?: string;
}

export interface TaskResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export interface AITaskEvent {
  type: AITaskEventType;
  jobId: string;
  userId: string;
  data?: AITaskData | TaskProgressPayload | TaskCompletedPayload | TaskFailedPayload;
  timestamp: string;
}

export interface TaskProgressPayload {
  jobId: string;
  progress: number;
  stage: string;
  message?: string;
}

export interface TaskCompletedPayload {
  jobId: string;
  result: TaskResult;
  duration: number;
}

export interface TaskFailedPayload {
  jobId: string;
  error: string;
  retryable: boolean;
}

export interface TaskStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: string;
  message?: string;
  result?: TaskResult;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserConnection {
  socketId: string;
  userId: string;
  connectedAt: Date;
  lastHeartbeat: Date;
}

interface WSNotifyPayload {
  userId: string;
  event: AITaskEventType;
  data: AITaskData;
}

interface TaskProgressRedisPayload {
  jobId: string;
  userId: string;
  progress: number;
  stage: string;
  message?: string;
}

interface TaskCompletedRedisPayload {
  jobId: string;
  userId: string;
  result: TaskResult;
}

interface TaskFailedRedisPayload {
  jobId: string;
  userId: string;
  error: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/ws/ai',
  transports: ['websocket', 'polling'],
})
@UsePipes(new ValidationPipe())
export class AIWebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AIWebSocketGateway.name);

  private connections = new Map<string, UserConnection>();
  private userSockets = new Map<string, Set<string>>();

  private subscriber: Redis;

  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_TIMEOUT = 60000;

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {
    this.subscriber = new Redis(
      this.configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
    );
  }

  async onModuleInit() {
    await this.subscriber.subscribe('ws:notify', 'task:progress', 'task:completed', 'task:failed');

    this.subscriber.on('message', (channel, message) => {
      this.handleRedisMessage(channel, message);
    });

    this.startHeartbeatCheck();

    this.logger.log('AI WebSocket gateway initialized');
  }

  async onModuleDestroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    await this.subscriber.quit();
    this.connections.clear();
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

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

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

      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
        }
      }

      this.connections.delete(client.id);

      this.logger.log(`Client ${client.id} disconnected for user ${userId}`);
    }
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: Socket) {
    const connection = this.connections.get(client.id);
    if (connection) {
      connection.lastHeartbeat = new Date();
      client.emit('heartbeat_ack', { timestamp: Date.now() });
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
    return { unsubscribed: true, jobId: data.jobId };
  }

  @SubscribeMessage('get_online_count')
  handleGetOnlineCount(@ConnectedSocket() client: Socket) {
    return {
      onlineUsers: this.userSockets.size,
      totalConnections: this.connections.size,
    };
  }

  async sendTaskUpdate(userId: string, event: AITaskEvent): Promise<boolean> {
    const room = `user:${userId}`;

    this.server.to(room).emit('task_update', event);

    this.server.to(`task:${event.jobId}`).emit('task_update', event);

    this.logger.debug(`Task update sent to user ${userId}: ${event.type} - ${event.jobId}`);

    return this.isUserOnline(userId);
  }

  async sendProgressUpdate(userId: string, payload: TaskProgressPayload): Promise<void> {
    const room = `user:${userId}`;

    this.server.to(room).emit('task_progress', {
      ...payload,
      timestamp: new Date().toISOString(),
    });

    this.server.to(`task:${payload.jobId}`).emit('task_progress', {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  async broadcastTaskComplete(userId: string, payload: TaskCompletedPayload): Promise<void> {
    const room = `user:${userId}`;

    const event: AITaskEvent = {
      type: 'task_completed',
      jobId: payload.jobId,
      userId,
      data: payload,
      timestamp: new Date().toISOString(),
    };

    this.server.to(room).emit('task_completed', event);
    this.server.to(`task:${payload.jobId}`).emit('task_completed', event);

    this.logger.log(`Task completed notification sent: ${payload.jobId}`);
  }

  async broadcastTaskFailed(userId: string, payload: TaskFailedPayload): Promise<void> {
    const room = `user:${userId}`;

    const event: AITaskEvent = {
      type: 'task_failed',
      jobId: payload.jobId,
      userId,
      data: payload,
      timestamp: new Date().toISOString(),
    };

    this.server.to(room).emit('task_failed', event);
    this.server.to(`task:${payload.jobId}`).emit('task_failed', event);

    this.logger.warn(`Task failed notification sent: ${payload.jobId} - ${payload.error}`);
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  private extractUserId(client: Socket): string | null {
    const auth = client.handshake.auth;

    const token = auth?.token;
    if (!token) {
      this.logger.warn(`Client ${client.id} rejected: token must be provided in auth object, not query parameters`);
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

  private handleRedisMessage(channel: string, message: string): void {
    try {
      const data = JSON.parse(message);

      switch (channel) {
        case 'ws:notify':
          this.handleWSNotify(data as WSNotifyPayload);
          break;
        case 'task:progress':
          this.handleTaskProgress(data as TaskProgressRedisPayload);
          break;
        case 'task:completed':
          this.handleTaskCompleted(data as TaskCompletedRedisPayload);
          break;
        case 'task:failed':
          this.handleTaskFailed(data as TaskFailedRedisPayload);
          break;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error handling Redis message: ${errorMessage}`);
    }
  }

  private handleWSNotify(data: WSNotifyPayload): void {
    const { userId, event, data: eventData } = data;

    const taskEvent: AITaskEvent = {
      type: event,
      jobId: eventData.jobId,
      userId,
      data: eventData,
      timestamp: new Date().toISOString(),
    };

    this.sendTaskUpdate(userId, taskEvent);
  }

  private handleTaskProgress(data: TaskProgressRedisPayload): void {
    this.sendProgressUpdate(data.userId, {
      jobId: data.jobId,
      progress: data.progress,
      stage: data.stage,
      message: data.message,
    });
  }

  private handleTaskCompleted(data: TaskCompletedRedisPayload): void {
    this.broadcastTaskComplete(data.userId, {
      jobId: data.jobId,
      result: data.result,
      duration: 0,
    });
  }

  private handleTaskFailed(data: TaskFailedRedisPayload): void {
    this.broadcastTaskFailed(data.userId, {
      jobId: data.jobId,
      error: data.error,
      retryable: true,
    });
  }

  private async getTaskStatus(jobId: string): Promise<TaskStatus | null> {
    const key = `job:${jobId}`;
    const data = await this.redis.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as TaskStatus;
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
        if (jobStatus && (jobStatus.status === 'pending' || jobStatus.status === 'processing')) {
          client.emit('task_status', jobStatus);
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

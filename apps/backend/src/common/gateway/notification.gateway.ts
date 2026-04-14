import { Logger, UsePipes, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

import { WebSocketNotificationData } from "../types/common.types";
import { RedisService } from "../redis/redis.service";

export interface JoinRoomData {
  room: string;
}

export interface NotificationPayload {
  type:
    | "try_on_complete"
    | "try_on_progress"
    | "recommendation"
    | "price_drop"
    | "customization_update"
    | "system"
    | "subscription"
    | "social"
    | "order";
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(",").filter(Boolean) || (process.env.NODE_ENV === "production" ? [] : ["http://localhost:3000"]),
    credentials: true,
  },
  namespace: "/ws",
})
@UsePipes(new ValidationPipe())
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSocketMap = new Map<string, Set<string>>();

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const userId = this.extractUserId(client);
      if (!userId) {
        client.disconnect();
        return;
      }

      client.data.userId = userId;

      if (!this.userSocketMap.has(userId)) {
        this.userSocketMap.set(userId, new Set());
      }
      this.userSocketMap.get(userId)!.add(client.id);

      await client.join(`user:${userId}`);

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);

      const pendingNotifications = await this.getPendingNotifications(userId);
      if (pendingNotifications.length > 0) {
        pendingNotifications.forEach((notification) => {
          client.emit("notification", notification);
        });
        await this.clearPendingNotifications(userId);
      }
    } catch (error) {
      this.logger.error(`Connection error: ${this.getErrorMessage(error)}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const userSockets = this.userSocketMap.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.userSocketMap.delete(userId);
        }
      }
      this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);
    }
  }

  @SubscribeMessage("joinRoom")
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomData,
  ) {
    client.join(data.room);
    this.logger.log(`Client ${client.id} joined room: ${data.room}`);
    client.emit("joinedRoom", { room: data.room });
  }

  @SubscribeMessage("leaveRoom")
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomData,
  ) {
    client.leave(data.room);
    this.logger.log(`Client ${client.id} left room: ${data.room}`);
  }

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit("pong", { timestamp: Date.now() });
  }

  async sendToUser(userId: string, event: string, data: unknown): Promise<boolean> {
    if (!this.userSocketMap.has(userId)) {
      await this.storePendingNotification(userId, {
        type: "system",
        title: "新消息",
        message: "您有新的通知",
        data: { event, payload: data },
      });
      return false;
    }

    this.server.to(`user:${userId}`).emit(event, data);
    return true;
  }

  async sendNotification(
    userId: string,
    notification: NotificationPayload,
  ): Promise<boolean> {
    return this.sendToUser(userId, "notification", {
      ...notification,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastToAll(event: string, data: unknown) {
    this.server.emit(event, data);
  }

  broadcastToRoom(room: string, event: string, data: unknown) {
    this.server.to(room).emit(event, data);
  }

  isUserOnline(userId: string): boolean {
    return this.userSocketMap.has(userId);
  }

  getOnlineUserCount(): number {
    return this.userSocketMap.size;
  }

  private extractUserId(client: Socket): string | null {
    const auth = client.handshake.auth;
    const query = client.handshake.query;

    const token = auth?.token || query?.token;
    if (!token) {
      return null;
    }

    return this.validateToken(token as string);
  }

  private validateToken(token: string): string | null {
    try {
      const jwtSecret = this.configService.get<string>("JWT_SECRET");
      if (!jwtSecret) {
        this.logger.error("JWT_SECRET is not configured");
        return null;
      }

      const payload = this.jwtService.verify(token, {
        secret: jwtSecret,
      });

      const userId = payload.sub || payload.userId;
      if (!userId) {
        this.logger.warn("Token payload missing user identifier");
        return null;
      }

      return userId;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Token validation failed: ${errorMessage}`);
      return null;
    }
  }

  private async getPendingNotifications(
    userId: string,
  ): Promise<NotificationPayload[]> {
    try {
      const key = `pending_notifications:${userId}`;
      const data = await this.redisService.get(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      this.logger.error(
        `Failed to get pending notifications for user ${userId}: ${this.getErrorMessage(error)}. User may miss pending notifications.`,
      );
      return [];
    }
  }

  private async storePendingNotification(
    userId: string,
    notification: NotificationPayload,
  ) {
    try {
      const key = `pending_notifications:${userId}`;
      const existing = await this.getPendingNotifications(userId);
      existing.push(notification);
      await this.redisService.setex(
        key,
        86400,
        JSON.stringify(existing.slice(-50)),
      );
    } catch (error) {
      this.logger.error(
        `Failed to store pending notification: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private async clearPendingNotifications(userId: string) {
    try {
      const key = `pending_notifications:${userId}`;
      await this.redisService.del(key);
    } catch (error) {
      this.logger.error(
        `Failed to clear pending notifications: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown error";
  }
}

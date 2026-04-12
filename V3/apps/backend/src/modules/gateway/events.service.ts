import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private server!: Server;

  setServer(server: Server): void {
    this.server = server;
    this.logger.log('WebSocket server instance registered');
  }

  sendToUser(userId: string, event: string, data: unknown): void {
    if (!this.server) {
      this.logger.warn('Cannot send to user: server not initialized');
      return;
    }
    this.server.to(`user:${userId}`).emit(event, data);
  }

  sendToRoom(roomId: string, event: string, data: unknown): void {
    if (!this.server) {
      this.logger.warn('Cannot send to room: server not initialized');
      return;
    }
    this.server.to(roomId).emit(event, data);
  }

  broadcast(event: string, data: unknown): void {
    if (!this.server) {
      this.logger.warn('Cannot broadcast: server not initialized');
      return;
    }
    this.server.emit(event, data);
  }

  getOnlineUsers(): string[] {
    if (!this.server) {
      return [];
    }
    const userIds = new Set<string>();
    const sockets = this.server.sockets.sockets;
    sockets.forEach((socket) => {
      const user = socket.data.user as { id: string } | undefined;
      if (user?.id) {
        userIds.add(user.id);
      }
    });
    return Array.from(userIds);
  }

  isUserOnline(userId: string): boolean {
    if (!this.server) {
      return false;
    }
    const room = this.server.sockets.adapter.rooms.get(`user:${userId}`);
    return room !== undefined && room.size > 0;
  }
}

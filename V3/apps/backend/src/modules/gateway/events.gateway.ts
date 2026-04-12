import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { WsAuthGuard } from './ws-auth.guard';
import { EventsService } from './events.service';
import { JoinRoomDto, LeaveRoomDto, SendMessageDto, TypingDto } from './dto/events.dto';

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:3000', methods: ['GET', 'POST'] },
  pingInterval: 25000,
  pingTimeout: 20000,
})
@UseGuards(WsAuthGuard)
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly eventsService: EventsService) {}

  afterInit(): void {
    this.eventsService.setServer(this.server);
    this.logger.log('WebSocket gateway initialized');
  }

  handleConnection(client: Socket): void {
    const user = client.data.user as { id: string; role: string } | undefined;
    if (!user?.id) {
      this.logger.warn(`Disconnecting unauthenticated client ${client.id}`);
      client.disconnect(true);
      return;
    }

    client.join(`user:${user.id}`);
    this.logger.log(`Client ${client.id} connected for user ${user.id}`);
  }

  handleDisconnect(client: Socket): void {
    const user = client.data.user as { id: string } | undefined;
    if (user?.id) {
      this.logger.log(`Client ${client.id} disconnected for user ${user.id}`);
    }
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomDto,
  ): void {
    client.join(payload.roomId);
    this.logger.log(`User ${this.getUserId(client)} joined room ${payload.roomId}`);
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LeaveRoomDto,
  ): void {
    client.leave(payload.roomId);
    this.logger.log(`User ${this.getUserId(client)} left room ${payload.roomId}`);
  }

  @SubscribeMessage('send_message')
  handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageDto,
  ): void {
    const userId = this.getUserId(client);
    this.eventsService.sendToRoom(payload.roomId, 'new_message', {
      roomId: payload.roomId,
      messageId: '',
      senderId: userId,
      content: payload.content,
      messageType: payload.messageType,
      createdAt: new Date().toISOString(),
    });
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TypingDto,
  ): void {
    const userId = this.getUserId(client);
    client.to(payload.roomId).emit('typing_indicator', {
      roomId: payload.roomId,
      userId,
    });
  }

  private getUserId(client: Socket): string {
    const user = client.data.user as { id: string } | undefined;
    return user?.id ?? 'unknown';
  }
}

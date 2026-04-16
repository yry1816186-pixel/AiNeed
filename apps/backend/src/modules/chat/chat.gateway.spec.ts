import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../common/prisma/prisma.service';
import { CHAT_EVENTS } from '../ws/events';
import { EventBusService } from '../ws/services/event-bus.service';

import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { SenderTypeDto, MessageTypeDto } from './dto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockSocket(overrides: any = {}): any {
  const rooms = new Set<string>();
  return {
    id: `socket-${Math.random().toString(36).slice(2, 9)}`,
    handshake: { auth: {} },
    emit: jest.fn(),
    disconnect: jest.fn(),
    join: jest.fn().mockImplementation((room: string) => {
      rooms.add(room);
      return Promise.resolve();
    }),
    leave: jest.fn().mockImplementation((room: string) => {
      rooms.delete(room);
      return Promise.resolve();
    }),
    ...overrides,
  };
}

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let chatService: ChatService;
  let eventBus: EventBusService;
  let jwtService: JwtService;
  let prisma: PrismaService;

  const mockRedis = {
    publish: jest.fn().mockResolvedValue(1),
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') {return 'test-jwt-secret';}
              if (key === 'REDIS_URL') {return 'redis://localhost:6379';}
              return null;
            }),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
        {
          provide: EventBusService,
          useValue: {
            on: jest.fn(),
            off: jest.fn(),
            publish: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ChatService,
          useValue: {
            getRoomById: jest.fn(),
            sendMessage: jest.fn(),
            markAsRead: jest.fn(),
            isConsultant: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            chatRoom: {
              findUnique: jest.fn(),
            },
          },
        },
        EventEmitter2,
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    chatService = module.get<ChatService>(ChatService);
    eventBus = module.get<EventBusService>(EventBusService);
    jwtService = module.get<JwtService>(JwtService);
    prisma = module.get<PrismaService>(PrismaService);

    // Mock server
    gateway.server = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should disconnect client without token', async () => {
      const client = createMockSocket();

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Authentication required' });
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should connect client with valid token', async () => {
      const userId = 'user-123';
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: userId });

      const client = createMockSocket({
        handshake: { auth: { token: 'valid-token' } },
      });

      await gateway.handleConnection(client);

      expect(client.join).toHaveBeenCalledWith(`chat:user:${userId}`);
      expect(client.emit).toHaveBeenCalledWith('connected', expect.objectContaining({
        message: 'Connected to chat events',
        userId,
      }));
      expect(gateway.isUserOnline(userId)).toBe(true);
    });

    it('should disconnect client with invalid token', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const client = createMockSocket({
        handshake: { auth: { token: 'invalid-token' } },
      });

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleJoinRoom', () => {
    it('should reject join when user has no access to room', async () => {
      const userId = 'user-123';
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: userId });
      (chatService.getRoomById as jest.Mock).mockRejectedValue(new Error('Forbidden'));

      const client = createMockSocket({
        handshake: { auth: { token: 'valid-token' } },
      });

      // First connect the client
      await gateway.handleConnection(client);

      await gateway.handleJoinRoom(client, { roomId: 'room-no-access' });

      expect(client.emit).toHaveBeenCalledWith('error', { message: '无权访问此聊天室' });
    });

    it('should allow join when user has access to room', async () => {
      const userId = 'user-123';
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: userId });
      (chatService.getRoomById as jest.Mock).mockResolvedValue({ id: 'room-1' });

      const client = createMockSocket({
        handshake: { auth: { token: 'valid-token' } },
      });

      await gateway.handleConnection(client);

      await gateway.handleJoinRoom(client, { roomId: 'room-1' });

      expect(client.join).toHaveBeenCalledWith('chat:room:room-1');
      expect(client.emit).toHaveBeenCalledWith('chat:joined', { roomId: 'room-1' });
    });
  });

  describe('handleMessage', () => {
    it('should send message and publish event', async () => {
      const userId = 'user-123';
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: userId });
      (chatService.isConsultant as jest.Mock).mockResolvedValue(false);
      (prisma.chatRoom.findUnique as jest.Mock).mockResolvedValue({
        id: 'room-1',
        consultantId: 'consultant-1',
      });
      (chatService.sendMessage as jest.Mock).mockResolvedValue({ id: 'msg-1' });

      const client = createMockSocket({
        handshake: { auth: { token: 'valid-token' } },
      });

      await gateway.handleConnection(client);

      await gateway.handleMessage(client, {
        roomId: 'room-1',
        content: 'Hello',
        messageType: 'text',
      });

      expect(chatService.sendMessage).toHaveBeenCalledWith(userId, expect.objectContaining({
        roomId: 'room-1',
        senderType: SenderTypeDto.USER,
        content: 'Hello',
        messageType: MessageTypeDto.TEXT,
      }));

      expect(eventBus.publish).toHaveBeenCalledWith(
        CHAT_EVENTS.MESSAGE_CREATED,
        userId,
        expect.objectContaining({
          roomId: 'room-1',
          messageId: 'msg-1',
          senderType: SenderTypeDto.USER,
        }),
      );
    });

    it('should emit error when message send fails', async () => {
      const userId = 'user-123';
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: userId });
      (prisma.chatRoom.findUnique as jest.Mock).mockResolvedValue(null);

      const client = createMockSocket({
        handshake: { auth: { token: 'valid-token' } },
      });

      await gateway.handleConnection(client);

      await gateway.handleMessage(client, {
        roomId: 'room-nonexistent',
        content: 'Hello',
        messageType: 'text',
      });

      expect(client.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.stringContaining('消息发送失败'),
      }));
    });
  });

  describe('handleTyping', () => {
    it('should broadcast typing state to room', async () => {
      const userId = 'user-123';
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: userId });
      (chatService.isConsultant as jest.Mock).mockResolvedValue(false);
      (prisma.chatRoom.findUnique as jest.Mock).mockResolvedValue({
        id: 'room-1',
        consultantId: 'consultant-1',
      });

      const client = createMockSocket({
        handshake: { auth: { token: 'valid-token' } },
      });

      await gateway.handleConnection(client);

      const mockTo = { emit: jest.fn() };
      (gateway.server.to as jest.Mock).mockReturnValue(mockTo);

      await gateway.handleTyping(client, {
        roomId: 'room-1',
        isTyping: true,
      });

      expect(gateway.server.to).toHaveBeenCalledWith('chat:room:room-1');
      expect(mockTo.emit).toHaveBeenCalledWith('chat:typing', expect.objectContaining({
        roomId: 'room-1',
        senderId: userId,
        senderType: SenderTypeDto.USER,
        isTyping: true,
      }));
    });
  });

  describe('handleRead', () => {
    it('should call markAsRead and publish event', async () => {
      const userId = 'user-123';
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: userId });
      (chatService.markAsRead as jest.Mock).mockResolvedValue({ markedCount: 3 });

      const client = createMockSocket({
        handshake: { auth: { token: 'valid-token' } },
      });

      await gateway.handleConnection(client);

      await gateway.handleRead(client, {
        roomId: 'room-1',
        lastMessageId: 'msg-5',
      });

      expect(chatService.markAsRead).toHaveBeenCalledWith(userId, 'room-1', {
        lastMessageId: 'msg-5',
      });

      expect(eventBus.publish).toHaveBeenCalledWith(
        CHAT_EVENTS.MESSAGE_READ,
        userId,
        expect.objectContaining({
          roomId: 'room-1',
          readerId: userId,
          lastMessageId: 'msg-5',
        }),
      );
    });

    it('should silently fail when markAsRead throws', async () => {
      const userId = 'user-123';
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: userId });
      (chatService.markAsRead as jest.Mock).mockRejectedValue(new Error('DB error'));

      const client = createMockSocket({
        handshake: { auth: { token: 'valid-token' } },
      });

      await gateway.handleConnection(client);

      // Should not throw
      await expect(
        gateway.handleRead(client, { roomId: 'room-1' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('handleDisconnect', () => {
    it('should clean up user connection on disconnect', async () => {
      const userId = 'user-123';
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: userId });

      const client = createMockSocket({
        handshake: { auth: { token: 'valid-token' } },
      });

      await gateway.handleConnection(client);
      expect(gateway.isUserOnline(userId)).toBe(true);

      await gateway.handleDisconnect(client);
      expect(gateway.isUserOnline(userId)).toBe(false);
    });
  });
});

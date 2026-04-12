import { Test, TestingModule } from '@nestjs/testing';
import { MessagingController } from '../messaging.controller';
import { MessagingService } from '../messaging.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

const MOCK_USER_ID = 'user-001';
const MOCK_ROOM_ID = 'room-001';
const MOCK_MESSAGE_ID = 'msg-001';

function createMockMessagingService() {
  return {
    getRooms: jest.fn(),
    createRoom: jest.fn(),
    getMessages: jest.fn(),
    sendMessage: jest.fn(),
    markRead: jest.fn(),
    getUnreadCount: jest.fn(),
  };
}

// ---------- tests ----------

describe('MessagingController', () => {
  let controller: MessagingController;
  let mockService: ReturnType<typeof createMockMessagingService>;

  beforeEach(async () => {
    mockService = createMockMessagingService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagingController],
      providers: [
        {
          provide: MessagingService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<MessagingController>(MessagingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================================================
  // getRooms
  // ============================================================
  describe('getRooms', () => {
    it('should call service.getRooms with userId', async () => {
      const rooms = [
        {
          id: MOCK_ROOM_ID,
          createdAt: '2025-01-01T00:00:00.000Z',
          participants: [],
          lastMessage: null,
          unreadCount: 0,
        },
      ];
      mockService.getRooms.mockResolvedValue(rooms);

      const result = await controller.getRooms(MOCK_USER_ID);

      expect(result).toEqual(rooms);
      expect(mockService.getRooms).toHaveBeenCalledWith(MOCK_USER_ID);
    });

    it('should return empty array when no rooms', async () => {
      mockService.getRooms.mockResolvedValue([]);

      const result = await controller.getRooms(MOCK_USER_ID);

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // createRoom
  // ============================================================
  describe('createRoom', () => {
    const dto = { userId: 'user-002' };

    it('should call service.createRoom with userId and dto', async () => {
      const room = {
        id: MOCK_ROOM_ID,
        createdAt: '2025-01-01T00:00:00.000Z',
        participants: [],
        lastMessage: null,
        unreadCount: 0,
      };
      mockService.createRoom.mockResolvedValue(room);

      const result = await controller.createRoom(MOCK_USER_ID, dto);

      expect(result).toEqual(room);
      expect(mockService.createRoom).toHaveBeenCalledWith(MOCK_USER_ID, dto);
    });
  });

  // ============================================================
  // getMessages
  // ============================================================
  describe('getMessages', () => {
    it('should call service.getMessages with userId, roomId, and query', async () => {
      const query = { page: 1, limit: 20 };
      const response = {
        data: [
          {
            id: MOCK_MESSAGE_ID,
            roomId: MOCK_ROOM_ID,
            senderId: MOCK_USER_ID,
            content: 'Hello!',
            messageType: 'text',
            isRead: false,
            createdAt: '2025-01-02T10:00:00.000Z',
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockService.getMessages.mockResolvedValue(response);

      const result = await controller.getMessages(
        MOCK_USER_ID,
        MOCK_ROOM_ID,
        query,
      );

      expect(result).toEqual(response);
      expect(mockService.getMessages).toHaveBeenCalledWith(
        MOCK_USER_ID,
        MOCK_ROOM_ID,
        query,
      );
    });

    it('should pass cursor parameter to service', async () => {
      const query = { cursor: 'some-cursor-id' };
      mockService.getMessages.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      await controller.getMessages(MOCK_USER_ID, MOCK_ROOM_ID, query);

      expect(mockService.getMessages).toHaveBeenCalledWith(
        MOCK_USER_ID,
        MOCK_ROOM_ID,
        query,
      );
    });

    it('should pass empty query when no params provided', async () => {
      mockService.getMessages.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      await controller.getMessages(MOCK_USER_ID, MOCK_ROOM_ID, {});

      expect(mockService.getMessages).toHaveBeenCalledWith(
        MOCK_USER_ID,
        MOCK_ROOM_ID,
        {},
      );
    });
  });

  // ============================================================
  // sendMessage
  // ============================================================
  describe('sendMessage', () => {
    const dto = { content: 'Hello!' };

    it('should call service.sendMessage with userId, roomId, and dto', async () => {
      const message = {
        id: MOCK_MESSAGE_ID,
        roomId: MOCK_ROOM_ID,
        senderId: MOCK_USER_ID,
        content: 'Hello!',
        messageType: 'text',
        isRead: false,
        createdAt: '2025-01-02T10:00:00.000Z',
      };
      mockService.sendMessage.mockResolvedValue(message);

      const result = await controller.sendMessage(
        MOCK_USER_ID,
        MOCK_ROOM_ID,
        dto,
      );

      expect(result).toEqual(message);
      expect(mockService.sendMessage).toHaveBeenCalledWith(
        MOCK_USER_ID,
        MOCK_ROOM_ID,
        dto,
      );
    });

    it('should pass image messageType through to service', async () => {
      const imageDto = { content: 'https://img.png', messageType: 'image' as const };
      const message = {
        id: MOCK_MESSAGE_ID,
        roomId: MOCK_ROOM_ID,
        senderId: MOCK_USER_ID,
        content: 'https://img.png',
        messageType: 'image',
        isRead: false,
        createdAt: '2025-01-02T10:00:00.000Z',
      };
      mockService.sendMessage.mockResolvedValue(message);

      const result = await controller.sendMessage(
        MOCK_USER_ID,
        MOCK_ROOM_ID,
        imageDto,
      );

      expect(result.messageType).toBe('image');
      expect(mockService.sendMessage).toHaveBeenCalledWith(
        MOCK_USER_ID,
        MOCK_ROOM_ID,
        imageDto,
      );
    });
  });

  // ============================================================
  // markRead
  // ============================================================
  describe('markRead', () => {
    it('should call service.markRead with userId and messageId', async () => {
      mockService.markRead.mockResolvedValue({ markedCount: 1 });

      const result = await controller.markRead(MOCK_USER_ID, MOCK_MESSAGE_ID);

      expect(result).toEqual({ markedCount: 1 });
      expect(mockService.markRead).toHaveBeenCalledWith(
        MOCK_USER_ID,
        MOCK_MESSAGE_ID,
      );
    });

    it('should return markedCount 0 when already read', async () => {
      mockService.markRead.mockResolvedValue({ markedCount: 0 });

      const result = await controller.markRead(MOCK_USER_ID, MOCK_MESSAGE_ID);

      expect(result.markedCount).toBe(0);
    });
  });

  // ============================================================
  // getUnreadCount
  // ============================================================
  describe('getUnreadCount', () => {
    it('should call service.getUnreadCount with userId', async () => {
      mockService.getUnreadCount.mockResolvedValue({ total: 5 });

      const result = await controller.getUnreadCount(MOCK_USER_ID);

      expect(result).toEqual({ total: 5 });
      expect(mockService.getUnreadCount).toHaveBeenCalledWith(MOCK_USER_ID);
    });

    it('should return 0 when no unread messages', async () => {
      mockService.getUnreadCount.mockResolvedValue({ total: 0 });

      const result = await controller.getUnreadCount(MOCK_USER_ID);

      expect(result.total).toBe(0);
    });
  });
});

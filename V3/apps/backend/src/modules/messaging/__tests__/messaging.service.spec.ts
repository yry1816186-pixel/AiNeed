import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  HttpException,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MessagingService } from '../messaging.service';

const MOCK_USER_ID = 'user-001';
const MOCK_OTHER_USER_ID = 'user-002';
const MOCK_ROOM_ID = 'room-001';
const MOCK_MESSAGE_ID = 'msg-001';

// ---------- factory helpers ----------

function createMockPrisma(overrides: Record<string, unknown> = {}) {
  return {
    chatRoomParticipant: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    chatRoom: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    directMessage: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    user: {
      findUnique: jest.fn(),
    },
    ...overrides,
  };
}

function makeParticipant(overrides: Record<string, unknown> = {}) {
  return {
    roomId: MOCK_ROOM_ID,
    userId: MOCK_USER_ID,
    joinedAt: new Date('2025-01-01'),
    user: {
      id: MOCK_USER_ID,
      nickname: 'TestUser',
      avatarUrl: 'https://example.com/avatar.png',
    },
    ...overrides,
  };
}

function makeRoom(overrides: Record<string, unknown> = {}) {
  return {
    id: MOCK_ROOM_ID,
    createdAt: new Date('2025-01-01'),
    participants: [
      makeParticipant(),
      makeParticipant({
        userId: MOCK_OTHER_USER_ID,
        user: {
          id: MOCK_OTHER_USER_ID,
          nickname: 'OtherUser',
          avatarUrl: 'https://example.com/avatar2.png',
        },
      }),
    ],
    messages: [],
    ...overrides,
  };
}

function makeMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: MOCK_MESSAGE_ID,
    roomId: MOCK_ROOM_ID,
    senderId: MOCK_USER_ID,
    content: 'Hello there!',
    messageType: 'text',
    isRead: false,
    createdAt: new Date('2025-01-02T10:00:00Z'),
    ...overrides,
  };
}

// ---------- tests ----------

describe('MessagingService', () => {
  let service: MessagingService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
  });

  // ============================================================
  // getRooms
  // ============================================================
  describe('getRooms', () => {
    it('should return empty array when user has no rooms', async () => {
      mockPrisma.chatRoomParticipant.findMany.mockResolvedValue([]);

      const result = await service.getRooms(MOCK_USER_ID);

      expect(result).toEqual([]);
      expect(mockPrisma.chatRoomParticipant.findMany).toHaveBeenCalledWith({
        where: { userId: MOCK_USER_ID },
        select: { roomId: true },
      });
    });

    it('should return rooms with participants, last message, and unread count', async () => {
      const message = makeMessage();
      const room = makeRoom({ messages: [message] });

      mockPrisma.chatRoomParticipant.findMany.mockResolvedValue([
        { roomId: MOCK_ROOM_ID },
      ]);
      mockPrisma.chatRoom.findMany.mockResolvedValue([room]);
      mockPrisma.directMessage.groupBy.mockResolvedValue([{ roomId: MOCK_ROOM_ID, _count: { id: 2 } }]);

      const result = await service.getRooms(MOCK_USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(MOCK_ROOM_ID);
      expect(result[0].participants).toHaveLength(2);
      expect(result[0].unreadCount).toBe(2);
      expect(result[0].lastMessage).not.toBeNull();
      expect(result[0].lastMessage!.id).toBe(MOCK_MESSAGE_ID);
      expect(result[0].lastMessage!.content).toBe('Hello there!');
    });

    it('should return room with null lastMessage when no messages exist', async () => {
      const room = makeRoom({ messages: [] });

      mockPrisma.chatRoomParticipant.findMany.mockResolvedValue([
        { roomId: MOCK_ROOM_ID },
      ]);
      mockPrisma.chatRoom.findMany.mockResolvedValue([room]);
      mockPrisma.directMessage.groupBy.mockResolvedValue([]);

      const result = await service.getRooms(MOCK_USER_ID);

      expect(result[0].lastMessage).toBeNull();
      expect(result[0].unreadCount).toBe(0);
    });

    it('should handle participant with null nickname', async () => {
      const room = makeRoom({
        participants: [
          makeParticipant({ user: { id: MOCK_USER_ID, nickname: null, avatarUrl: null } }),
        ],
      });

      mockPrisma.chatRoomParticipant.findMany.mockResolvedValue([
        { roomId: MOCK_ROOM_ID },
      ]);
      mockPrisma.chatRoom.findMany.mockResolvedValue([room]);
      mockPrisma.directMessage.count.mockResolvedValue(0);

      const result = await service.getRooms(MOCK_USER_ID);

      expect(result[0].participants[0].nickname).toBe('');
      expect(result[0].participants[0].avatarUrl).toBeNull();
    });

    it('should sort rooms by lastMessage createdAt descending', async () => {
      const roomA = makeRoom({
        id: 'room-a',
        createdAt: new Date('2025-01-01'),
        messages: [makeMessage({ createdAt: new Date('2025-01-03T10:00:00Z') })],
      });
      const roomB = makeRoom({
        id: 'room-b',
        createdAt: new Date('2025-01-02'),
        messages: [makeMessage({ createdAt: new Date('2025-01-05T10:00:00Z') })],
      });

      mockPrisma.chatRoomParticipant.findMany.mockResolvedValue([
        { roomId: 'room-a' },
        { roomId: 'room-b' },
      ]);
      mockPrisma.chatRoom.findMany.mockResolvedValue([roomA, roomB]);
      mockPrisma.directMessage.count.mockResolvedValue(0);

      const result = await service.getRooms(MOCK_USER_ID);

      // room-b has the more recent lastMessage so it should come first
      expect(result[0].id).toBe('room-b');
      expect(result[1].id).toBe('room-a');
    });

    it('should sort rooms with no messages by createdAt descending', async () => {
      const roomA = makeRoom({
        id: 'room-a',
        createdAt: new Date('2025-01-01'),
        messages: [],
      });
      const roomB = makeRoom({
        id: 'room-b',
        createdAt: new Date('2025-01-05'),
        messages: [],
      });

      mockPrisma.chatRoomParticipant.findMany.mockResolvedValue([
        { roomId: 'room-a' },
        { roomId: 'room-b' },
      ]);
      mockPrisma.chatRoom.findMany.mockResolvedValue([roomA, roomB]);
      mockPrisma.directMessage.count.mockResolvedValue(0);

      const result = await service.getRooms(MOCK_USER_ID);

      expect(result[0].id).toBe('room-b');
      expect(result[1].id).toBe('room-a');
    });

    it('should count unread messages only from other users', async () => {
      const room = makeRoom();

      mockPrisma.chatRoomParticipant.findMany.mockResolvedValue([
        { roomId: MOCK_ROOM_ID },
      ]);
      mockPrisma.chatRoom.findMany.mockResolvedValue([room]);
      mockPrisma.directMessage.groupBy.mockResolvedValue([{ roomId: MOCK_ROOM_ID, _count: { id: 5 } }]);

      await service.getRooms(MOCK_USER_ID);

      expect(mockPrisma.directMessage.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['roomId'],
          where: expect.objectContaining({
            roomId: { in: [MOCK_ROOM_ID] },
            senderId: { not: MOCK_USER_ID },
            isRead: false,
          }),
        }),
      );
    });

    it('should return multiple rooms with correct data', async () => {
      const roomA = makeRoom({
        id: 'room-a',
        messages: [makeMessage({ id: 'msg-a', roomId: 'room-a' })],
      });
      const roomB = makeRoom({
        id: 'room-b',
        messages: [makeMessage({ id: 'msg-b', roomId: 'room-b' })],
      });

      mockPrisma.chatRoomParticipant.findMany.mockResolvedValue([
        { roomId: 'room-a' },
        { roomId: 'room-b' },
      ]);
      mockPrisma.chatRoom.findMany.mockResolvedValue([roomA, roomB]);
      mockPrisma.directMessage.groupBy.mockResolvedValue([
        { roomId: 'room-a', _count: { id: 3 } },
        { roomId: 'room-b', _count: { id: 1 } },
      ]);

      const result = await service.getRooms(MOCK_USER_ID);

      expect(result).toHaveLength(2);
      expect(result[0].unreadCount).toBe(3);
      expect(result[1].unreadCount).toBe(1);
    });
  });

  // ============================================================
  // createRoom
  // ============================================================
  describe('createRoom', () => {
    const dto = { userId: MOCK_OTHER_USER_ID };

    it('should throw HttpException when creating room with self', async () => {
      await expect(
        service.createRoom(MOCK_USER_ID, { userId: MOCK_USER_ID }),
      ).rejects.toThrow(HttpException);

      await expect(
        service.createRoom(MOCK_USER_ID, { userId: MOCK_USER_ID }),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
      });
    });

    it('should throw NotFoundException when target user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createRoom(MOCK_USER_ID, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return existing room when one already exists between users (findFirst match)', async () => {
      const existingRoom = makeRoom();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: MOCK_OTHER_USER_ID,
        nickname: 'OtherUser',
      });
      mockPrisma.chatRoomParticipant.findMany.mockResolvedValue([{ roomId: MOCK_ROOM_ID }]);
      mockPrisma.chatRoomParticipant.findFirst.mockResolvedValue({ roomId: MOCK_ROOM_ID, userId: MOCK_OTHER_USER_ID });
      mockPrisma.chatRoom.findUnique.mockResolvedValue(existingRoom);
      mockPrisma.directMessage.count.mockResolvedValue(0);

      const result = await service.createRoom(MOCK_USER_ID, dto);

      expect(result.id).toBe(MOCK_ROOM_ID);
      expect(mockPrisma.chatRoom.create).not.toHaveBeenCalled();
    });

    it('should return existing room when found via allUserRooms loop', async () => {
      const existingRoom = makeRoom();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: MOCK_OTHER_USER_ID,
        nickname: 'OtherUser',
      });
      mockPrisma.chatRoomParticipant.findMany.mockResolvedValue([
        { roomId: 'room-old' },
        { roomId: MOCK_ROOM_ID },
      ]);
      mockPrisma.chatRoomParticipant.findFirst.mockResolvedValue({ roomId: MOCK_ROOM_ID, userId: MOCK_OTHER_USER_ID });
      mockPrisma.chatRoom.findUnique.mockResolvedValue(existingRoom);
      mockPrisma.directMessage.count.mockResolvedValue(0);

      const result = await service.createRoom(MOCK_USER_ID, dto);

      expect(result.id).toBe(MOCK_ROOM_ID);
      expect(mockPrisma.chatRoom.create).not.toHaveBeenCalled();
    });

    it('should create a new room when no existing room found', async () => {
      const newRoom = makeRoom({ messages: [] });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: MOCK_OTHER_USER_ID,
        nickname: 'OtherUser',
      });
      mockPrisma.chatRoomParticipant.findMany.mockResolvedValue([]);
      mockPrisma.chatRoomParticipant.findFirst.mockResolvedValue(null);
      mockPrisma.chatRoom.create.mockResolvedValue(newRoom);

      const result = await service.createRoom(MOCK_USER_ID, dto);

      expect(result.id).toBe(MOCK_ROOM_ID);
      expect(result.lastMessage).toBeNull();
      expect(result.unreadCount).toBe(0);
      expect(result.participants).toHaveLength(2);
      expect(mockPrisma.chatRoom.create).toHaveBeenCalledWith({
        data: {
          participants: {
            create: [
              { userId: MOCK_USER_ID },
              { userId: MOCK_OTHER_USER_ID },
            ],
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
    });

    it('should create room and handle participant with null nickname', async () => {
      const newRoom = makeRoom({
        participants: [
          makeParticipant({
            user: { id: MOCK_USER_ID, nickname: null, avatarUrl: null },
          }),
          makeParticipant({
            userId: MOCK_OTHER_USER_ID,
            user: { id: MOCK_OTHER_USER_ID, nickname: null, avatarUrl: 'https://example.com/a.png' },
          }),
        ],
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: MOCK_OTHER_USER_ID,
        nickname: null,
      });
      mockPrisma.chatRoomParticipant.findFirst.mockResolvedValue(null);
      mockPrisma.chatRoomParticipant.findMany.mockResolvedValue([]);
      mockPrisma.chatRoom.create.mockResolvedValue(newRoom);

      const result = await service.createRoom(MOCK_USER_ID, dto);

      expect(result.participants[0].nickname).toBe('');
      expect(result.participants[0].avatarUrl).toBeNull();
    });

    it('should throw NotFoundException in getRoomDetail when room is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: MOCK_OTHER_USER_ID,
        nickname: 'OtherUser',
      });
      mockPrisma.chatRoomParticipant.findMany.mockResolvedValue([{ roomId: MOCK_ROOM_ID }]);
      mockPrisma.chatRoomParticipant.findFirst.mockResolvedValue({ roomId: MOCK_ROOM_ID, userId: MOCK_OTHER_USER_ID });
      mockPrisma.chatRoom.findUnique.mockResolvedValue(null);

      await expect(
        service.createRoom(MOCK_USER_ID, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return room with lastMessage from getRoomDetail', async () => {
      const message = makeMessage();
      const existingRoom = makeRoom({ messages: [message] });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: MOCK_OTHER_USER_ID,
        nickname: 'OtherUser',
      });
      mockPrisma.chatRoomParticipant.findMany.mockResolvedValue([{ roomId: MOCK_ROOM_ID }]);
      mockPrisma.chatRoomParticipant.findFirst.mockResolvedValue({ roomId: MOCK_ROOM_ID, userId: MOCK_OTHER_USER_ID });
      mockPrisma.chatRoom.findUnique.mockResolvedValue(existingRoom);
      mockPrisma.directMessage.count.mockResolvedValue(3);

      const result = await service.createRoom(MOCK_USER_ID, dto);

      expect(result.lastMessage).not.toBeNull();
      expect(result.lastMessage!.content).toBe('Hello there!');
      expect(result.unreadCount).toBe(3);
    });
  });

  // ============================================================
  // getMessages
  // ============================================================
  describe('getMessages', () => {
    it('should throw ForbiddenException when user is not a participant', async () => {
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue(null);

      await expect(
        service.getMessages(MOCK_USER_ID, MOCK_ROOM_ID, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return paginated messages with default page and limit', async () => {
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
        userId: MOCK_USER_ID,
      });
      const messages = [
        makeMessage({ id: 'msg-2', createdAt: new Date('2025-01-02T12:00:00Z') }),
        makeMessage({ createdAt: new Date('2025-01-02T10:00:00Z') }),
      ];
      mockPrisma.directMessage.count.mockResolvedValue(2);
      mockPrisma.directMessage.findMany.mockResolvedValue(messages);

      const result = await service.getMessages(MOCK_USER_ID, MOCK_ROOM_ID, {});

      expect(result.data).toHaveLength(2);
      // messages are reversed, so msg-1 should come first
      expect(result.data[0].id).toBe(MOCK_MESSAGE_ID);
      expect(result.data[1].id).toBe('msg-2');
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should use provided page and limit', async () => {
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
        userId: MOCK_USER_ID,
      });
      mockPrisma.directMessage.count.mockResolvedValue(50);
      mockPrisma.directMessage.findMany.mockResolvedValue([]);

      const result = await service.getMessages(MOCK_USER_ID, MOCK_ROOM_ID, {
        page: 2,
        limit: 10,
      });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(5);
      expect(mockPrisma.directMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page 2 - 1) * limit 10
          take: 10,
        }),
      );
    });

    it('should use cursor-based pagination when cursor is provided', async () => {
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
        userId: MOCK_USER_ID,
      });
      mockPrisma.directMessage.findUnique.mockResolvedValue({
        createdAt: new Date('2025-01-02T09:00:00Z'),
      });
      mockPrisma.directMessage.count.mockResolvedValue(10);
      mockPrisma.directMessage.findMany.mockResolvedValue([]);

      await service.getMessages(MOCK_USER_ID, MOCK_ROOM_ID, {
        cursor: 'cursor-msg-id',
      });

      expect(mockPrisma.directMessage.findUnique).toHaveBeenCalledWith({
        where: { id: 'cursor-msg-id' },
        select: { createdAt: true },
      });
      expect(mockPrisma.directMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0, // cursor mode skips 0
          where: expect.objectContaining({
            createdAt: { lt: new Date('2025-01-02T09:00:00Z') },
          }),
        }),
      );
    });

    it('should ignore cursor when cursor message is not found', async () => {
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
        userId: MOCK_USER_ID,
      });
      mockPrisma.directMessage.findUnique.mockResolvedValue(null);
      mockPrisma.directMessage.count.mockResolvedValue(5);
      mockPrisma.directMessage.findMany.mockResolvedValue([]);

      await service.getMessages(MOCK_USER_ID, MOCK_ROOM_ID, {
        cursor: 'non-existent-cursor',
        page: 1,
        limit: 20,
      });

      // No createdAt filter should be applied since cursor was not found
      expect(mockPrisma.directMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { roomId: MOCK_ROOM_ID },
        }),
      );
    });

    it('should reverse messages for chronological order', async () => {
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
        userId: MOCK_USER_ID,
      });
      const msgOld = makeMessage({
        id: 'msg-old',
        createdAt: new Date('2025-01-02T08:00:00Z'),
      });
      const msgNew = makeMessage({
        id: 'msg-new',
        createdAt: new Date('2025-01-02T12:00:00Z'),
      });
      // findMany returns in desc order (newest first)
      mockPrisma.directMessage.count.mockResolvedValue(2);
      mockPrisma.directMessage.findMany.mockResolvedValue([msgNew, msgOld]);

      const result = await service.getMessages(MOCK_USER_ID, MOCK_ROOM_ID, {});

      // After reverse, oldest should be first
      expect(result.data[0].id).toBe('msg-old');
      expect(result.data[1].id).toBe('msg-new');
    });

    it('should map message fields correctly', async () => {
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
        userId: MOCK_USER_ID,
      });
      mockPrisma.directMessage.count.mockResolvedValue(1);
      mockPrisma.directMessage.findMany.mockResolvedValue([makeMessage()]);

      const result = await service.getMessages(MOCK_USER_ID, MOCK_ROOM_ID, {});

      const msg = result.data[0];
      expect(msg.id).toBe(MOCK_MESSAGE_ID);
      expect(msg.roomId).toBe(MOCK_ROOM_ID);
      expect(msg.senderId).toBe(MOCK_USER_ID);
      expect(msg.content).toBe('Hello there!');
      expect(msg.messageType).toBe('text');
      expect(msg.isRead).toBe(false);
      expect(typeof msg.createdAt).toBe('string');
    });

    it('should calculate totalPages correctly with rounding up', async () => {
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
        userId: MOCK_USER_ID,
      });
      mockPrisma.directMessage.count.mockResolvedValue(25);
      mockPrisma.directMessage.findMany.mockResolvedValue([]);

      const result = await service.getMessages(MOCK_USER_ID, MOCK_ROOM_ID, {
        limit: 10,
      });

      expect(result.meta.totalPages).toBe(3); // ceil(25/10)
    });

    it('should handle empty messages', async () => {
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
        userId: MOCK_USER_ID,
      });
      mockPrisma.directMessage.count.mockResolvedValue(0);
      mockPrisma.directMessage.findMany.mockResolvedValue([]);

      const result = await service.getMessages(MOCK_USER_ID, MOCK_ROOM_ID, {});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should verify room access before fetching messages', async () => {
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue(null);

      await expect(
        service.getMessages(MOCK_USER_ID, MOCK_ROOM_ID, {}),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.chatRoomParticipant.findUnique).toHaveBeenCalledWith({
        where: { roomId_userId: { roomId: MOCK_ROOM_ID, userId: MOCK_USER_ID } },
      });
    });
  });

  // ============================================================
  // sendMessage
  // ============================================================
  describe('sendMessage', () => {
    const dto = { content: 'Hello!' };

    it('should throw ForbiddenException when user is not a participant', async () => {
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue(null);

      await expect(
        service.sendMessage(MOCK_USER_ID, MOCK_ROOM_ID, dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create and return a message with default type text', async () => {
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
        userId: MOCK_USER_ID,
      });
      const created = makeMessage({ content: 'Hello!', messageType: 'text' });
      mockPrisma.directMessage.create.mockResolvedValue(created);

      const result = await service.sendMessage(MOCK_USER_ID, MOCK_ROOM_ID, dto);

      expect(result.id).toBe(MOCK_MESSAGE_ID);
      expect(result.roomId).toBe(MOCK_ROOM_ID);
      expect(result.senderId).toBe(MOCK_USER_ID);
      expect(result.content).toBe('Hello!');
      expect(result.messageType).toBe('text');
      expect(result.isRead).toBe(false);
      expect(typeof result.createdAt).toBe('string');
      expect(mockPrisma.directMessage.create).toHaveBeenCalledWith({
        data: {
          roomId: MOCK_ROOM_ID,
          senderId: MOCK_USER_ID,
          content: 'Hello!',
          messageType: 'text',
        },
      });
    });

    it('should create message with image type when specified', async () => {
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
        userId: MOCK_USER_ID,
      });
      const imageDto = { content: 'https://example.com/image.png', messageType: 'image' as const };
      const created = makeMessage({
        content: imageDto.content,
        messageType: 'image',
      });
      mockPrisma.directMessage.create.mockResolvedValue(created);

      const result = await service.sendMessage(MOCK_USER_ID, MOCK_ROOM_ID, imageDto);

      expect(result.messageType).toBe('image');
      expect(mockPrisma.directMessage.create).toHaveBeenCalledWith({
        data: {
          roomId: MOCK_ROOM_ID,
          senderId: MOCK_USER_ID,
          content: imageDto.content,
          messageType: 'image',
        },
      });
    });

    it('should verify room access before sending', async () => {
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue(null);

      await expect(
        service.sendMessage('intruder', MOCK_ROOM_ID, dto),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.directMessage.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // markRead
  // ============================================================
  describe('markRead', () => {
    it('should throw NotFoundException when message does not exist', async () => {
      mockPrisma.directMessage.findUnique.mockResolvedValue(null);

      await expect(
        service.markRead(MOCK_USER_ID, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not in the room', async () => {
      mockPrisma.directMessage.findUnique.mockResolvedValue(
        makeMessage({ roomId: MOCK_ROOM_ID }),
      );
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue(null);

      await expect(
        service.markRead(MOCK_USER_ID, MOCK_MESSAGE_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return markedCount 0 when user is the sender', async () => {
      const ownMessage = makeMessage({ senderId: MOCK_USER_ID });
      mockPrisma.directMessage.findUnique.mockResolvedValue(ownMessage);
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
        userId: MOCK_USER_ID,
      });

      const result = await service.markRead(MOCK_USER_ID, MOCK_MESSAGE_ID);

      expect(result.markedCount).toBe(0);
      expect(mockPrisma.directMessage.update).not.toHaveBeenCalled();
    });

    it('should return markedCount 0 when message is already read', async () => {
      const readMessage = makeMessage({
        senderId: MOCK_OTHER_USER_ID,
        isRead: true,
      });
      mockPrisma.directMessage.findUnique.mockResolvedValue(readMessage);
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
        userId: MOCK_USER_ID,
      });

      const result = await service.markRead(MOCK_USER_ID, MOCK_MESSAGE_ID);

      expect(result.markedCount).toBe(0);
      expect(mockPrisma.directMessage.update).not.toHaveBeenCalled();
    });

    it('should mark unread message as read and return markedCount 1', async () => {
      const unreadMessage = makeMessage({
        senderId: MOCK_OTHER_USER_ID,
        isRead: false,
      });
      mockPrisma.directMessage.findUnique.mockResolvedValue(unreadMessage);
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
        userId: MOCK_USER_ID,
      });
      mockPrisma.directMessage.update.mockResolvedValue({
        ...unreadMessage,
        isRead: true,
      });

      const result = await service.markRead(MOCK_USER_ID, MOCK_MESSAGE_ID);

      expect(result.markedCount).toBe(1);
      expect(mockPrisma.directMessage.update).toHaveBeenCalledWith({
        where: { id: MOCK_MESSAGE_ID },
        data: { isRead: true },
      });
    });

    it('should verify room access before marking as read', async () => {
      mockPrisma.directMessage.findUnique.mockResolvedValue(makeMessage());
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue(null);

      await expect(
        service.markRead(MOCK_USER_ID, MOCK_MESSAGE_ID),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.chatRoomParticipant.findUnique).toHaveBeenCalledWith({
        where: {
          roomId_userId: { roomId: MOCK_ROOM_ID, userId: MOCK_USER_ID },
        },
      });
    });
  });

  // ============================================================
  // getUnreadCount
  // ============================================================
  describe('getUnreadCount', () => {
    it('should return 0 when user has no rooms', async () => {
      mockPrisma.chatRoomParticipant.findMany.mockResolvedValue([]);

      const result = await service.getUnreadCount(MOCK_USER_ID);

      expect(result.total).toBe(0);
      expect(mockPrisma.directMessage.count).not.toHaveBeenCalled();
    });

    it('should return total unread count across all rooms', async () => {
      mockPrisma.chatRoomParticipant.findMany.mockResolvedValue([
        { roomId: 'room-1' },
        { roomId: 'room-2' },
      ]);
      mockPrisma.directMessage.count.mockResolvedValue(7);

      const result = await service.getUnreadCount(MOCK_USER_ID);

      expect(result.total).toBe(7);
      expect(mockPrisma.directMessage.count).toHaveBeenCalledWith({
        where: {
          roomId: { in: ['room-1', 'room-2'] },
          senderId: { not: MOCK_USER_ID },
          isRead: false,
        },
      });
    });

    it('should count only messages from other users that are unread', async () => {
      mockPrisma.chatRoomParticipant.findMany.mockResolvedValue([
        { roomId: MOCK_ROOM_ID },
      ]);
      mockPrisma.directMessage.count.mockResolvedValue(3);

      const result = await service.getUnreadCount(MOCK_USER_ID);

      expect(result.total).toBe(3);
      expect(mockPrisma.directMessage.count).toHaveBeenCalledWith({
        where: {
          roomId: { in: [MOCK_ROOM_ID] },
          senderId: { not: MOCK_USER_ID },
          isRead: false,
        },
      });
    });

    it('should return 0 when no unread messages exist', async () => {
      mockPrisma.chatRoomParticipant.findMany.mockResolvedValue([
        { roomId: MOCK_ROOM_ID },
      ]);
      mockPrisma.directMessage.count.mockResolvedValue(0);

      const result = await service.getUnreadCount(MOCK_USER_ID);

      expect(result.total).toBe(0);
    });
  });
});

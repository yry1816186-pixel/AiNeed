import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationService } from '../notification.service';
import { PrismaService } from '../../../prisma/prisma.service';

const USER_ID = 'user-001';
const NOTIFICATION_ID = 'notif-001';

const mockNotification = {
  id: NOTIFICATION_ID,
  userId: USER_ID,
  type: 'like',
  title: '有人赞了你的帖子',
  content: '用户小明赞了你的帖子',
  referenceId: 'ref-001',
  referenceType: 'post',
  isRead: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const prismaMockFactory = () => ({
  notification: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
});

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: ReturnType<typeof prismaMockFactory>;

  beforeEach(async () => {
    prisma = prismaMockFactory();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      prisma.notification.create.mockResolvedValue(mockNotification);

      const result = await service.createNotification(
        USER_ID,
        'like',
        '有人赞了你的帖子',
        '用户小明赞了你的帖子',
        'ref-001',
        'post',
      );

      expect(result).toEqual({
        id: NOTIFICATION_ID,
        userId: USER_ID,
        type: 'like',
        title: '有人赞了你的帖子',
        content: '用户小明赞了你的帖子',
        referenceId: 'ref-001',
        referenceType: 'post',
        isRead: false,
        createdAt: mockNotification.createdAt.toISOString(),
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: USER_ID,
          type: 'like',
          title: '有人赞了你的帖子',
          content: '用户小明赞了你的帖子',
          referenceId: 'ref-001',
          referenceType: 'post',
        },
      });
    });

    it('should create notification without optional fields', async () => {
      const minimalNotification = {
        ...mockNotification,
        content: null,
        referenceId: null,
        referenceType: null,
      };
      prisma.notification.create.mockResolvedValue(minimalNotification);

      const result = await service.createNotification(
        USER_ID,
        'system',
        '系统通知',
      );

      expect(result.content).toBeNull();
      expect(result.referenceId).toBeNull();
      expect(result.referenceType).toBeNull();

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: USER_ID,
          type: 'system',
          title: '系统通知',
          content: null,
          referenceId: null,
          referenceType: null,
        },
      });
    });

    it('should propagate database errors', async () => {
      prisma.notification.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.createNotification(USER_ID, 'like', 'Test'),
      ).rejects.toThrow('Database error');
    });
  });

  describe('findAll', () => {
    it('should return paginated notifications', async () => {
      prisma.notification.findMany.mockResolvedValue([mockNotification]);
      prisma.notification.count.mockResolvedValue(1);

      const result = await service.findAll(USER_ID, 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe(NOTIFICATION_ID);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should enforce minimum page of 1', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      const result = await service.findAll(USER_ID, -1, 20);

      expect(result.meta.page).toBe(1);
    });

    it('should enforce maximum limit of 100', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      const result = await service.findAll(USER_ID, 1, 200);

      expect(result.meta.limit).toBe(100);
    });

    it('should order by createdAt descending', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.findAll(USER_ID, 1, 20);

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should calculate totalPages correctly', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(25);

      const result = await service.findAll(USER_ID, 1, 20);

      expect(result.meta.totalPages).toBe(2);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      prisma.notification.findUnique.mockResolvedValue(mockNotification);
      prisma.notification.update.mockResolvedValue({
        ...mockNotification,
        isRead: true,
      });

      const result = await service.markAsRead(USER_ID, NOTIFICATION_ID);

      expect(result).toEqual({ success: true });
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: NOTIFICATION_ID },
        data: { isRead: true },
      });
    });

    it('should throw NotFoundException if notification does not exist', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);

      await expect(
        service.markAsRead(USER_ID, NOTIFICATION_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if notification belongs to another user', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        ...mockNotification,
        userId: 'other-user',
      });

      await expect(
        service.markAsRead(USER_ID, NOTIFICATION_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead(USER_ID);

      expect(result).toEqual({ success: true });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: USER_ID, isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      prisma.notification.count.mockResolvedValue(3);

      const result = await service.getUnreadCount(USER_ID);

      expect(result).toEqual({ count: 3 });
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: USER_ID, isRead: false },
      });
    });

    it('should return 0 when no unread notifications', async () => {
      prisma.notification.count.mockResolvedValue(0);

      const result = await service.getUnreadCount(USER_ID);

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('remove', () => {
    it('should delete a notification', async () => {
      prisma.notification.findUnique.mockResolvedValue(mockNotification);
      prisma.notification.delete.mockResolvedValue(mockNotification);

      const result = await service.remove(USER_ID, NOTIFICATION_ID);

      expect(result).toEqual({ success: true });
      expect(prisma.notification.delete).toHaveBeenCalledWith({
        where: { id: NOTIFICATION_ID },
      });
    });

    it('should throw NotFoundException if notification does not exist', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);

      await expect(
        service.remove(USER_ID, NOTIFICATION_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if notification belongs to another user', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        ...mockNotification,
        userId: 'other-user',
      });

      await expect(
        service.remove(USER_ID, NOTIFICATION_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

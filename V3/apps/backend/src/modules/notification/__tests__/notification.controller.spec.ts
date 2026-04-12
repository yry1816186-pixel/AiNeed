import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationController } from '../notification.controller';
import { NotificationService } from '../notification.service';

const USER_ID = 'user-001';
const NOTIFICATION_ID = 'notif-001';

const mockNotificationService = {
  findAll: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  getUnreadCount: jest.fn(),
  remove: jest.fn(),
};

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    service = module.get<NotificationService>(NotificationService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should call service.findAll with default pagination', async () => {
      const expectedResult = {
        items: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };

      mockNotificationService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(USER_ID);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(USER_ID, undefined, undefined);
    });

    it('should pass query parameters to service', async () => {
      const expectedResult = {
        items: [],
        meta: { total: 0, page: 2, limit: 10, totalPages: 0 },
      };

      mockNotificationService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(USER_ID, 2, 10);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(USER_ID, 2, 10);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockNotificationService.getUnreadCount.mockResolvedValue({ count: 5 });

      const result = await controller.getUnreadCount(USER_ID);

      expect(result).toEqual({ count: 5 });
      expect(service.getUnreadCount).toHaveBeenCalledWith(USER_ID);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all as read', async () => {
      mockNotificationService.markAllAsRead.mockResolvedValue({ success: true });

      const result = await controller.markAllAsRead(USER_ID);

      expect(result).toEqual({ success: true });
      expect(service.markAllAsRead).toHaveBeenCalledWith(USER_ID);
    });
  });

  describe('markAsRead', () => {
    it('should mark a single notification as read', async () => {
      mockNotificationService.markAsRead.mockResolvedValue({ success: true });

      const result = await controller.markAsRead(USER_ID, NOTIFICATION_ID);

      expect(result).toEqual({ success: true });
      expect(service.markAsRead).toHaveBeenCalledWith(USER_ID, NOTIFICATION_ID);
    });

    it('should propagate NotFoundException from service', async () => {
      mockNotificationService.markAsRead.mockRejectedValue(
        new NotFoundException('Notification not found'),
      );

      await expect(
        controller.markAsRead(USER_ID, NOTIFICATION_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a notification', async () => {
      mockNotificationService.remove.mockResolvedValue({ success: true });

      const result = await controller.remove(USER_ID, NOTIFICATION_ID);

      expect(result).toEqual({ success: true });
      expect(service.remove).toHaveBeenCalledWith(USER_ID, NOTIFICATION_ID);
    });

    it('should propagate NotFoundException from service', async () => {
      mockNotificationService.remove.mockRejectedValue(
        new NotFoundException('Notification not found'),
      );

      await expect(
        controller.remove(USER_ID, NOTIFICATION_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

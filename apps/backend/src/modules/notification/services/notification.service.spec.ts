import { Test, TestingModule } from "@nestjs/testing";

import { NotificationService as WebSocketNotificationService } from "../../../common/gateway/notification.service";
import { PrismaService } from "../../../common/prisma/prisma.service";

import {
  NotificationService,
  CreateNotificationDto,
} from "./notification.service";
import { PushNotificationService } from "./push-notification.service";
import { NotificationTemplateService } from "./notification-template.service";

describe("NotificationService", () => {
  let service: NotificationService;
  let prisma: PrismaService;

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    userNotificationSetting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockWebSocketNotificationService = {
    sendCustomNotification: jest.fn().mockResolvedValue(undefined),
  };

  const mockPushNotificationService = {
    sendToUser: jest.fn().mockResolvedValue(undefined),
  };

  const mockNotificationTemplateService = {
    render: jest.fn().mockReturnValue(null),
  };

  const mockNotification = {
    id: "notification-id",
    userId: "user-id",
    type: "system_update" as any,
    title: "Test Notification",
    content: "This is a test notification",
    isRead: false,
    readAt: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: WebSocketNotificationService,
          useValue: mockWebSocketNotificationService,
        },
        {
          provide: PushNotificationService,
          useValue: mockPushNotificationService,
        },
        {
          provide: NotificationTemplateService,
          useValue: mockNotificationTemplateService,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("send", () => {
    const createDto: CreateNotificationDto = {
      type: "system_update" as any,
      title: "Test Notification",
      content: "This is a test notification",
    };

    it("应该成功创建通知", async () => {
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      const result = await service.send("user-id", createDto);

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: {
          userId: "user-id",
          ...createDto,
        },
      });
    });
  });

  describe("sendBatch", () => {
    const createDto: CreateNotificationDto = {
      type: "system_update" as any,
      title: "Batch Notification",
      content: "This is a batch notification",
    };

    it("应该批量创建通知", async () => {
      const userIds = ["user-1", "user-2", "user-3"];
      mockPrismaService.notification.createMany.mockResolvedValue({ count: 3 });

      const result = await service.sendBatch(userIds, createDto);

      expect(result.count).toBe(3);
      expect(mockPrismaService.notification.createMany).toHaveBeenCalledWith({
        data: userIds.map((userId) => ({
          userId,
          ...createDto,
        })),
      });
    });
  });

  describe("getUserNotifications", () => {
    it("应该获取用户通知列表", async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([
        mockNotification,
      ]);
      mockPrismaService.notification.count.mockResolvedValue(5);

      const result = await service.getUserNotifications("user-id");

      expect(result.notifications).toHaveLength(1);
      expect(result.unreadCount).toBe(5);
      expect(result.hasMore).toBe(false);
    });

    it("应该只获取未读通知", async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([
        mockNotification,
      ]);
      mockPrismaService.notification.count.mockResolvedValue(5);

      await service.getUserNotifications("user-id", { unreadOnly: true });

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-id", isRead: false },
        }),
      );
    });

    it("应该支持分页", async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([
        mockNotification,
      ]);
      mockPrismaService.notification.count.mockResolvedValue(0);

      await service.getUserNotifications("user-id", { limit: 10, offset: 20 });

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });
  });

  describe("markAsRead", () => {
    it("应该标记通知为已读", async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 1 });

      await service.markAsRead("user-id", "notification-id");

      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { id: "notification-id", userId: "user-id" },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });
  });

  describe("markAllAsRead", () => {
    it("应该标记所有通知为已读", async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead("user-id");

      expect(result.count).toBe(5);
      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-id", isRead: false },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });
  });

  describe("delete", () => {
    it("应该删除通知", async () => {
      mockPrismaService.notification.deleteMany.mockResolvedValue({ count: 1 });

      await service.delete("user-id", "notification-id");

      expect(mockPrismaService.notification.deleteMany).toHaveBeenCalledWith({
        where: { id: "notification-id", userId: "user-id" },
      });
    });
  });

  describe("getUserSettings", () => {
    it("应该获取用户通知设置", async () => {
      const mockSettings = {
        id: "settings-id",
        userId: "user-id",
        email: { marketing: true, transactional: true },
        push: { order: true, recommendation: true, community: true, system: true, quietHoursEnabled: false, quietHoursStart: "22:00", quietHoursEnd: "08:00" },
        inApp: { all: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.userNotificationSetting.findUnique.mockResolvedValue(
        mockSettings,
      );

      const result = await service.getUserSettings("user-id");

      expect(result).toEqual(mockSettings);
    });

    it("应该返回默认设置如果用户没有设置", async () => {
      mockPrismaService.userNotificationSetting.findUnique.mockResolvedValue(
        null,
      );

      const result = await service.getUserSettings("user-id");

      expect(result?.userId).toBe("user-id");
      expect((result?.email as any)?.marketing).toBe(true);
    });
  });

  describe("updateUserSettings", () => {
    it("应该更新用户通知设置", async () => {
      const mockSettings = {
        id: "settings-id",
        userId: "user-id",
        email: { marketing: false, transactional: true },
        push: { order: true, recommendation: true, community: true, system: true, quietHoursEnabled: false, quietHoursStart: "22:00", quietHoursEnd: "08:00" },
        inApp: { all: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.userNotificationSetting.upsert.mockResolvedValue(
        mockSettings,
      );

      const result = await service.updateUserSettings("user-id", {
        email: { marketing: false, transactional: true },
      });

      expect((result.email as any).marketing).toBe(false);
    });
  });

  describe("cleanupOldNotifications", () => {
    it("应该清理过期通知", async () => {
      mockPrismaService.notification.deleteMany.mockResolvedValue({
        count: 10,
      });

      const result = await service.cleanupOldNotifications(90);

      expect(result.count).toBe(10);
      expect(mockPrismaService.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: expect.any(Object),
          isRead: true,
        },
      });
    });
  });

  describe("sendToUser 别名方法", () => {
    it("应该调用 send 方法", async () => {
      const createDto: CreateNotificationDto = {
        type: "system_update" as any,
        title: "Test",
        content: "Content",
      };
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      const result = await service.sendToUser("user-id", createDto);

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: {
          userId: "user-id",
          ...createDto,
        },
      });
    });
  });

  describe("WebSocket 推送", () => {
    it("应该成功通过 WebSocket 推送通知", async () => {
      const createDto: CreateNotificationDto = {
        type: "try_on_completed" as any,
        title: "试衣完成",
        content: "您的虚拟试衣已完成",
      };
      mockPrismaService.notification.create.mockResolvedValue({
        ...mockNotification,
        type: "try_on_completed",
      });

      await service.send("user-id", createDto);

      expect(mockWebSocketNotificationService.sendCustomNotification).toHaveBeenCalledWith(
        "user-id",
        expect.objectContaining({
          type: "try_on_complete",
          title: "试衣完成",
          message: "您的虚拟试衣已完成",
        }),
      );
    });

    it("应该在 WebSocket 推送失败时静默处理", async () => {
      const createDto: CreateNotificationDto = {
        type: "system_update" as any,
        title: "Test",
        content: "Content",
      };
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockWebSocketNotificationService.sendCustomNotification.mockRejectedValue(
        new Error("WebSocket connection failed"),
      );

      // 不应该抛出异常
      const result = await service.send("user-id", createDto);

      expect(result).toEqual(mockNotification);
    });

    it("应该正确映射各种通知类型", async () => {
      const typeMappings = [
        { db: "subscription_activated", ws: "subscription" },
        { db: "subscription_expiring", ws: "subscription" },
        { db: "renewal_failed", ws: "subscription" },
        { db: "try_on_completed", ws: "try_on_complete" },
        { db: "try_on_failed", ws: "try_on_complete" },
        { db: "daily_recommendation", ws: "recommendation" },
        { db: "price_drop", ws: "price_drop" },
        { db: "new_follower", ws: "social" },
        { db: "comment", ws: "social" },
        { db: "like", ws: "social" },
        { db: "system_update", ws: "system" },
        { db: "privacy_reminder", ws: "system" },
      ];

      for (const mapping of typeMappings) {
        mockPrismaService.notification.create.mockResolvedValue({
          ...mockNotification,
          type: mapping.db as any,
        });
        mockWebSocketNotificationService.sendCustomNotification.mockClear();

        await service.send("user-id", {
          type: mapping.db as any,
          title: "Test",
          content: "Content",
        });

        expect(mockWebSocketNotificationService.sendCustomNotification).toHaveBeenCalledWith(
          "user-id",
          expect.objectContaining({
            type: mapping.ws,
          }),
        );
      }
    });
  });

  describe("通知数据完整性", () => {
    it("应该包含目标信息", async () => {
      const createDto: CreateNotificationDto = {
        type: "try_on_completed" as any,
        title: "试衣完成",
        content: "内容",
        targetType: "clothing",
        targetId: "clothing-123",
      };
      mockPrismaService.notification.create.mockResolvedValue({
        ...mockNotification,
        targetType: "clothing",
        targetId: "clothing-123",
      });

      await service.send("user-id", createDto);

      expect(mockWebSocketNotificationService.sendCustomNotification).toHaveBeenCalledWith(
        "user-id",
        expect.objectContaining({
          data: expect.objectContaining({
            targetType: "clothing",
            targetId: "clothing-123",
          }),
        }),
      );
    });
  });

  describe("批量操作", () => {
    it("应该处理大批量通知发送", async () => {
      const userIds = Array.from({ length: 100 }, (_, i) => `user-${i}`);
      mockPrismaService.notification.createMany.mockResolvedValue({ count: 100 });

      const result = await service.sendBatch(userIds, {
        type: "system_update" as any,
        title: "系统公告",
        content: "重要通知",
      });

      expect(result.count).toBe(100);
      expect(mockPrismaService.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: "user-0" }),
          expect.objectContaining({ userId: "user-99" }),
        ]),
      });
    });

    it("应该处理空用户列表", async () => {
      mockPrismaService.notification.createMany.mockResolvedValue({ count: 0 });

      const result = await service.sendBatch([], {
        type: "system_update" as any,
        title: "Test",
        content: "Content",
      });

      expect(result.count).toBe(0);
    });
  });

  describe("分页和过滤", () => {
    it("应该正确计算 hasMore", async () => {
      // 返回等于 limit 的数量，表示有更多
      mockPrismaService.notification.findMany.mockResolvedValue(
        Array.from({ length: 20 }, (_, i) => ({
          ...mockNotification,
          id: `notification-${i}`,
        })),
      );
      mockPrismaService.notification.count.mockResolvedValue(50);

      const result = await service.getUserNotifications("user-id", { limit: 20 });

      expect(result.hasMore).toBe(true);
    });

    it("应该正确处理最后一页", async () => {
      // 返回少于 limit 的数量，表示没有更多
      mockPrismaService.notification.findMany.mockResolvedValue([
        mockNotification,
      ]);
      mockPrismaService.notification.count.mockResolvedValue(1);

      const result = await service.getUserNotifications("user-id", { limit: 20 });

      expect(result.hasMore).toBe(false);
    });

    it("应该正确计算未读计数", async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.notification.count.mockResolvedValue(15);

      const result = await service.getUserNotifications("user-id");

      expect(result.unreadCount).toBe(15);
    });
  });

  describe("设置管理", () => {
    it("应该创建新的用户设置", async () => {
      const newSettings = {
        id: "new-settings-id",
        userId: "new-user",
        email: { marketing: true, transactional: true },
        push: { order: true, recommendation: true, community: true, system: true, quietHoursEnabled: false, quietHoursStart: "22:00", quietHoursEnd: "08:00" },
        inApp: { all: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.userNotificationSetting.upsert.mockResolvedValue(newSettings);

      const result = await service.updateUserSettings("new-user", {
        email: { marketing: true, transactional: true },
      });

      expect(result.userId).toBe("new-user");
    });

    it("应该部分更新设置", async () => {
      const updatedSettings = {
        id: "settings-id",
        userId: "user-id",
        email: { marketing: false, transactional: true },
        push: { order: true, recommendation: true, community: true, system: true, quietHoursEnabled: false, quietHoursStart: "22:00", quietHoursEnd: "08:00" },
        inApp: { all: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.userNotificationSetting.upsert.mockResolvedValue(updatedSettings);

      const result = await service.updateUserSettings("user-id", {
        email: { marketing: false, transactional: true },
      });

      expect((result.email as any).marketing).toBe(false);
      expect((result.push as any).recommendation).toBe(true);
    });
  });

  describe("清理操作", () => {
    it("应该使用自定义保留天数", async () => {
      mockPrismaService.notification.deleteMany.mockResolvedValue({ count: 5 });

      await service.cleanupOldNotifications(30);

      expect(mockPrismaService.notification.deleteMany).toHaveBeenCalled();
    });

    it("应该只清理已读通知", async () => {
      mockPrismaService.notification.deleteMany.mockResolvedValue({ count: 10 });

      await service.cleanupOldNotifications(90);

      expect(mockPrismaService.notification.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isRead: true,
          }),
        }),
      );
    });
  });

  describe("边界条件", () => {
    it("应该处理无效的通知 ID", async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAsRead("user-id", "non-existent-id");

      expect(result.count).toBe(0);
    });

    it("应该处理用户没有未读通知", async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAllAsRead("user-id");

      expect(result.count).toBe(0);
    });

    it("应该处理删除不存在的通知", async () => {
      mockPrismaService.notification.deleteMany.mockResolvedValue({ count: 0 });

      await service.delete("user-id", "non-existent-id");

      expect(mockPrismaService.notification.deleteMany).toHaveBeenCalledWith({
        where: { id: "non-existent-id", userId: "user-id" },
      });
    });
  });
});

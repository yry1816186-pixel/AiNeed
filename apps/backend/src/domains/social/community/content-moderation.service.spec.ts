import { Test, TestingModule } from "@nestjs/testing";
import { Job } from "bullmq";

import { NotificationService as GatewayNotificationService } from "../../../common/gateway/notification.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AISafetyService } from "../../ai-core/ai-safety/ai-safety.service";

import { CONTENT_MODERATION_QUEUE, ContentModerationService } from "./content-moderation.service";

describe("ContentModerationService", () => {
  let service: ContentModerationService;
  let prismaService: jest.Mocked<PrismaService>;
  let aiSafetyService: jest.Mocked<AISafetyService>;
  let gatewayNotificationService: jest.Mocked<GatewayNotificationService>;
  let moderationQueue: { add: jest.Mock };

  const mockPrismaService = {
    communityPost: {
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    postComment: {
      findUnique: jest.fn(),
    },
    contentModerationLog: {
      create: jest.fn(),
    },
    contentReport: {
      count: jest.fn(),
    },
  };

  const mockAISafetyService = {
    quickCheck: jest.fn(),
    validateResponse: jest.fn(),
  };

  const mockGatewayNotificationService = {
    sendCustomNotification: jest.fn(),
  };

  const mockModerationQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentModerationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AISafetyService, useValue: mockAISafetyService },
        {
          provide: GatewayNotificationService,
          useValue: mockGatewayNotificationService,
        },
        {
          provide: `BullQueue_${CONTENT_MODERATION_QUEUE}`,
          useValue: mockModerationQueue,
        },
      ],
    }).compile();

    service = module.get<ContentModerationService>(ContentModerationService);
    prismaService = module.get(PrismaService);
    aiSafetyService = module.get(AISafetyService);
    gatewayNotificationService = module.get(GatewayNotificationService);
    moderationQueue = module.get(`BullQueue_${CONTENT_MODERATION_QUEUE}`);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("moderateContent", () => {
    const contentType = "post";
    const contentId = "post_123";
    const cleanContent = "今天天气真好，分享一下我的穿搭";

    it("干净内容应该自动通过审核", async () => {
      mockAISafetyService.quickCheck.mockResolvedValue(true);
      mockPrismaService.communityPost.update.mockResolvedValue({});
      mockPrismaService.contentModerationLog.create.mockResolvedValue({});

      await service.moderateContent(contentType, contentId, cleanContent);

      expect(mockPrismaService.communityPost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { moderationStatus: "approved" },
        }),
      );
      expect(mockPrismaService.contentModerationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "auto_pass",
          }),
        }),
      );
    });

    it("包含违禁关键词的内容应该被自动拦截", async () => {
      mockPrismaService.communityPost.update.mockResolvedValue({});
      mockPrismaService.contentModerationLog.create.mockResolvedValue({});

      await service.moderateContent(contentType, contentId, "这是一个赌博网站的广告");

      expect(mockPrismaService.communityPost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { moderationStatus: "pending" },
        }),
      );
      expect(mockPrismaService.contentModerationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "auto_block",
            reason: expect.stringContaining("违禁关键词"),
          }),
        }),
      );
    });

    it("AI quickCheck 未通过的内容应该被拦截", async () => {
      mockAISafetyService.quickCheck.mockResolvedValue(false);
      mockPrismaService.communityPost.update.mockResolvedValue({});
      mockPrismaService.contentModerationLog.create.mockResolvedValue({});

      await service.moderateContent(contentType, contentId, "可疑内容");

      expect(mockPrismaService.communityPost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { moderationStatus: "pending" },
        }),
      );
      expect(mockPrismaService.contentModerationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "auto_block",
            reason: expect.stringContaining("quickCheck"),
          }),
        }),
      );
    });

    it("通过的内容可能被随机抽样进行深度审核", async () => {
      mockAISafetyService.quickCheck.mockResolvedValue(true);
      mockPrismaService.communityPost.update.mockResolvedValue({});
      mockPrismaService.contentModerationLog.create.mockResolvedValue({});
      mockModerationQueue.add.mockResolvedValue({});

      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.05);

      await service.moderateContent(contentType, contentId, cleanContent, [
        "img1.jpg",
      ]);

      expect(mockModerationQueue.add).toHaveBeenCalledWith(
        "ai_deep_review",
        expect.objectContaining({
          contentType,
          contentId,
          content: cleanContent,
          images: ["img1.jpg"],
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
        }),
      );

      Math.random = originalRandom;
    });

    it("通过的内容不被抽样时不应该加入深度审核队列", async () => {
      mockAISafetyService.quickCheck.mockResolvedValue(true);
      mockPrismaService.communityPost.update.mockResolvedValue({});
      mockPrismaService.contentModerationLog.create.mockResolvedValue({});

      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.5);

      await service.moderateContent(contentType, contentId, cleanContent);

      expect(mockModerationQueue.add).not.toHaveBeenCalled();

      Math.random = originalRandom;
    });

    it("应该检测所有违禁关键词", async () => {
      mockPrismaService.communityPost.update.mockResolvedValue({});
      mockPrismaService.contentModerationLog.create.mockResolvedValue({});

      const bannedWords = ["色情", "毒品", "枪支", "诈骗", "传销"];
      for (const word of bannedWords) {
        await service.moderateContent(contentType, contentId, `包含${word}的内容`);

        expect(mockPrismaService.contentModerationLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              action: "auto_block",
            }),
          }),
        );

        jest.clearAllMocks();
        mockPrismaService.communityPost.update.mockResolvedValue({});
        mockPrismaService.contentModerationLog.create.mockResolvedValue({});
      }
    });
  });

  describe("processModerationQueue", () => {
    const mockJob = {
      id: "job_1",
      data: {
        contentType: "post",
        contentId: "post_123",
        content: "测试内容",
        images: [],
      },
    } as unknown as Job;

    it("AI 验证通过时应该记录日志", async () => {
      mockAISafetyService.validateResponse.mockResolvedValue({
        isValid: true,
        issues: [],
        confidenceScore: 0.95,
      });

      await service.processModerationQueue(mockJob);

      expect(mockPrismaService.communityPost.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: { moderationStatus: "rejected" },
        }),
      );
    });

    it("AI 验证未通过时应该拒绝内容", async () => {
      mockAISafetyService.validateResponse.mockResolvedValue({
        isValid: false,
        issues: [
          { type: "inappropriate", description: "内容不当" },
        ],
        confidenceScore: 0.9,
      });
      mockPrismaService.communityPost.update.mockResolvedValue({});
      mockPrismaService.contentModerationLog.create.mockResolvedValue({});

      await service.processModerationQueue(mockJob);

      expect(mockPrismaService.communityPost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { moderationStatus: "rejected" },
        }),
      );
      expect(mockPrismaService.contentModerationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "auto_block",
            reason: expect.stringContaining("AI深度审核"),
          }),
        }),
      );
    });

    it("AI 验证未通过且无具体问题时应该记录置信度", async () => {
      mockAISafetyService.validateResponse.mockResolvedValue({
        isValid: false,
        issues: [],
        confidenceScore: 0.75,
      });
      mockPrismaService.communityPost.update.mockResolvedValue({});
      mockPrismaService.contentModerationLog.create.mockResolvedValue({});

      await service.processModerationQueue(mockJob);

      expect(mockPrismaService.contentModerationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reason: expect.stringContaining("confidence"),
          }),
        }),
      );
    });
  });

  describe("manualReview", () => {
    const moderatorId = "moderator_1";
    const contentId = "post_123";
    const contentType = "post";

    it("审核通过时应该更新状态并通知作者", async () => {
      mockPrismaService.communityPost.update.mockResolvedValue({});
      mockPrismaService.contentModerationLog.create.mockResolvedValue({});
      mockPrismaService.communityPost.findUnique.mockResolvedValue({
        authorId: "author_1",
      });
      mockGatewayNotificationService.sendCustomNotification.mockResolvedValue(
        {},
      );

      await service.manualReview(
        moderatorId,
        contentId,
        contentType,
        "approve",
      );

      expect(mockPrismaService.communityPost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { moderationStatus: "approved" },
        }),
      );
      expect(mockPrismaService.contentModerationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "manual_approve",
            moderatorId,
          }),
        }),
      );
      expect(
        mockGatewayNotificationService.sendCustomNotification,
      ).toHaveBeenCalledWith(
        "author_1",
        expect.objectContaining({
          title: "内容审核通过",
        }),
      );
    });

    it("审核拒绝时应该更新状态并通知作者", async () => {
      mockPrismaService.communityPost.update.mockResolvedValue({});
      mockPrismaService.contentModerationLog.create.mockResolvedValue({});
      mockPrismaService.communityPost.findUnique.mockResolvedValue({
        authorId: "author_1",
      });
      mockGatewayNotificationService.sendCustomNotification.mockResolvedValue(
        {},
      );

      await service.manualReview(
        moderatorId,
        contentId,
        contentType,
        "reject",
        "内容不符合社区规范",
      );

      expect(mockPrismaService.communityPost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { moderationStatus: "rejected" },
        }),
      );
      expect(mockPrismaService.contentModerationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "manual_reject",
            reason: "内容不符合社区规范",
            moderatorId,
          }),
        }),
      );
      expect(
        mockGatewayNotificationService.sendCustomNotification,
      ).toHaveBeenCalledWith(
        "author_1",
        expect.objectContaining({
          title: "内容审核未通过",
        }),
      );
    });

    it("找不到作者时应该跳过通知", async () => {
      mockPrismaService.communityPost.update.mockResolvedValue({});
      mockPrismaService.contentModerationLog.create.mockResolvedValue({});
      mockPrismaService.communityPost.findUnique.mockResolvedValue(null);

      await service.manualReview(
        moderatorId,
        contentId,
        contentType,
        "approve",
      );

      expect(
        mockGatewayNotificationService.sendCustomNotification,
      ).not.toHaveBeenCalled();
    });

    it("审核拒绝时没有备注应该使用默认消息", async () => {
      mockPrismaService.communityPost.update.mockResolvedValue({});
      mockPrismaService.contentModerationLog.create.mockResolvedValue({});
      mockPrismaService.communityPost.findUnique.mockResolvedValue({
        authorId: "author_1",
      });
      mockGatewayNotificationService.sendCustomNotification.mockResolvedValue(
        {},
      );

      await service.manualReview(
        moderatorId,
        contentId,
        contentType,
        "reject",
      );

      expect(
        mockGatewayNotificationService.sendCustomNotification,
      ).toHaveBeenCalledWith(
        "author_1",
        expect.objectContaining({
          message: expect.stringContaining("修改后重新发布"),
        }),
      );
    });

    it("评论审核时应该查找评论作者", async () => {
      mockPrismaService.postComment.findUnique.mockResolvedValue({
        authorId: "comment_author_1",
      });
      mockPrismaService.communityPost.update.mockResolvedValue({});
      mockPrismaService.contentModerationLog.create.mockResolvedValue({});
      mockGatewayNotificationService.sendCustomNotification.mockResolvedValue(
        {},
      );

      await service.manualReview(
        moderatorId,
        "comment_123",
        "comment",
        "approve",
      );

      expect(mockPrismaService.postComment.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "comment_123" },
        }),
      );
    });
  });

  describe("getModerationQueue", () => {
    it("应该返回待审核内容列表", async () => {
      const mockPosts = [
        {
          id: "post_1",
          content: "待审核内容",
          moderationStatus: "pending",
          author: { id: "author_1", nickname: "用户A", avatar: null },
          _count: { likes: 5, comments: 2 },
        },
      ];
      mockPrismaService.communityPost.findMany.mockResolvedValue(mockPosts);
      mockPrismaService.communityPost.count.mockResolvedValue(1);

      const result = await service.getModerationQueue({ page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it("应该支持分页", async () => {
      mockPrismaService.communityPost.findMany.mockResolvedValue([]);
      mockPrismaService.communityPost.count.mockResolvedValue(50);

      const result = await service.getModerationQueue({ page: 2, pageSize: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.pageSize).toBe(10);
      expect(result.meta.totalPages).toBe(5);
    });

    it("待审核队列为空时应该返回空列表", async () => {
      mockPrismaService.communityPost.findMany.mockResolvedValue([]);
      mockPrismaService.communityPost.count.mockResolvedValue(0);

      const result = await service.getModerationQueue({});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe("handleReportThreshold", () => {
    const contentType = "post";
    const contentId = "post_123";

    it("举报数达到阈值时应该自动隐藏内容", async () => {
      mockPrismaService.contentReport.count.mockResolvedValue(3);
      mockPrismaService.communityPost.update.mockResolvedValue({});
      mockPrismaService.contentModerationLog.create.mockResolvedValue({});
      mockPrismaService.communityPost.findUnique.mockResolvedValue({
        content: "被举报的内容",
      });
      mockModerationQueue.add.mockResolvedValue({});

      await service.handleReportThreshold(contentType, contentId);

      expect(mockPrismaService.communityPost.update).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.contentModerationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "auto_block",
            reason: expect.stringContaining("report_threshold_reached"),
          }),
        }),
      );
    });

    it("举报数未达到阈值时不应该操作", async () => {
      mockPrismaService.contentReport.count.mockResolvedValue(2);

      await service.handleReportThreshold(contentType, contentId);

      expect(mockPrismaService.communityPost.update).not.toHaveBeenCalled();
      expect(mockPrismaService.contentModerationLog.create).not.toHaveBeenCalled();
    });

    it("达到阈值时应该加入深度审核队列", async () => {
      mockPrismaService.contentReport.count.mockResolvedValue(5);
      mockPrismaService.communityPost.update.mockResolvedValue({});
      mockPrismaService.contentModerationLog.create.mockResolvedValue({});
      mockPrismaService.communityPost.findUnique.mockResolvedValue({
        content: "被举报的内容",
      });
      mockModerationQueue.add.mockResolvedValue({});

      await service.handleReportThreshold(contentType, contentId);

      expect(mockModerationQueue.add).toHaveBeenCalledWith(
        "ai_deep_review",
        expect.objectContaining({
          contentType,
          contentId,
        }),
        expect.any(Object),
      );
    });

    it("内容不存在时不应该加入深度审核队列", async () => {
      mockPrismaService.contentReport.count.mockResolvedValue(3);
      mockPrismaService.communityPost.update.mockResolvedValue({});
      mockPrismaService.contentModerationLog.create.mockResolvedValue({});
      mockPrismaService.communityPost.findUnique.mockResolvedValue(null);

      await service.handleReportThreshold(contentType, contentId);

      expect(mockModerationQueue.add).not.toHaveBeenCalled();
    });
  });
});

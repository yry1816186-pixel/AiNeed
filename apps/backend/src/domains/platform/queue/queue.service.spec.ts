import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";

import { QueueService } from "./queue.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { QueueName } from "./queue-config";
import { JOB_STATUS } from "./queue.constants";

function createMockQueue() {
  return {
    add: jest.fn().mockResolvedValue({ id: "job-1" }),
    getJob: jest.fn().mockResolvedValue(null),
    getJobCounts: jest.fn().mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    }),
    getWaiting: jest.fn().mockResolvedValue([]),
    getActive: jest.fn().mockResolvedValue([]),
    getCompleted: jest.fn().mockResolvedValue([]),
    getFailed: jest.fn().mockResolvedValue([]),
  };
}

describe("QueueService", () => {
  let service: QueueService;
  let prisma: {
    userPhoto: { findFirst: jest.Mock };
    clothingItem: { findUnique: jest.Mock };
  };
  let styleAnalysisQueue: ReturnType<typeof createMockQueue>;
  let virtualTryOnQueue: ReturnType<typeof createMockQueue>;
  let aiTasksQueue: ReturnType<typeof createMockQueue>;
  let wardrobeMatchQueue: ReturnType<typeof createMockQueue>;
  let bodyAnalysisQueue: ReturnType<typeof createMockQueue>;
  let photoProcessingQueue: ReturnType<typeof createMockQueue>;
  let aiGenerationQueue: ReturnType<typeof createMockQueue>;
  let notificationQueue: ReturnType<typeof createMockQueue>;
  let dataExportQueue: ReturnType<typeof createMockQueue>;
  let contentModerationQueue: ReturnType<typeof createMockQueue>;

  const mockPhoto = { url: "https://cdn.example.com/photo.jpg" };
  const mockItem = {
    images: ["https://cdn.example.com/item.jpg"],
    mainImage: "https://cdn.example.com/item-main.jpg",
    category: "tops",
  };

  beforeEach(async () => {
    aiTasksQueue = createMockQueue();
    styleAnalysisQueue = createMockQueue();
    virtualTryOnQueue = createMockQueue();
    wardrobeMatchQueue = createMockQueue();
    bodyAnalysisQueue = createMockQueue();
    photoProcessingQueue = createMockQueue();
    aiGenerationQueue = createMockQueue();
    notificationQueue = createMockQueue();
    dataExportQueue = createMockQueue();
    contentModerationQueue = createMockQueue();

    prisma = {
      userPhoto: {
        findFirst: jest.fn().mockResolvedValue(mockPhoto),
      },
      clothingItem: {
        findUnique: jest.fn().mockResolvedValue(mockItem),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        { provide: PrismaService, useValue: prisma },
        { provide: `BullMQ_${QueueName.AI_TASKS}`, useValue: aiTasksQueue },
        { provide: `BullMQ_${QueueName.STYLE_ANALYSIS}`, useValue: styleAnalysisQueue },
        { provide: `BullMQ_${QueueName.VIRTUAL_TRYON}`, useValue: virtualTryOnQueue },
        { provide: `BullMQ_${QueueName.WARDROBE_MATCH}`, useValue: wardrobeMatchQueue },
        { provide: `BullMQ_${QueueName.BODY_ANALYSIS}`, useValue: bodyAnalysisQueue },
        { provide: `BullMQ_${QueueName.PHOTO_PROCESSING}`, useValue: photoProcessingQueue },
        { provide: `BullMQ_${QueueName.AI_GENERATION}`, useValue: aiGenerationQueue },
        { provide: `BullMQ_${QueueName.NOTIFICATION}`, useValue: notificationQueue },
        { provide: `BullMQ_${QueueName.DATA_EXPORT}`, useValue: dataExportQueue },
        { provide: `BullMQ_${QueueName.CONTENT_MODERATION}`, useValue: contentModerationQueue },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  describe("addStyleAnalysisTask", () => {
    it("should add job to styleAnalysisQueue and return task response", async () => {
      const result = await service.addStyleAnalysisTask(
        "user-1",
        "I prefer casual style",
        { bodyType: "slim", stylePreferences: ["casual"] },
      );

      expect(result.status).toBe(JOB_STATUS.PENDING);
      expect(result.estimatedWaitTime).toBe(10);
      expect(result.message).toBe("Style analysis task queued successfully");
      expect(result.jobId).toBeDefined();
      expect(styleAnalysisQueue.add).toHaveBeenCalledWith(
        "style-analysis",
        expect.objectContaining({
          userId: "user-1",
          type: "style_analysis",
          userInput: "I prefer casual style",
          userProfile: { bodyType: "slim", stylePreferences: ["casual"] },
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
        }),
      );
    });
  });

  describe("addVirtualTryOnTask", () => {
    it("should add job to virtualTryOnQueue when photo and item exist", async () => {
      const result = await service.addVirtualTryOnTask(
        "user-1",
        "photo-1",
        "item-1",
        "tops",
      );

      expect(result.status).toBe(JOB_STATUS.PENDING);
      expect(result.estimatedWaitTime).toBe(45);
      expect(result.message).toBe("Virtual try-on task queued successfully");
      expect(prisma.userPhoto.findFirst).toHaveBeenCalledWith({
        where: { id: "photo-1", userId: "user-1" },
        select: { url: true },
      });
      expect(prisma.clothingItem.findUnique).toHaveBeenCalledWith({
        where: { id: "item-1" },
        select: { images: true, mainImage: true, category: true },
      });
    });

    it("should throw NotFoundException when photo not found", async () => {
      prisma.userPhoto.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.addVirtualTryOnTask("user-1", "bad-photo", "item-1"),
      ).rejects.toThrow(NotFoundException);

      expect(virtualTryOnQueue.add).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when clothing item not found", async () => {
      prisma.clothingItem.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.addVirtualTryOnTask("user-1", "photo-1", "bad-item"),
      ).rejects.toThrow(NotFoundException);

      expect(virtualTryOnQueue.add).not.toHaveBeenCalled();
    });
  });

  describe("getJobStatus", () => {
    it("should return job result when job found in a queue", async () => {
      const mockJob = {
        id: "job-1",
        data: { userId: "user-1", type: "style_analysis" },
        returnvalue: { result: "done" },
        failedReason: undefined,
        processedOn: Date.now(),
        finishedOn: undefined,
        getState: jest.fn().mockResolvedValue("completed"),
      };
      styleAnalysisQueue.getJob.mockResolvedValueOnce(mockJob);

      const result = await service.getJobStatus("job-1");

      expect(result).not.toBeNull();
      expect(result!.jobId).toBe("job-1");
      expect(result!.status).toBe(JOB_STATUS.COMPLETED);
    });

    it("should return null when job not found in any queue", async () => {
      const result = await service.getJobStatus("non-existent-job");

      expect(result).toBeNull();
    });
  });

  describe("cancelJob", () => {
    it("should cancel a waiting job and return true", async () => {
      const mockJob = {
        id: "job-1",
        data: { userId: "user-1" },
        getState: jest.fn().mockResolvedValue("waiting"),
        remove: jest.fn().mockResolvedValue(undefined),
      };
      styleAnalysisQueue.getJob.mockResolvedValueOnce(mockJob);

      const result = await service.cancelJob("job-1", "user-1");

      expect(result).toBe(true);
      expect(mockJob.remove).toHaveBeenCalled();
    });

    it("should return false when job belongs to a different user", async () => {
      const mockJob = {
        id: "job-1",
        data: { userId: "user-2" },
        getState: jest.fn().mockResolvedValue("waiting"),
        remove: jest.fn(),
      };
      styleAnalysisQueue.getJob.mockResolvedValueOnce(mockJob);

      const result = await service.cancelJob("job-1", "user-1");

      expect(result).toBe(false);
      expect(mockJob.remove).not.toHaveBeenCalled();
    });

    it("should return false when job is in active state", async () => {
      const mockJob = {
        id: "job-1",
        data: { userId: "user-1" },
        getState: jest.fn().mockResolvedValue("active"),
        remove: jest.fn(),
      };
      styleAnalysisQueue.getJob.mockResolvedValueOnce(mockJob);

      const result = await service.cancelJob("job-1", "user-1");

      expect(result).toBe(false);
      expect(mockJob.remove).not.toHaveBeenCalled();
    });
  });

  describe("getQueueStats", () => {
    it("should return stats for all queues", async () => {
      const mockCounts = {
        waiting: 2,
        active: 1,
        completed: 10,
        failed: 0,
        delayed: 3,
      };
      const allQueues = [
        aiTasksQueue,
        styleAnalysisQueue,
        virtualTryOnQueue,
        wardrobeMatchQueue,
        bodyAnalysisQueue,
        photoProcessingQueue,
        aiGenerationQueue,
        notificationQueue,
        dataExportQueue,
        contentModerationQueue,
      ];
      allQueues.forEach((q) => {
        q.getJobCounts.mockResolvedValueOnce(mockCounts);
      });

      const result = await service.getQueueStats();

      expect(result[QueueName.AI_TASKS]).toEqual(mockCounts);
      expect(result[QueueName.STYLE_ANALYSIS]).toEqual(mockCounts);
      expect(result[QueueName.VIRTUAL_TRYON]).toEqual(mockCounts);
      expect(result[QueueName.WARDROBE_MATCH]).toEqual(mockCounts);
      expect(result[QueueName.BODY_ANALYSIS]).toEqual(mockCounts);
      expect(result[QueueName.PHOTO_PROCESSING]).toEqual(mockCounts);
      expect(result[QueueName.AI_GENERATION]).toEqual(mockCounts);
      expect(result[QueueName.NOTIFICATION]).toEqual(mockCounts);
      expect(result[QueueName.DATA_EXPORT]).toEqual(mockCounts);
      expect(result[QueueName.CONTENT_MODERATION]).toEqual(mockCounts);
    });
  });
});

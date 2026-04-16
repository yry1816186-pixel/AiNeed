import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { PhotoType, AnalysisStatus } from "@prisma/client";

import { PrismaService } from '../../../common/prisma/prisma.service";
import { MalwareScannerService } from '../../../common/security/malware-scanner.service";
import { StorageService } from '../../../common/storage/storage.service";
import { OnboardingService } from "../onboarding/onboarding.service";
import { QueueService } from "../queue/queue.service";

import { PhotosService } from "./photos.service";
import { AiAnalysisService } from "./services/ai-analysis.service";

import "multer"; // 引入 Express.Multer.File 类型声明

describe("PhotosService", () => {
  let service: PhotosService;
  let prisma: PrismaService;
  let storage: StorageService;
  let aiAnalysis: AiAnalysisService;

  const mockPrismaService = {
    userPhoto: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
    userProfile: {
      update: jest.fn(),
      upsert: jest.fn(),
    },
    aIAnalysisCache: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockStorageService = {
    uploadImage: jest.fn(),
    uploadEncrypted: jest.fn(),
    deleteFile: jest.fn(),
    fetchRemoteAssetDataUri: jest.fn(),
    fetchRemoteAsset: jest.fn(),
  };

  const mockAiAnalysisService = {
    analyzeBodyAndFace: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockMalwareScannerService = {
    scanImageBuffer: jest.fn().mockResolvedValue({ safe: true, threats: [] }),
  };

  const mockOnboardingService = {
    skipStep: jest.fn().mockResolvedValue({ success: true }),
  };

  const mockQueueService = {
    addImageAnalysisTask: jest.fn().mockResolvedValue({ taskId: "mock-task-id", status: "pending" }),
    addJob: jest.fn().mockResolvedValue({ id: "mock-job-id" }),
    getJobStatus: jest.fn().mockResolvedValue(null),
    getQueueStats: jest.fn().mockResolvedValue({ waiting: 0, active: 0, completed: 0, failed: 0 }),
  };

  const createMockFile = (): Express.Multer.File => ({
    fieldname: "photo",
    originalname: "test.jpg",
    encoding: "7bit",
    mimetype: "image/jpeg",
    // JPEG magic bytes: FF D8 FF (JPEG SOI marker) followed by APP0 marker
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, ...Array(1013).fill(0)]),
    size: 1024,
    destination: "",
    filename: "",
    path: "",
    stream: null as unknown as Express.Multer.File['stream'],
  });

  const mockPhoto = {
    id: "photo-id",
    userId: "test-user-id",
    url: "https://storage.example.com/photos/user-id/photo-id.jpg",
    thumbnailUrl: "https://storage.example.com/thumbnails/user-id/photo-id.jpg",
    type: PhotoType.full_body,
    analysisStatus: AnalysisStatus.pending,
    originalName: "test.jpg",
    mimeType: "image/jpeg",
    size: 1024,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhotosService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: AiAnalysisService,
          useValue: mockAiAnalysisService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: MalwareScannerService,
          useValue: mockMalwareScannerService,
        },
        {
          provide: OnboardingService,
          useValue: mockOnboardingService,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
      ],
    }).compile();

    service = module.get<PhotosService>(PhotosService);
    prisma = module.get<PrismaService>(PrismaService);
    storage = module.get<StorageService>(StorageService);
    aiAnalysis = module.get<AiAnalysisService>(AiAnalysisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("uploadPhoto", () => {
    it("应该成功上传照片", async () => {
      const mockFile = createMockFile();
      mockStorageService.uploadEncrypted.mockResolvedValue({
        url: "https://storage.example.com/photos/test.jpg",
        thumbnailUrl: "https://storage.example.com/thumbnails/test.jpg",
      });
      mockPrismaService.userPhoto.create.mockResolvedValue(mockPhoto);

      const result = await service.uploadPhoto(
        "test-user-id",
        mockFile,
        PhotoType.full_body,
      );

      expect(result.id).toBe("photo-id");
      expect(result.url).toBe(
        "https://storage.example.com/photos/user-id/photo-id.jpg",
      );
      expect(result.type).toBe(PhotoType.full_body);
      expect(mockStorageService.uploadEncrypted).toHaveBeenCalled();
      expect(mockPrismaService.userPhoto.create).toHaveBeenCalled();
    });

    it("应该拒绝不支持的图片格式", async () => {
      const invalidFile = {
        ...createMockFile(),
        mimetype: "image/gif",
      };

      await expect(
        service.uploadPhoto("test-user-id", invalidFile, PhotoType.full_body),
      ).rejects.toThrow(BadRequestException);
    });

    it("应该拒绝过大的图片", async () => {
      const largeFile = {
        ...createMockFile(),
        size: 11 * 1024 * 1024, // 11MB
      };

      await expect(
        service.uploadPhoto("test-user-id", largeFile, PhotoType.full_body),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getUserPhotos", () => {
    it("应该返回用户的所有照片", async () => {
      const mockPhotos = [mockPhoto];
      mockPrismaService.userPhoto.findMany.mockResolvedValue(mockPhotos);

      const result = await service.getUserPhotos("test-user-id");

      expect(result).toEqual(mockPhotos);
      expect(mockPrismaService.userPhoto.findMany).toHaveBeenCalledWith({
        where: { userId: "test-user-id" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userId: true,
          type: true,
          url: true,
          thumbnailUrl: true,
          originalName: true,
          mimeType: true,
          size: true,
          analysisResult: true,
          analysisStatus: true,
          analyzedAt: true,
          createdAt: true,
        },
      });
    });

    it("应该按类型筛选照片", async () => {
      mockPrismaService.userPhoto.findMany.mockResolvedValue([mockPhoto]);

      const result = await service.getUserPhotos(
        "test-user-id",
        PhotoType.full_body,
      );

      expect(mockPrismaService.userPhoto.findMany).toHaveBeenCalledWith({
        where: { userId: "test-user-id", type: PhotoType.full_body },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userId: true,
          type: true,
          url: true,
          thumbnailUrl: true,
          originalName: true,
          mimeType: true,
          size: true,
          analysisResult: true,
          analysisStatus: true,
          analyzedAt: true,
          createdAt: true,
        },
      });
    });
  });

  describe("getPhotoById", () => {
    it("应该返回指定照片", async () => {
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);

      const result = await service.getPhotoById("photo-id", "test-user-id");

      expect(result).toEqual(mockPhoto);
      expect(mockPrismaService.userPhoto.findFirst).toHaveBeenCalledWith({
        where: { id: "photo-id", userId: "test-user-id" },
      });
    });

    it("应该返回 null 当照片不存在", async () => {
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(null);

      const result = await service.getPhotoById(
        "non-existent-id",
        "test-user-id",
      );

      expect(result).toBeNull();
    });
  });

  describe("deletePhoto", () => {
    it("应该成功删除照片", async () => {
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);
      mockStorageService.deleteFile.mockResolvedValue(undefined);
      mockPrismaService.userPhoto.delete.mockResolvedValue(mockPhoto);

      await service.deletePhoto("photo-id", "test-user-id");

      expect(mockStorageService.deleteFile).toHaveBeenCalledTimes(2); // photo + thumbnail
      expect(mockPrismaService.userPhoto.delete).toHaveBeenCalledWith({
        where: { id: "photo-id" },
      });
    });

    it("应该抛出异常当照片不存在", async () => {
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(null);

      await expect(
        service.deletePhoto("non-existent-id", "test-user-id"),
      ).rejects.toThrow(BadRequestException);
    });

    it("应该成功删除没有缩略图的照片", async () => {
      const photoWithoutThumbnail = { ...mockPhoto, thumbnailUrl: null };
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(
        photoWithoutThumbnail,
      );
      mockStorageService.deleteFile.mockResolvedValue(undefined);
      mockPrismaService.userPhoto.delete.mockResolvedValue(
        photoWithoutThumbnail,
      );

      await service.deletePhoto("photo-id", "test-user-id");

      expect(mockStorageService.deleteFile).toHaveBeenCalledTimes(1);
    });
  });
});

import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../../../../../../common/prisma/prisma.service";
import { RedisService } from "../../../../../../../common/redis/redis.service";
import { StorageService } from "../../../../../../../common/storage/storage.service";
import { ProfileService } from "../profile.service";

import { PosterGeneratorService } from "./poster-generator.service";

jest.mock("canvas", () => ({
  createCanvas: jest.fn().mockReturnValue({
    toBuffer: jest.fn().mockReturnValue(Buffer.from("png-data")),
    getContext: jest.fn().mockReturnValue({
      fillRect: jest.fn(),
      fillText: jest.fn(),
      fillStyle: "",
      font: "",
      strokeStyle: "",
      lineWidth: 0,
      textAlign: "",
      textBaseline: "",
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      rect: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      arcTo: jest.fn(),
      closePath: jest.fn(),
      measureText: jest.fn().mockReturnValue({ width: 100 }),
      drawImage: jest.fn(),
    }),
  }),
  Image: jest.fn().mockImplementation(() => ({
    src: "",
  })),
}));

jest.mock("qrcode", () => ({
  toDataURL: jest.fn().mockResolvedValue("data:image/png;base64,qrcode-data"),
}));

describe("PosterGeneratorService", () => {
  let service: PosterGeneratorService;
  let storage: StorageService;
  let redis: RedisService;
  let profileService: ProfileService;

  const mockStorageService = {
    uploadBuffer: jest.fn().mockResolvedValue(undefined),
    getFileUrl: jest.fn().mockResolvedValue("https://storage.example.com/posters/test.png"),
    fileExists: jest.fn().mockResolvedValue(true),
  };

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    setWithTtl: jest.fn().mockResolvedValue(undefined),
  };

  const mockProfileService = {
    getProfile: jest.fn().mockResolvedValue({
      id: "user-id",
      email: "test@example.com",
      profile: {
        bodyType: "hourglass",
        colorSeason: "spring_warm",
        stylePreferences: ["casual", "elegant"],
      },
    }),
    getBodyAnalysis: jest.fn().mockResolvedValue({
      bodyType: "hourglass",
      bodyTypeName: "X型（沙漏）体型",
      description: "您的肩部和臀部宽度相近",
      recommendations: [
        { category: "上衣", advice: "突出腰线的款式", examples: ["收腰衬衫"] },
      ],
      idealStyles: ["收腰设计", "高腰裤", "裹身裙"],
      avoidStyles: ["过于宽松的款式"],
    }),
    getColorAnalysis: jest.fn().mockResolvedValue({
      colorSeason: "spring_warm",
      colorSeasonName: "春季暖型",
      bestColors: ["珊瑚色", "桃色", "杏色"],
      neutralColors: ["暖米色", "驼色"],
      avoidColors: ["纯黑色"],
      metalPreference: "金色饰品",
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PosterGeneratorService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ProfileService,
          useValue: mockProfileService,
        },
      ],
    }).compile();

    service = module.get<PosterGeneratorService>(PosterGeneratorService);
    storage = module.get<StorageService>(StorageService);
    redis = module.get<RedisService>(RedisService);
    profileService = module.get<ProfileService>(ProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("generateProfilePoster", () => {
    it("应该成功生成海报并返回 URL", async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.generateProfilePoster("user-id");

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("url");
      expect(result).toHaveProperty("createdAt");
      expect(mockProfileService.getProfile).toHaveBeenCalledWith("user-id");
      expect(mockProfileService.getBodyAnalysis).toHaveBeenCalledWith("user-id");
      expect(mockProfileService.getColorAnalysis).toHaveBeenCalledWith("user-id");
      expect(mockStorageService.uploadBuffer).toHaveBeenCalled();
      expect(mockRedisService.setWithTtl).toHaveBeenCalled();
    });

    it("同一天内应返回缓存", async () => {
      const cachedResult = JSON.stringify({
        id: "cached-poster-id",
        url: "https://storage.example.com/posters/cached.png",
        createdAt: new Date().toISOString(),
      });
      mockRedisService.get.mockResolvedValue(cachedResult);

      const result = await service.generateProfilePoster("user-id");

      expect(result.id).toBe("cached-poster-id");
      expect(result.url).toBe("https://storage.example.com/posters/cached.png");
      expect(mockStorageService.uploadBuffer).not.toHaveBeenCalled();
    });

    it("用户不存在应抛出 NotFoundException", async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockProfileService.getProfile.mockResolvedValueOnce(null);

      await expect(service.generateProfilePoster("non-existent-user")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getPoster", () => {
    it("应该从缓存返回已生成的海报", async () => {
      const cachedResult = JSON.stringify({
        id: "poster-id",
        url: "https://storage.example.com/posters/test.png",
        createdAt: new Date().toISOString(),
      });
      mockRedisService.get.mockResolvedValue(cachedResult);

      const result = await service.getPoster("user-id", "poster-id");

      expect(result.id).toBe("poster-id");
      expect(result.url).toBe("https://storage.example.com/posters/test.png");
    });

    it("缓存未命中时应从 MinIO 获取海报", async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockStorageService.fileExists.mockResolvedValue(true);
      mockStorageService.getFileUrl.mockResolvedValue("https://storage.example.com/posters/test.png");

      const result = await service.getPoster("user-id", "poster-id");

      expect(result.id).toBe("poster-id");
      expect(result.url).toBe("https://storage.example.com/posters/test.png");
      expect(mockStorageService.fileExists).toHaveBeenCalledWith("posters/user-id/poster-id.png");
    });

    it("海报不存在应抛出 NotFoundException", async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockStorageService.fileExists.mockResolvedValue(false);

      await expect(service.getPoster("user-id", "non-existent-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

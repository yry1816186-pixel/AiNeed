import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";

import { FeatureFlagService } from "./feature-flag.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { RedisService, RedisKeyBuilder } from "../../../common/redis/redis.service";

jest.mock("../../../common/redis/redis.service", () => ({
  RedisKeyBuilder: {
    cache: jest.fn((module: string, identifier: string) =>
      `xuno:cache:${module}:${identifier}`
    ),
  },
  REDIS_KEY_PREFIX: "xuno",
  REDIS_KEY_SEPARATOR: ":",
}));

describe("FeatureFlagService", () => {
  let service: FeatureFlagService;
  let prisma: {
    featureFlag: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  };
  let redisService: { get: jest.Mock; setex: jest.Mock; del: jest.Mock };
  let evaluationQueue: { add: jest.Mock };

  const mockFlag = {
    id: "flag-id-1",
    key: "new_ui_design",
    name: "New UI Design",
    description: "Enable new UI",
    type: "boolean",
    value: { enabled: true },
    enabled: true,
    rules: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      featureFlag: {
        findMany: jest.fn().mockResolvedValue([mockFlag]),
        findUnique: jest.fn().mockResolvedValue(mockFlag),
        create: jest.fn().mockResolvedValue(mockFlag),
        update: jest.fn().mockResolvedValue(mockFlag),
        delete: jest.fn().mockResolvedValue(mockFlag),
        count: jest.fn().mockResolvedValue(1),
      },
    };

    redisService = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    evaluationQueue = {
      add: jest.fn().mockResolvedValue({ id: "job-1" }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redisService },
        { provide: "BullMQ_feature_flag_evaluations", useValue: evaluationQueue },
      ],
    }).compile();

    service = module.get<FeatureFlagService>(FeatureFlagService);
  });

  describe("findAll", () => {
    it("should return paginated list with total count", async () => {
      prisma.featureFlag.findMany.mockResolvedValueOnce([mockFlag]);
      prisma.featureFlag.count.mockResolvedValueOnce(1);

      const result = await service.findAll({ skip: 0, take: 10 });

      expect(result).toEqual({ items: [mockFlag], total: 1 });
    });

    it("should filter by type and enabled status", async () => {
      prisma.featureFlag.findMany.mockResolvedValueOnce([mockFlag]);
      prisma.featureFlag.count.mockResolvedValueOnce(1);

      await service.findAll({ type: "boolean", enabled: true });

      expect(prisma.featureFlag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: "boolean", enabled: true },
        }),
      );
    });
  });

  describe("findOne", () => {
    it("should return a flag when found", async () => {
      prisma.featureFlag.findUnique.mockResolvedValueOnce(mockFlag);

      const result = await service.findOne("flag-id-1");

      expect(result).toEqual(mockFlag);
    });

    it("should throw NotFoundException when flag not found", async () => {
      prisma.featureFlag.findUnique.mockResolvedValueOnce(null);

      await expect(service.findOne("non-existent-id")).rejects.toThrow(NotFoundException);
    });
  });

  describe("create", () => {
    it("should create a flag and refresh cache", async () => {
      const createDto = {
        key: "new_ui_design",
        name: "New UI Design",
        description: "Enable new UI",
        type: "boolean",
        value: { enabled: true },
        enabled: true,
        rules: {},
      };

      prisma.featureFlag.create.mockResolvedValueOnce(mockFlag);

      const result = await service.create(createDto);

      expect(result).toEqual(mockFlag);
      expect(RedisKeyBuilder.cache).toHaveBeenCalledWith("feature-flag", "new_ui_design");
      expect(redisService.del).toHaveBeenCalledWith("xuno:cache:feature-flag:new_ui_design");
    });
  });

  describe("evaluate", () => {
    it("should return flag_not_found when flag does not exist", async () => {
      prisma.featureFlag.findUnique.mockResolvedValueOnce(null);
      redisService.get.mockResolvedValueOnce(null);

      const result = await service.evaluate("non_existent_key");

      expect(result).toEqual({ enabled: false, reason: "flag_not_found" });
    });

    it("should return flag_disabled when flag is disabled", async () => {
      const disabledFlag = { ...mockFlag, enabled: false };
      prisma.featureFlag.findUnique.mockResolvedValueOnce(disabledFlag);
      redisService.get.mockResolvedValueOnce(null);

      const result = await service.evaluate("new_ui_design", "user-1");

      expect(result).toEqual({ enabled: false, reason: "flag_disabled" });
    });

    it("should evaluate boolean type flag correctly", async () => {
      const booleanFlag = { ...mockFlag, type: "boolean", value: { enabled: true }, enabled: true };
      prisma.featureFlag.findUnique.mockResolvedValueOnce(booleanFlag);
      redisService.get.mockResolvedValueOnce(null);

      const result = await service.evaluate("new_ui_design", "user-1");

      expect(result).toEqual({ enabled: true, reason: "boolean_toggle" });
    });

    it("should evaluate boolean type flag with enabled false", async () => {
      const booleanFlag = { ...mockFlag, type: "boolean", value: { enabled: false }, enabled: true };
      prisma.featureFlag.findUnique.mockResolvedValueOnce(booleanFlag);
      redisService.get.mockResolvedValueOnce(null);

      const result = await service.evaluate("new_ui_design", "user-1");

      expect(result).toEqual({ enabled: false, reason: "boolean_toggle" });
    });
  });

  describe("refreshCache", () => {
    it("should clear redis and local cache for a specific key", async () => {
      await service.refreshCache("new_ui_design");

      expect(RedisKeyBuilder.cache).toHaveBeenCalledWith("feature-flag", "new_ui_design");
      expect(redisService.del).toHaveBeenCalledWith("xuno:cache:feature-flag:new_ui_design");
    });

    it("should clear only local cache when no key provided", async () => {
      await service.refreshCache();

      expect(redisService.del).not.toHaveBeenCalled();
    });
  });
});

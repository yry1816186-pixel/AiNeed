import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { RedisService } from "../../../../common/redis/redis.service";
import { StorageService } from "../../../../common/storage/storage.service";

import { HealthService } from "./health.service";

describe("HealthService", () => {
  let service: HealthService;
  let prisma: PrismaService;
  let redis: RedisService;
  let storage: StorageService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  const mockRedisService = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  const mockStorageService = {
    getFileUrl: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        ML_SERVICE_URL: "http://localhost:8001",
      };
      return config[key] ?? defaultValue;
    }),
  };

  let originalFetch: typeof globalThis.fetch;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
    storage = module.get<StorageService>(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = originalFetch;
  });

  describe("checkHealth", () => {
    it("should return healthy status when all services are up", async () => {
      // Mock all services as healthy
      mockPrismaService.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.get.mockResolvedValue("ok");
      mockRedisService.del.mockResolvedValue(undefined);
      mockStorageService.getFileUrl.mockResolvedValue(
        "http://example.com/file",
      );

      const result = await service.checkHealth();

      expect(result.status).toBe("healthy");
      expect(result.checks.database.status).toBe("up");
      expect(result.checks.redis.status).toBe("up");
      expect(result.checks.storage.status).toBe("up");
      expect(result.checks.mlService.status).toBe("up");
      expect(result.uptime).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it("should return degraded status when one service is down", async () => {
      // Mock database as healthy
      mockPrismaService.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
      // Mock redis as healthy
      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.get.mockResolvedValue("ok");
      mockRedisService.del.mockResolvedValue(undefined);
      // Mock storage as down
      mockStorageService.getFileUrl.mockRejectedValue(
        new Error("Connection refused"),
      );

      const result = await service.checkHealth();

      expect(result.status).toBe("degraded");
      expect(result.checks.database.status).toBe("up");
      expect(result.checks.redis.status).toBe("up");
      expect(result.checks.storage.status).toBe("down");
    });

    it("should return unhealthy status when all services are down", async () => {
      // Mock all services as down
      mockPrismaService.$queryRaw.mockRejectedValue(
        new Error("Connection refused"),
      );
      mockRedisService.set.mockRejectedValue(new Error("Connection refused"));
      mockStorageService.getFileUrl.mockRejectedValue(
        new Error("Connection refused"),
      );
      (globalThis.fetch as jest.Mock).mockRejectedValue(
        new Error("Connection refused"),
      );

      const result = await service.checkHealth();

      expect(result.status).toBe("unhealthy");
      expect(result.checks.database.status).toBe("down");
      expect(result.checks.redis.status).toBe("down");
      expect(result.checks.storage.status).toBe("down");
      expect(result.checks.mlService.status).toBe("down");
    });
  });

  describe("checkDatabase", () => {
    it("should return up status when database connection is successful", async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

      const result = await service.checkDatabase();

      expect(result.status).toBe("up");
      expect(result.latency).toBeDefined();
      expect(result.message).toBe("Database connection is healthy");
    });

    it("should return down status when database connection fails", async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(
        new Error("Connection refused"),
      );

      const result = await service.checkDatabase();

      expect(result.status).toBe("down");
      expect(result.message).toBe("Database connection failed");
      expect(result.details).toBeDefined();
    });
  });

  describe("checkRedis", () => {
    it("should return up status when redis connection is successful", async () => {
      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.get.mockResolvedValue("ok");
      mockRedisService.del.mockResolvedValue(undefined);

      const result = await service.checkRedis();

      expect(result.status).toBe("up");
      expect(result.message).toBe("Redis connection is healthy");
    });

    it("should return down status when redis read/write verification fails", async () => {
      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.get.mockResolvedValue("wrong");
      mockRedisService.del.mockResolvedValue(undefined);

      const result = await service.checkRedis();

      expect(result.status).toBe("down");
    });

    it("should return down status when redis connection fails", async () => {
      mockRedisService.set.mockRejectedValue(new Error("Connection refused"));

      const result = await service.checkRedis();

      expect(result.status).toBe("down");
      expect(result.message).toBe("Redis connection failed");
    });
  });

  describe("checkStorage", () => {
    it("should return up status when storage service is available", async () => {
      mockStorageService.getFileUrl.mockResolvedValue(
        "http://example.com/file",
      );

      const result = await service.checkStorage();

      expect(result.status).toBe("up");
      expect(result.message).toBe("Storage service is healthy");
    });

    it("should return down status when storage service fails", async () => {
      mockStorageService.getFileUrl.mockRejectedValue(
        new Error("Connection refused"),
      );

      const result = await service.checkStorage();

      expect(result.status).toBe("down");
      expect(result.message).toBe("Storage service connection failed");
    });
  });

  describe("getLiveness", () => {
    it("should return alive status", () => {
      const result = service.getLiveness();

      expect(result.status).toBe("alive");
      expect(result.timestamp).toBeDefined();
    });
  });

  describe("getReadiness", () => {
    it("should return ready: true when all services are up", async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.get.mockResolvedValue("ok");
      mockRedisService.del.mockResolvedValue(undefined);
      mockStorageService.getFileUrl.mockResolvedValue(
        "http://example.com/file",
      );

      const result = await service.getReadiness();

      expect(result.ready).toBe(true);
      expect(result.checks.database).toBe(true);
      expect(result.checks.redis).toBe(true);
      expect(result.checks.storage).toBe(true);
    });

    it("should return ready: false when any service is down", async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(
        new Error("Connection refused"),
      );
      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.get.mockResolvedValue("ok");
      mockRedisService.del.mockResolvedValue(undefined);
      mockStorageService.getFileUrl.mockResolvedValue(
        "http://example.com/file",
      );

      const result = await service.getReadiness();

      expect(result.ready).toBe(false);
      expect(result.checks.database).toBe(false);
    });
  });
});

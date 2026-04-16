import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";

import { CacheService } from "./cache.service";
import { RedisService } from "../../common/redis/redis.service";

describe("CacheService", () => {
  let service: CacheService;
  let redisService: jest.Mocked<RedisService>;

  const mockRedisClient = {
    scan: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    multi: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRedisClient.scan.mockResolvedValue(["0", []]);
    mockRedisClient.del.mockResolvedValue(0);
    mockRedisClient.exists.mockResolvedValue(0);
    mockRedisClient.multi.mockReturnValue({
      set: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(["OK", 1]),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            setex: jest.fn(),
            del: jest.fn(),
            getClient: jest.fn().mockReturnValue(mockRedisClient),
            acquireLock: jest.fn(),
            releaseLock: jest.fn(),
            ttl: jest.fn(),
            exists: jest.fn(),
            expire: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue("xuno"),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    redisService = module.get(RedisService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("get", () => {
    it("should return parsed JSON for valid cached value", async () => {
      const cachedData = JSON.stringify({ name: "test", count: 42 });
      (redisService.get as jest.Mock).mockResolvedValue(cachedData);

      const result = await service.get<{ name: string; count: number }>("test-key");

      expect(redisService.get).toHaveBeenCalledWith("test-key");
      expect(result).toEqual({ name: "test", count: 42 });
    });

    it("should return null for null placeholder (cache penetration protection)", async () => {
      (redisService.get as jest.Mock).mockResolvedValue("__NULL__");

      const result = await service.get("test-key");

      expect(result).toBeNull();
    });

    it("should return null when JSON parse fails and log warning", async () => {
      (redisService.get as jest.Mock).mockResolvedValue("not-valid-json{{{");

      const result = await service.get("test-key");

      expect(result).toBeNull();
    });
  });

  describe("set", () => {
    it("should call setex when TTL is provided", async () => {
      await service.set("test-key", { data: "value" }, 300);

      expect(redisService.setex).toHaveBeenCalledWith(
        "test-key",
        300,
        JSON.stringify({ data: "value" }),
      );
    });

    it("should call set without TTL when TTL is not provided", async () => {
      await service.set("test-key", { data: "value" });

      expect(redisService.set).toHaveBeenCalledWith(
        "test-key",
        JSON.stringify({ data: "value" }),
      );
      expect(redisService.setex).not.toHaveBeenCalled();
    });

    it("should not double-serialize string values", async () => {
      await service.set("test-key", "raw-string-value", 60);

      expect(redisService.setex).toHaveBeenCalledWith(
        "test-key",
        60,
        "raw-string-value",
      );
    });
  });

  describe("del", () => {
    it("should call redis del with the key", async () => {
      await service.del("test-key");

      expect(redisService.del).toHaveBeenCalledWith("test-key");
    });
  });

  describe("getOrSet", () => {
    it("should return cached data on cache hit", async () => {
      const cachedData = JSON.stringify({ items: [1, 2, 3] });
      (redisService.get as jest.Mock).mockResolvedValue(cachedData);

      const fetcher = jest.fn();
      const result = await service.getOrSet("test-key", fetcher, 3600);

      expect(result).toEqual({ items: [1, 2, 3] });
      expect(fetcher).not.toHaveBeenCalled();
    });

    it("should call fetcher and cache result on cache miss", async () => {
      (redisService.get as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      const fetchedData = { items: [4, 5, 6] };
      const fetcher = jest.fn().mockResolvedValue(fetchedData);

      const result = await service.getOrSet("test-key", fetcher, 3600);

      expect(fetcher).toHaveBeenCalled();
      expect(result).toEqual(fetchedData);
      expect(redisService.setex).toHaveBeenCalled();
    });

    it("should cache null placeholder when fetcher returns null", async () => {
      (redisService.get as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      const fetcher = jest.fn().mockResolvedValue(null);

      const result = await service.getOrSet("test-key", fetcher, 3600, 120);

      expect(result).toBeNull();
      expect(redisService.setex).toHaveBeenCalledWith(
        "test-key",
        120,
        "__NULL__",
      );
    });
  });

  describe("getWithLock", () => {
    it("should return cached data on cache hit without acquiring lock", async () => {
      const cachedData = JSON.stringify({ locked: true });
      (redisService.get as jest.Mock).mockResolvedValue(cachedData);

      const fetcher = jest.fn();
      const result = await service.getWithLock("test-key", fetcher, 3600);

      expect(result).toEqual({ locked: true });
      expect(fetcher).not.toHaveBeenCalled();
      expect(redisService.acquireLock).not.toHaveBeenCalled();
    });

    it("should acquire lock, fetch data, cache it, and release lock on cache miss", async () => {
      (redisService.get as jest.Mock).mockResolvedValue(null);
      (redisService.acquireLock as jest.Mock).mockResolvedValue("lock-token-123");
      (redisService.releaseLock as jest.Mock).mockResolvedValue(undefined);

      const fetchedData = { fresh: "data" };
      const fetcher = jest.fn().mockResolvedValue(fetchedData);

      const result = await service.getWithLock("test-key", fetcher, 3600);

      expect(redisService.acquireLock).toHaveBeenCalledWith(
        "lock:test-key",
        10000,
        1,
      );
      expect(fetcher).toHaveBeenCalled();
      expect(result).toEqual(fetchedData);
      expect(redisService.setex).toHaveBeenCalled();
      expect(redisService.releaseLock).toHaveBeenCalledWith(
        "lock:test-key",
        "lock-token-123",
      );
    });
  });

  describe("exists", () => {
    it("should return true when key exists", async () => {
      (redisService.exists as jest.Mock).mockResolvedValue(true);

      const result = await service.exists("test-key");

      expect(redisService.exists).toHaveBeenCalledWith("test-key");
      expect(result).toBe(true);
    });

    it("should return false when key does not exist", async () => {
      (redisService.exists as jest.Mock).mockResolvedValue(false);

      const result = await service.exists("missing-key");

      expect(result).toBe(false);
    });
  });
});

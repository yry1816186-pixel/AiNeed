import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { REDIS_CLIENT } from "../../../common/redis/redis.service";

import { AiQuotaService, QuotaType } from "./ai-quota.service";

function createRedisMock() {
  const store = new Map<string, { value: string; ttlMs?: number; setAt: number }>();

  return {
    store,
    get: jest.fn((key: string) => {
      const entry = store.get(key);
      if (!entry) {return Promise.resolve(null);}
      if (entry.ttlMs && Date.now() - entry.setAt > entry.ttlMs) {
        store.delete(key);
        return Promise.resolve(null);
      }
      return Promise.resolve(entry.value);
    }),
    set: jest.fn((key: string, value: string) => {
      store.set(key, { value, setAt: Date.now() });
      return Promise.resolve("OK");
    }),
    incr: jest.fn((key: string) => {
      const entry = store.get(key);
      const current = entry ? parseInt(entry.value, 10) : 0;
      const next = current + 1;
      store.set(key, { value: String(next), setAt: entry?.setAt ?? Date.now(), ttlMs: entry?.ttlMs });
      return Promise.resolve(next);
    }),
    expire: jest.fn((key: string, seconds: number) => {
      const entry = store.get(key);
      if (entry) {
        entry.ttlMs = seconds * 1000;
        entry.setAt = Date.now();
      }
      return Promise.resolve(1);
    }),
    ttl: jest.fn((key: string) => {
      const entry = store.get(key);
      if (!entry) {return Promise.resolve(-2);}
      if (!entry.ttlMs) {return Promise.resolve(-1);}
      const remaining = Math.floor((entry.ttlMs - (Date.now() - entry.setAt)) / 1000);
      return Promise.resolve(remaining > 0 ? remaining : -2);
    }),
    del: jest.fn((key: string) => {
      const existed = store.delete(key);
      return Promise.resolve(existed ? 1 : 0);
    }),
  };
}

describe("AiQuotaService", () => {
  let service: AiQuotaService;
  let redis: ReturnType<typeof createRedisMock>;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: number) => {
      const config: Record<string, number> = {
        AI_STYLIST_DAILY_LIMIT: 10,
        TRY_ON_DAILY_LIMIT: 3,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    redis = createRedisMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiQuotaService,
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AiQuotaService>(AiQuotaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("checkQuota", () => {
    it("应该在配额未用完时返回 allowed=true", async () => {
      const result = await service.checkQuota("user-1", "ai-stylist");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
    });

    it("应该在配额用完时返回 allowed=false", async () => {
      for (let i = 0; i < 10; i++) {
        await service.consumeQuota("user-1", "ai-stylist");
      }

      const result = await service.checkQuota("user-1", "ai-stylist");

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("应该返回正确的剩余次数", async () => {
      await service.consumeQuota("user-1", "ai-stylist");
      await service.consumeQuota("user-1", "ai-stylist");

      const result = await service.checkQuota("user-1", "ai-stylist");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(8);
    });

    it("不同用户的配额应该独立计算", async () => {
      for (let i = 0; i < 10; i++) {
        await service.consumeQuota("user-1", "ai-stylist");
      }

      const result = await service.checkQuota("user-2", "ai-stylist");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
    });

    it("不同类型的配额应该独立计算", async () => {
      for (let i = 0; i < 3; i++) {
        await service.consumeQuota("user-1", "try-on");
      }

      const stylistResult = await service.checkQuota("user-1", "ai-stylist");
      const tryOnResult = await service.checkQuota("user-1", "try-on");

      expect(stylistResult.allowed).toBe(true);
      expect(tryOnResult.allowed).toBe(false);
    });
  });

  describe("consumeQuota", () => {
    it("应该成功消耗配额并返回剩余次数", async () => {
      const result = await service.consumeQuota("user-1", "ai-stylist");

      expect(result.consumed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it("应该在配额用完时返回 consumed=false", async () => {
      for (let i = 0; i < 10; i++) {
        await service.consumeQuota("user-1", "ai-stylist");
      }

      const result = await service.consumeQuota("user-1", "ai-stylist");

      expect(result.consumed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("try-on 配额限制应该为 3", async () => {
      for (let i = 0; i < 3; i++) {
        const r = await service.consumeQuota("user-1", "try-on");
        expect(r.consumed).toBe(true);
      }

      const result = await service.consumeQuota("user-1", "try-on");
      expect(result.consumed).toBe(false);
    });

    it("首次消耗时应该设置过期时间", async () => {
      await service.consumeQuota("user-1", "ai-stylist");

      expect(redis.expire).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
      );
    });

    it("应该返回 resetAt 时间", async () => {
      const result = await service.consumeQuota("user-1", "ai-stylist");

      expect(result.resetAt).toBeInstanceOf(Date);
    });
  });

  describe("getQuotaStatus", () => {
    it("应该返回所有配额类型的状态", async () => {
      await service.consumeQuota("user-1", "ai-stylist");
      await service.consumeQuota("user-1", "try-on");

      const status = await service.getQuotaStatus("user-1");

      expect(status["ai-stylist"]).toBeDefined();
      expect(status["ai-stylist"]!.used).toBe(1);
      expect(status["ai-stylist"]!.limit).toBe(10);

      expect(status["try-on"]).toBeDefined();
      expect(status["try-on"]!.used).toBe(1);
      expect(status["try-on"]!.limit).toBe(3);
    });

    it("应该对未使用的配额返回 used=0", async () => {
      const status = await service.getQuotaStatus("user-1");

      expect(status["ai-stylist"]!.used).toBe(0);
      expect(status["try-on"]!.used).toBe(0);
    });
  });

  describe("resetQuota", () => {
    it("应该重置指定类型的配额", async () => {
      await service.consumeQuota("user-1", "ai-stylist");
      await service.consumeQuota("user-1", "try-on");

      await service.resetQuota("user-1", "ai-stylist");

      const status = await service.getQuotaStatus("user-1");
      expect(status["ai-stylist"]!.used).toBe(0);
      expect(status["try-on"]!.used).toBe(1);
    });

    it("应该重置所有类型的配额（不指定 quotaType）", async () => {
      await service.consumeQuota("user-1", "ai-stylist");
      await service.consumeQuota("user-1", "try-on");

      await service.resetQuota("user-1");

      const status = await service.getQuotaStatus("user-1");
      expect(status["ai-stylist"]!.used).toBe(0);
      expect(status["try-on"]!.used).toBe(0);
    });
  });

  describe("key format", () => {
    it("应该使用 xuno:quota:{userId}:{date}:{type} 格式", async () => {
      await service.checkQuota("user-1", "ai-stylist");

      const today = new Date().toISOString().slice(0, 10);
      const expectedKey = `xuno:quota:user-1:${today}:ai-stylist`;

      expect(redis.get).toHaveBeenCalledWith(expectedKey);
    });
  });

  describe("custom limits from config", () => {
    it("应该使用环境变量中的自定义限制", async () => {
      const customConfigService = {
        get: jest.fn((key: string, defaultValue?: number) => {
          const config: Record<string, number> = {
            AI_STYLIST_DAILY_LIMIT: 5,
            TRY_ON_DAILY_LIMIT: 1,
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AiQuotaService,
          { provide: REDIS_CLIENT, useValue: createRedisMock() },
          { provide: ConfigService, useValue: customConfigService },
        ],
      }).compile();

      const customService = module.get<AiQuotaService>(AiQuotaService);

      for (let i = 0; i < 5; i++) {
        const r = await customService.consumeQuota("user-1", "ai-stylist");
        expect(r.consumed).toBe(true);
      }

      const result = await customService.consumeQuota("user-1", "ai-stylist");
      expect(result.consumed).toBe(false);
    });
  });
});

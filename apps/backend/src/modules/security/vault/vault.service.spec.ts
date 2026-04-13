import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";

import { VaultService, KeyRotationEvent } from "./vault.service";

describe("VaultService", () => {
  let service: VaultService;
  let configService: ConfigService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("mock mode (no VAULT_ADDR/VAULT_TOKEN)", () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string | undefined> = {
          ENCRYPTION_KEY: "mock-encryption-key",
          DATABASE_URL: "postgres://localhost:5432/test",
          JWT_SECRET: "mock-jwt-secret",
          REDIS_URL: "redis://localhost:6379",
        };
        return config[key];
      }),
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          VaultService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: EventEmitter2, useValue: mockEventEmitter },
        ],
      }).compile();

      service = module.get<VaultService>(VaultService);
      configService = module.get<ConfigService>(ConfigService);
      eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    });

    it("onModuleInit 应该进入 mock 模式（缺少 VAULT_ADDR 和 VAULT_TOKEN）", () => {
      service.onModuleInit();
      expect(service.isUsingMock()).toBe(true);
    });

    it("getSecret 应该从环境变量返回值（mock 模式）", async () => {
      service.onModuleInit();
      const result = await service.getSecret("encryption");
      expect(result.value).toBe("mock-encryption-key");
    });

    it("getSecret 应该对未知路径使用大写前缀查找环境变量", async () => {
      service.onModuleInit();
      const result = await service.getSecret("my/custom/path");
      expect(result).toEqual({});
    });

    it("getSecret 应该对 database 路径返回 DATABASE_URL", async () => {
      service.onModuleInit();
      const result = await service.getSecret("database");
      expect(result.value).toBe("postgres://localhost:5432/test");
    });

    it("getSecret 应该对 jwt 路径返回 JWT_SECRET", async () => {
      service.onModuleInit();
      const result = await service.getSecret("jwt");
      expect(result.value).toBe("mock-jwt-secret");
    });

    it("getSecret 应该对 redis 路径返回 REDIS_URL", async () => {
      service.onModuleInit();
      const result = await service.getSecret("redis");
      expect(result.value).toBe("redis://localhost:6379");
    });

    it("rotateKey 应该在 mock 模式下发出事件", async () => {
      service.onModuleInit();
      await service.rotateKey("test-key");

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "vault.key.rotated",
        expect.objectContaining({
          keyName: "test-key",
          version: 1,
        }),
      );
    });

    it("healthCheck 应该在 mock 模式下返回 true", async () => {
      service.onModuleInit();
      const result = await service.healthCheck();
      expect(result).toBe(true);
    });

    it("isUsingMock 应该返回 true", () => {
      service.onModuleInit();
      expect(service.isUsingMock()).toBe(true);
    });
  });

  describe("real mode (VAULT_ADDR + VAULT_TOKEN configured)", () => {
    let mockFetch: jest.Mock;

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string | undefined> = {
          VAULT_ADDR: "http://vault:8200",
          VAULT_TOKEN: "test-vault-token",
          ENCRYPTION_KEY: "fallback-encryption-key",
        };
        return config[key];
      }),
    };

    beforeEach(async () => {
      mockFetch = jest.fn();
      global.fetch = mockFetch;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          VaultService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: EventEmitter2, useValue: mockEventEmitter },
        ],
      }).compile();

      service = module.get<VaultService>(VaultService);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("onModuleInit 应该进入 real 模式（有 VAULT_ADDR 和 VAULT_TOKEN）", () => {
      service.onModuleInit();
      expect(service.isUsingMock()).toBe(false);
    });

    it("getSecret 应该调用 Vault API 并返回数据", async () => {
      service.onModuleInit();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { data: { username: "admin", password: "secret" } },
        }),
      });

      const result = await service.getSecret("myapp/config");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://vault:8200/v1/secret/data/myapp/config",
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Vault-Token": "test-vault-token",
          }),
        }),
      );
      expect(result).toEqual({ username: "admin", password: "secret" });
    });

    it("getSecret 应该在 Vault API 返回非 ok 时回退到环境变量", async () => {
      service.onModuleInit();

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const result = await service.getSecret("encryption");
      expect(result.value).toBe("fallback-encryption-key");
    });

    it("getSecret 应该在 Vault API 连接失败时回退到环境变量", async () => {
      service.onModuleInit();

      mockFetch.mockRejectedValue(new Error("Connection refused"));

      const result = await service.getSecret("encryption");
      expect(result.value).toBe("fallback-encryption-key");
    });

    it("rotateKey 应该调用 Vault API 进行密钥轮换", async () => {
      service.onModuleInit();

      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/rotate")) {
          return Promise.resolve({ ok: true });
        }
        if (url.includes("/transit/keys/test-key")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: { latest_version: 3 } }),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      await service.rotateKey("test-key");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://vault:8200/v1/transit/keys/test-key/rotate",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "X-Vault-Token": "test-vault-token",
          }),
        }),
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "vault.key.rotated",
        expect.objectContaining({
          keyName: "test-key",
          version: 3,
        }),
      );
    });

    it("rotateKey 应该在 API 失败时抛出错误", async () => {
      service.onModuleInit();

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(service.rotateKey("test-key")).rejects.toThrow(
        "Vault key rotation failed: 500 Internal Server Error",
      );
    });

    it("healthCheck 应该在 Vault 返回 200 时返回 true", async () => {
      service.onModuleInit();

      mockFetch.mockResolvedValue({ status: 200 });

      const result = await service.healthCheck();
      expect(result).toBe(true);
    });

    it("healthCheck 应该在 Vault 返回非 200 时返回 false", async () => {
      service.onModuleInit();

      mockFetch.mockResolvedValue({ status: 503 });

      const result = await service.healthCheck();
      expect(result).toBe(false);
    });

    it("healthCheck 应该在连接失败时返回 false", async () => {
      service.onModuleInit();

      mockFetch.mockRejectedValue(new Error("Connection refused"));

      const result = await service.healthCheck();
      expect(result).toBe(false);
    });

    it("isUsingMock 应该返回 false", () => {
      service.onModuleInit();
      expect(service.isUsingMock()).toBe(false);
    });
  });

  describe("仅有 VAULT_ADDR 没有 VAULT_TOKEN", () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string | undefined> = {
          VAULT_ADDR: "http://vault:8200",
          VAULT_TOKEN: undefined,
        };
        return config[key];
      }),
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          VaultService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: EventEmitter2, useValue: mockEventEmitter },
        ],
      }).compile();

      service = module.get<VaultService>(VaultService);
    });

    it("应该进入 mock 模式（缺少 VAULT_TOKEN）", () => {
      service.onModuleInit();
      expect(service.isUsingMock()).toBe(true);
    });
  });
});

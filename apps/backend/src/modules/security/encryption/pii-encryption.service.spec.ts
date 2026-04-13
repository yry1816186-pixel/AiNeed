import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { EncryptionService } from "../../../common/encryption/encryption.service";
import { UserKeyService } from "../../../common/security/user-key.service";

import {
  SecurityPIIEncryptionService,
  PII_FIELDS,
} from "./pii-encryption.service";

describe("SecurityPIIEncryptionService", () => {
  let service: SecurityPIIEncryptionService;
  let encryptionService: EncryptionService;
  let userKeyService: UserKeyService;
  let configService: ConfigService;

  const mockEncryptionService = {
    encrypt: jest.fn((plaintext: string) => `enc:${Buffer.from(plaintext).toString("base64")}`),
    decrypt: jest.fn((ciphertext: string) => {
      if (!ciphertext.startsWith("enc:")) return ciphertext;
      return Buffer.from(ciphertext.slice(4), "base64").toString("utf8");
    }),
  };

  const mockUserKeyService = {
    encryptForUser: jest.fn((userId: string, plaintext: string) =>
      `enc:${userId}:${Buffer.from(plaintext).toString("base64")}`,
    ),
    decryptForUser: jest.fn((userId: string, ciphertext: string) => {
      if (!ciphertext.startsWith("enc:")) return ciphertext;
      const withoutPrefix = ciphertext.slice(4);
      const colonIndex = withoutPrefix.indexOf(":");
      if (colonIndex === -1) {
        return Buffer.from(withoutPrefix, "base64").toString("utf8");
      }
      const encoded = withoutPrefix.slice(colonIndex + 1);
      return Buffer.from(encoded, "base64").toString("utf8");
    }),
  };

  const createConfigService = (overrides: Record<string, string> = {}) => ({
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        NODE_ENV: "development",
        PII_ENCRYPTION_ENABLED: "true",
        ...overrides,
      };
      return config[key] ?? defaultValue;
    }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityPIIEncryptionService,
        { provide: ConfigService, useFactory: () => createConfigService() },
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: UserKeyService, useValue: mockUserKeyService },
      ],
    }).compile();

    service = module.get<SecurityPIIEncryptionService>(SecurityPIIEncryptionService);
    service.onModuleInit();
    encryptionService = module.get<EncryptionService>(EncryptionService);
    userKeyService = module.get<UserKeyService>(UserKeyService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("encryptField", () => {
    it("应该加密明文字符串", async () => {
      const result = await service.encryptField("13800138000");
      expect(result).toBe("enc:MTM4MDAxMzgwMDA=");
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith("13800138000");
    });

    it("应该使用用户级密钥加密（提供 userId 时）", async () => {
      const result = await service.encryptField("13800138000", "user-123");
      expect(result).toBe("enc:user-123:MTM4MDAxMzgwMDA=");
      expect(mockUserKeyService.encryptForUser).toHaveBeenCalledWith("user-123", "13800138000");
    });

    it("应该跳过 null 值并返回 null", async () => {
      const result = await service.encryptField(null);
      expect(result).toBeNull();
      expect(mockEncryptionService.encrypt).not.toHaveBeenCalled();
    });

    it("应该跳过 undefined 值并返回 null", async () => {
      const result = await service.encryptField(undefined);
      expect(result).toBeNull();
      expect(mockEncryptionService.encrypt).not.toHaveBeenCalled();
    });

    it("应该跳过空字符串并返回空字符串", async () => {
      const result = await service.encryptField("");
      expect(result).toBe("");
    });

    it("应该跳过已加密的值（enc: 前缀）", async () => {
      const alreadyEncrypted = "enc:alreadyencrypted";
      const result = await service.encryptField(alreadyEncrypted);
      expect(result).toBe("enc:alreadyencrypted");
      expect(mockEncryptionService.encrypt).not.toHaveBeenCalled();
    });

    it("应该在加密失败时抛出异常", async () => {
      mockEncryptionService.encrypt.mockImplementationOnce(() => {
        throw new Error("Encryption error");
      });

      await expect(service.encryptField("sensitive-data")).rejects.toThrow(
        "PII encryption failed",
      );
    });
  });

  describe("decryptField", () => {
    it("应该解密密文", async () => {
      const result = await service.decryptField("enc:MTM4MDAxMzgwMDA=");
      expect(result).toBe("13800138000");
      expect(mockEncryptionService.decrypt).toHaveBeenCalledWith("enc:MTM4MDAxMzgwMDA=");
    });

    it("应该使用用户级密钥解密（提供 userId 时）", async () => {
      const result = await service.decryptField("enc:user-123:MTM4MDAxMzgwMDA=", "user-123");
      expect(result).toBe("13800138000");
      expect(mockUserKeyService.decryptForUser).toHaveBeenCalledWith("user-123", "enc:user-123:MTM4MDAxMzgwMDA=");
    });

    it("应该跳过 null 值并返回 null", async () => {
      const result = await service.decryptField(null);
      expect(result).toBeNull();
    });

    it("应该跳过未加密的值", async () => {
      const result = await service.decryptField("plaintext");
      expect(result).toBe("plaintext");
      expect(mockEncryptionService.decrypt).not.toHaveBeenCalled();
    });

    it("应该在解密失败时返回原始密文", async () => {
      mockEncryptionService.decrypt.mockImplementationOnce(() => {
        throw new Error("Decryption error");
      });

      const result = await service.decryptField("enc:invalid");
      expect(result).toBe("enc:invalid");
    });
  });

  describe("encryptModel", () => {
    it("应该加密 User 模型的所有 PII 字段", async () => {
      const user = {
        id: "user-1",
        phone: "13800138000",
        realName: "张三",
        idNumber: "110101199001011234",
        email: "test@example.com",
      };

      const result = await service.encryptModel("User", user);

      expect(result.phone).not.toBe("13800138000");
      expect(result.phone).toContain("enc:");
      expect(result.realName).toContain("enc:");
      expect(result.idNumber).toContain("enc:");
      expect(result.email).toBe("test@example.com");
    });

    it("应该加密 UserAddress 模型的 PII 字段", async () => {
      const address = {
        id: "addr-1",
        userId: "user-1",
        phone: "13800138000",
        address: "北京市朝阳区xxx",
        name: "张三",
        city: "北京",
      };

      const result = await service.encryptModel("UserAddress", address);

      expect(result.phone).toContain("enc:");
      expect(result.address).toContain("enc:");
      expect(result.name).toContain("enc:");
      expect(result.city).toBe("北京");
    });

    it("应该跳过 null/空字符串字段", async () => {
      const user = {
        id: "user-1",
        phone: null,
        realName: "",
        idNumber: "110101199001011234",
      };

      const result = await service.encryptModel("User", user);

      expect(result.phone).toBeNull();
      expect(result.realName).toBe("");
      expect(result.idNumber).toContain("enc:");
    });

    it("应该跳过已加密的字段", async () => {
      const user = {
        id: "user-1",
        phone: "enc:alreadyencrypted",
        realName: "张三",
        idNumber: "110101199001011234",
      };

      const result = await service.encryptModel("User", user);

      expect(result.phone).toBe("enc:alreadyencrypted");
      expect(mockEncryptionService.encrypt).not.toHaveBeenCalledWith("enc:alreadyencrypted");
    });

    it("应该对未知模型名直接返回原始数据", async () => {
      const data = { name: "test" };
      const result = await service.encryptModel("UnknownModel", data);
      expect(result).toEqual(data);
    });

    it("应该使用 userId 字段作为用户级加密的标识", async () => {
      const user = {
        id: "user-1",
        userId: "user-1",
        phone: "13800138000",
        realName: "张三",
        idNumber: "110101199001011234",
      };

      await service.encryptModel("User", user);

      expect(mockUserKeyService.encryptForUser).toHaveBeenCalledWith("user-1", "13800138000");
    });
  });

  describe("decryptModel", () => {
    it("应该解密 User 模型的所有 PII 字段（无 userId 时使用通用加密）", async () => {
      const user = {
        phone: "enc:MTM4MDAxMzgwMDA=",
        realName: "enc:5byg5LiJ",
        idNumber: "enc:MTEwMTAxMTk5MDAxMDExMjM0",
        email: "test@example.com",
      };

      const result = await service.decryptModel("User", user);

      expect(result.phone).toBe("13800138000");
      expect(result.email).toBe("test@example.com");
    });

    it("应该解密 User 模型的所有 PII 字段（有 userId 时使用用户级加密）", async () => {
      const user = {
        id: "user-1",
        phone: "enc:user-1:MTM4MDAxMzgwMDA=",
        realName: "enc:user-1:5byg5LiJ",
        idNumber: "enc:user-1:MTEwMTAxMTk5MDAxMDExMjM0",
        email: "test@example.com",
      };

      const result = await service.decryptModel("User", user);

      expect(result.phone).toBe("13800138000");
      expect(result.email).toBe("test@example.com");
    });

    it("应该跳过未加密的字段", async () => {
      const user = {
        id: "user-1",
        phone: "13800138000",
        realName: "张三",
        idNumber: "110101199001011234",
      };

      const result = await service.decryptModel("User", user);

      expect(result.phone).toBe("13800138000");
      expect(mockEncryptionService.decrypt).not.toHaveBeenCalled();
    });

    it("应该对未知模型名直接返回原始数据", async () => {
      const data = { name: "enc:test" };
      const result = await service.decryptModel("UnknownModel", data);
      expect(result).toEqual(data);
    });
  });

  describe("isEncrypted", () => {
    it("应该检测 enc: 前缀为已加密", () => {
      expect(service.isEncrypted("enc:somevalue")).toBe(true);
    });

    it("应该检测普通字符串为未加密", () => {
      expect(service.isEncrypted("plaintext")).toBe(false);
    });

    it("应该检测空字符串为未加密", () => {
      expect(service.isEncrypted("")).toBe(false);
    });
  });

  describe("PII_FIELDS 映射", () => {
    it("应该定义 User 模型的 PII 字段", () => {
      expect(PII_FIELDS.User).toEqual(["phone", "realName", "idNumber"]);
    });

    it("应该定义 UserAddress 模型的 PII 字段", () => {
      expect(PII_FIELDS.UserAddress).toEqual(["phone", "address", "name"]);
    });

    it("应该定义 OrderAddress 模型的 PII 字段", () => {
      expect(PII_FIELDS.OrderAddress).toEqual(["phone", "address", "name"]);
    });

    it("应该定义 Brand 模型的 PII 字段", () => {
      expect(PII_FIELDS.Brand).toEqual(["contactEmail", "contactPhone"]);
    });

    it("应该定义 BrandMerchant 模型的 PII 字段", () => {
      expect(PII_FIELDS.BrandMerchant).toEqual(["name"]);
    });

    it("getModelFields 应该返回指定模型的字段", () => {
      expect(service.getModelFields("User")).toEqual(["phone", "realName", "idNumber"]);
    });

    it("getModelFields 对未知模型应返回空数组", () => {
      expect(service.getModelFields("Unknown")).toEqual([]);
    });
  });

  describe("disabled mode (PII_ENCRYPTION_ENABLED=false)", () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SecurityPIIEncryptionService,
          {
            provide: ConfigService,
            useFactory: () => createConfigService({ PII_ENCRYPTION_ENABLED: "false" }),
          },
          { provide: EncryptionService, useValue: mockEncryptionService },
          { provide: UserKeyService, useValue: mockUserKeyService },
        ],
      }).compile();

      service = module.get<SecurityPIIEncryptionService>(SecurityPIIEncryptionService);
      service.onModuleInit();
    });

    it("encryptField 应该直接返回原始值", async () => {
      const result = await service.encryptField("13800138000");
      expect(result).toBe("13800138000");
      expect(mockEncryptionService.encrypt).not.toHaveBeenCalled();
    });

    it("decryptField 应该直接返回原始值", async () => {
      const result = await service.decryptField("enc:something");
      expect(result).toBe("enc:something");
      expect(mockEncryptionService.decrypt).not.toHaveBeenCalled();
    });

    it("encryptModel 应该直接返回原始数据", async () => {
      const user = { id: "1", phone: "13800138000", realName: "张三", idNumber: "123" };
      const result = await service.encryptModel("User", user);
      expect(result).toEqual(user);
    });

    it("decryptModel 应该直接返回原始数据", async () => {
      const user = { id: "1", phone: "enc:test", realName: "enc:test2", idNumber: "enc:test3" };
      const result = await service.decryptModel("User", user);
      expect(result).toEqual(user);
    });

    it("isEnabled 应该返回 false", () => {
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe("production mode", () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SecurityPIIEncryptionService,
          {
            provide: ConfigService,
            useFactory: () => createConfigService({
              NODE_ENV: "production",
              PII_ENCRYPTION_ENABLED: "false",
            }),
          },
          { provide: EncryptionService, useValue: mockEncryptionService },
          { provide: UserKeyService, useValue: mockUserKeyService },
        ],
      }).compile();

      service = module.get<SecurityPIIEncryptionService>(SecurityPIIEncryptionService);
      service.onModuleInit();
    });

    it("生产环境应该强制启用加密，忽略 PII_ENCRYPTION_ENABLED=false", () => {
      expect(service.isEnabled()).toBe(true);
    });
  });
});

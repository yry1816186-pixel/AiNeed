import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { EncryptionService } from "./encryption.service";

describe("EncryptionService", () => {
  let service: EncryptionService;

  const mockEncryptionKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "ENCRYPTION_KEY") {
                return mockEncryptionKey;
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("encrypt and decrypt", () => {
    it("should encrypt and decrypt a string correctly", () => {
      const plaintext = "sensitive data to encrypt";
      const encrypted = service.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.startsWith("enc:")).toBe(true);

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should produce different ciphertext for same plaintext", () => {
      const plaintext = "same data";
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
      
      expect(service.decrypt(encrypted1)).toBe(plaintext);
      expect(service.decrypt(encrypted2)).toBe(plaintext);
    });

    it("should handle empty string", () => {
      const plaintext = "";
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it("should handle special characters", () => {
      const plaintext = "特殊字符 !@#$%^&*()_+-=[]{}|;':\",./<>?";
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it("should return value as-is for non-encrypted data", () => {
      const plaintext = "not-encrypted-value";
      const result = service.decrypt(plaintext);
      expect(result).toBe(plaintext);
    });

    it("should throw error for invalid encrypted data format", () => {
      expect(() => service.decrypt("enc:invalid-base64-data")).toThrow();
    });
  });

  describe("hash and verifyHash", () => {
    it("should hash a string and verify it", () => {
      const data = "data to hash";
      const hash = service.hash(data);
      
      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
      expect(service.verifyHash(data, hash)).toBe(true);
    });

    it("should return false for incorrect hash", () => {
      const data = "data to hash";
      const hash = service.hash(data);
      
      expect(service.verifyHash("wrong data", hash)).toBe(false);
    });

    it("should produce same hash for same input", () => {
      const data = "same input";
      const hash1 = service.hash(data);
      const hash2 = service.hash(data);
      
      expect(hash1).toBe(hash2);
    });
  });
});

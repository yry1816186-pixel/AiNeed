import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { EncryptionService } from "../../../common/encryption/encryption.service";
import { UserKeyService } from "../../../common/security/user-key.service";

export const PII_FIELDS: Record<string, readonly string[]> = {
  User: ["phone", "realName", "idNumber"] as const,
  UserAddress: ["phone", "address", "name"] as const,
  OrderAddress: ["phone", "address", "name"] as const,
  Brand: ["contactEmail", "contactPhone"] as const,
  BrandMerchant: ["name"] as const,
} as const;

export type PIIModel = keyof typeof PII_FIELDS;

@Injectable()
export class SecurityPIIEncryptionService implements OnModuleInit {
  private readonly logger = new Logger(SecurityPIIEncryptionService.name);
  private enabled = true;

  constructor(
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
    private readonly userKeyService: UserKeyService,
  ) {}

  onModuleInit() {
    const nodeEnv = this.configService.get<string>("NODE_ENV", "development");
    const configEnabled = this.configService.get<string>("PII_ENCRYPTION_ENABLED", "true");

    if (nodeEnv === "production") {
      this.enabled = true;
      this.logger.log("PII encryption FORCE ENABLED for production");
    } else {
      this.enabled = configEnabled === "true";
      this.logger.log(this.enabled ? "PII encryption enabled" : "PII encryption DISABLED");
    }
  }

  async encryptField(plaintext: string | null | undefined, userId?: string): Promise<string | null> {
    if (!this.enabled || !plaintext) {
      return plaintext ?? null;
    }
    if (this.isEncrypted(plaintext)) {
      return plaintext;
    }

    try {
      if (userId) {
        return await this.userKeyService.encryptForUser(userId, plaintext);
      }
      return this.encryptionService.encrypt(plaintext);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`encryptField failed: ${message}`);
      throw new InternalServerErrorException(`PII encryption failed: ${message}`);
    }
  }

  async decryptField(ciphertext: string | null | undefined, userId?: string): Promise<string | null> {
    if (!this.enabled || !ciphertext) {
      return ciphertext ?? null;
    }
    if (!this.isEncrypted(ciphertext)) {
      return ciphertext;
    }

    try {
      if (userId) {
        return await this.userKeyService.decryptForUser(userId, ciphertext);
      }
      return this.encryptionService.decrypt(ciphertext);
    } catch (error) {
      this.logger.error(`decryptField failed: ${error instanceof Error ? error.message : String(error)}`);
      return ciphertext;
    }
  }

  async encryptModel<T extends Record<string, unknown>>(modelName: string, data: T): Promise<T> {
    if (!this.enabled || !data) {
      return data;
    }

    const fields = PII_FIELDS[modelName];
    if (!fields) {
      return data;
    }

    const result = { ...data };
    const userId = this.extractUserId(data);

    for (const field of fields) {
      const value = result[field];
      if (typeof value === "string" && value && !this.isEncrypted(value)) {
        (result as Record<string, unknown>)[field] = await this.encryptField(value, userId);
      }
    }

    return result;
  }

  async decryptModel<T extends Record<string, unknown>>(modelName: string, data: T): Promise<T> {
    if (!this.enabled || !data) {
      return data;
    }

    const fields = PII_FIELDS[modelName];
    if (!fields) {
      return data;
    }

    const result = { ...data };
    const userId = this.extractUserId(data);

    for (const field of fields) {
      const value = result[field];
      if (typeof value === "string" && value && this.isEncrypted(value)) {
        try {
          (result as Record<string, unknown>)[field] = await this.decryptField(value, userId);
        } catch (error) {
          this.logger.error(`decryptModel failed for ${modelName}.${field}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    return result;
  }

  isEncrypted(value: string): boolean {
    return value?.startsWith("enc:");
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getModelFields(modelName: string): readonly string[] {
    return PII_FIELDS[modelName] ?? [];
  }

  private extractUserId(data: Record<string, unknown>): string | undefined {
    if (data.userId && typeof data.userId === "string") {
      return data.userId;
    }
    if (data.id && typeof data.id === "string") {
      return data.id;
    }
    return undefined;
  }
}

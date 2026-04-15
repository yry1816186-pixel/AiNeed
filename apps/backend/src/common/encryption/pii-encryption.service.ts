import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { EncryptionService } from "./encryption.service";

export const PII_FIELDS = {
  User: ["phone", "idNumber", "email", "wechatOpenId", "wechatUnionId", "birthDate"],
  UserProfile: ["shoulder", "bust", "waist", "hip", "inseam", "height", "weight"],
  UserAddress: ["phone", "address", "recipientName"],
  OrderAddress: ["phone", "address", "recipientName"],
  Brand: ["contactEmail", "contactPhone"],
} as const;

export type PIIEntity = keyof typeof PII_FIELDS;

@Injectable()
export class PIIEncryptionService implements OnModuleInit {
  private readonly logger = new Logger(PIIEncryptionService.name);
  private enabled: boolean = true;

  constructor(
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
  ) {}

  onModuleInit() {
    const nodeEnv = this.configService.get<string>("NODE_ENV", "development");
    const configEnabled = this.configService.get<string>("PII_ENCRYPTION_ENABLED", "true");

    if (nodeEnv === "production") {
      this.enabled = true;
      this.logger.log("PII encryption FORCE ENABLED for production environment");
    } else if (nodeEnv === "development" && configEnabled === "false") {
      // 仅在开发环境且显式设置 PII_ENCRYPTION_ENABLED=false 时允许禁用
      this.enabled = false;
      this.logger.warn("PII encryption DISABLED in development - NOT RECOMMENDED FOR PRODUCTION");
    } else {
      this.enabled = true;
      this.logger.log("PII encryption enabled");
    }
  }

  encryptPII<T extends Record<string, unknown>>(entity: PIIEntity, data: T): T {
    if (!this.enabled || !data) {
      return data;
    }

    const fields = PII_FIELDS[entity] || [];
    const result = { ...data };

    for (const field of fields) {
      const value = result[field];
      if (typeof value === "string" && value && !this.encryptionService.isEncrypted(value)) {
        (result as Record<string, unknown>)[field] = this.encryptionService.encrypt(value);
      }
    }

    return result;
  }

  decryptPII<T extends Record<string, unknown>>(entity: PIIEntity, data: T): T {
    if (!this.enabled || !data) {
      return data;
    }

    const fields = PII_FIELDS[entity] || [];
    const result = { ...data };

    for (const field of fields) {
      const value = result[field];
      if (typeof value === "string" && value && this.encryptionService.isEncrypted(value)) {
        try {
          (result as Record<string, unknown>)[field] = this.encryptionService.decrypt(value);
        } catch (error) {
          this.logger.error(`Failed to decrypt field ${field}: ${error}`);
        }
      }
    }

    return result;
  }

  encryptPIIArray<T extends Record<string, unknown>>(entity: PIIEntity, dataArray: T[]): T[] {
    if (!this.enabled || !dataArray) {
      return dataArray;
    }
    return dataArray.map((data) => this.encryptPII(entity, data));
  }

  decryptPIIArray<T extends Record<string, unknown>>(entity: PIIEntity, dataArray: T[]): T[] {
    if (!this.enabled || !dataArray) {
      return dataArray;
    }
    return dataArray.map((data) => this.decryptPII(entity, data));
  }

  encryptField(value: string | null | undefined): string | null {
    if (!this.enabled || !value) {
      return value ?? null;
    }
    if (this.encryptionService.isEncrypted(value)) {
      return value;
    }
    return this.encryptionService.encrypt(value);
  }

  decryptField(value: string | null | undefined): string | null {
    if (!this.enabled || !value) {
      return value ?? null;
    }
    if (!this.encryptionService.isEncrypted(value)) {
      return value;
    }
    try {
      return this.encryptionService.decrypt(value);
    } catch (error) {
      this.logger.error(`Failed to decrypt value: ${error}`);
      return value;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

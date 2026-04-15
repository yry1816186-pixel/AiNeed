import { Injectable, Logger, OnModuleInit } from "@nestjs/common";

import { PrismaService } from "../../../common/prisma/prisma.service";

import { SecurityPIIEncryptionService, PII_FIELDS } from "./pii-encryption.service";

@Injectable()
export class PrismaEncryptionMiddleware implements OnModuleInit {
  private readonly logger = new Logger(PrismaEncryptionMiddleware.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly piiEncryption: SecurityPIIEncryptionService,
  ) {}

  onModuleInit() {
    this.prisma.$use(async (params, next) => {
      const model = params.model;
      const action = params.action;

      if (!model || !PII_FIELDS[model]) {
        return next(params);
      }

      const fields = PII_FIELDS[model];

      if (["create", "createMany", "update", "updateMany", "upsert"].includes(action)) {
        const data = params.args?.data;
        if (data) {
          if (Array.isArray(data)) {
            for (const item of data) {
              await this.encryptFields(item, fields, model);
            }
          } else {
            await this.encryptFields(data, fields, model);
          }
        }
      }

      const result = await next(params);

      if (result && ["findUnique", "findFirst", "findMany", "findFirstOrThrow", "findUniqueOrThrow"].includes(action)) {
        if (Array.isArray(result)) {
          for (const item of result) {
            await this.decryptFields(item, fields, model);
          }
        } else {
          await this.decryptFields(result, fields, model);
        }
      }

      return result;
    });

    this.logger.log("Prisma PII encryption middleware registered");
  }

  private async encryptFields(data: Record<string, unknown>, fields: readonly string[], model: string): Promise<void> {
    for (const field of fields) {
      const value = data[field];
      if (typeof value === "string" && value && !this.piiEncryption.isEncrypted(value)) {
        try {
          data[field] = await this.piiEncryption.encryptField(value);
        } catch (error) {
          this.logger.error(`Failed to encrypt ${model}.${field}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }

  private async decryptFields(data: Record<string, unknown>, fields: readonly string[], model: string): Promise<void> {
    for (const field of fields) {
      const value = data[field];
      if (typeof value === "string" && value && this.piiEncryption.isEncrypted(value)) {
        try {
          data[field] = await this.piiEncryption.decryptField(value);
        } catch (error) {
          this.logger.error(`Failed to decrypt ${model}.${field}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }
}

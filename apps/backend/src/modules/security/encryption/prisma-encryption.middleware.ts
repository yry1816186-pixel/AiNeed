import { Logger } from "@nestjs/common";

import { PII_FIELDS, SecurityPIIEncryptionService } from "./pii-encryption.service";

type PrismaAction =
  | "findUnique"
  | "findUniqueOrThrow"
  | "findFirst"
  | "findFirstOrThrow"
  | "findMany"
  | "create"
  | "createMany"
  | "update"
  | "updateMany"
  | "upsert"
  | "delete"
  | "deleteMany";

type PrismaParams = {
  model?: string;
  action: PrismaAction;
  args: Record<string, unknown>;
  dataPath: string[];
};

type PrismaNext = (params: PrismaParams) => Promise<unknown>;

const WRITE_ACTIONS: Set<PrismaAction> = new Set(["create", "createMany", "update", "updateMany", "upsert"]);
const READ_ACTIONS: Set<PrismaAction> = new Set(["findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany"]);

export function createPrismaEncryptionMiddleware(
  piiEncryptionService: SecurityPIIEncryptionService,
) {
  const logger = new Logger("PrismaEncryptionMiddleware");

  return async (params: PrismaParams, next: PrismaNext): Promise<unknown> => {
    const { model, action } = params;

    if (!model || !PII_FIELDS[model]) {
      return next(params);
    }

    if (WRITE_ACTIONS.has(action)) {
      params = await encryptWriteParams(params, piiEncryptionService, logger);
    }

    const result = await next(params);

    if (READ_ACTIONS.has(action) && result != null) {
      return decryptReadResult(result, model, piiEncryptionService, logger);
    }

    return result;
  };
}

async function encryptWriteParams(
  params: PrismaParams,
  service: SecurityPIIEncryptionService,
  logger: Logger,
): Promise<PrismaParams> {
  const fields = PII_FIELDS[params.model!];
  if (!fields) {
    return params;
  }

  const encrypted = { ...params };
  const userId = extractUserIdFromArgs(encrypted.args);

  if (encrypted.args.data) {
    encrypted.args = {
      ...encrypted.args,
      data: await encryptDataObject(encrypted.args.data as Record<string, unknown>, fields, service, userId, logger),
    };
  }

  if (encrypted.args.where && (encrypted.action === "update" || encrypted.action === "updateMany" || encrypted.action === "upsert")) {
    encrypted.args = {
      ...encrypted.args,
      where: await encryptWhereClause(encrypted.args.where as Record<string, unknown>, fields, service, userId, logger),
    };
  }

  if (encrypted.action === "upsert" && encrypted.args.create) {
    encrypted.args = {
      ...encrypted.args,
      create: await encryptDataObject(encrypted.args.create as Record<string, unknown>, fields, service, userId, logger),
    };
  }

  if (encrypted.action === "upsert" && encrypted.args.update) {
    encrypted.args = {
      ...encrypted.args,
      update: await encryptDataObject(encrypted.args.update as Record<string, unknown>, fields, service, userId, logger),
    };
  }

  return encrypted;
}

async function encryptDataObject(
  data: Record<string, unknown>,
  fields: readonly string[],
  service: SecurityPIIEncryptionService,
  userId: string | undefined,
  logger: Logger,
): Promise<Record<string, unknown>> {
  const result = { ...data };

  for (const field of fields) {
    const value = result[field];
    if (typeof value === "string" && value && !service.isEncrypted(value)) {
      try {
        result[field] = await service.encryptField(value, userId);
      } catch (error) {
        logger.error(`Auto-encrypt failed for field ${field}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  return result;
}

async function encryptWhereClause(
  where: Record<string, unknown>,
  fields: readonly string[],
  service: SecurityPIIEncryptionService,
  userId: string | undefined,
  logger: Logger,
): Promise<Record<string, unknown>> {
  const result = { ...where };

  for (const field of fields) {
    const value = result[field];
    if (typeof value === "string" && value && !service.isEncrypted(value)) {
      try {
        result[field] = await service.encryptField(value, userId);
      } catch (error) {
        logger.error(`Auto-encrypt WHERE failed for field ${field}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (value && typeof value === "object" && !service.isEncrypted(String(value))) {
      result[field] = await encryptWhereOperator(value as Record<string, unknown>, field, service, userId, logger);
    }
  }

  return result;
}

async function encryptWhereOperator(
  operator: Record<string, unknown>,
  field: string,
  service: SecurityPIIEncryptionService,
  userId: string | undefined,
  logger: Logger,
): Promise<Record<string, unknown>> {
  const result = { ...operator };

  for (const [op, val] of Object.entries(result)) {
    if (typeof val === "string" && val && !service.isEncrypted(val)) {
      try {
        result[op] = await service.encryptField(val, userId);
      } catch (error) {
        logger.error(`Auto-encrypt WHERE operator failed for ${field}.${op}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  return result;
}

async function decryptReadResult(
  result: unknown,
  model: string,
  service: SecurityPIIEncryptionService,
  logger: Logger,
): Promise<unknown> {
  if (Array.isArray(result)) {
    return Promise.all(result.map((item) => decryptSingleRecord(item, model, service, logger)));
  }

  if (result && typeof result === "object") {
    return decryptSingleRecord(result as Record<string, unknown>, model, service, logger);
  }

  return result;
}

async function decryptSingleRecord(
  record: Record<string, unknown>,
  model: string,
  service: SecurityPIIEncryptionService,
  logger: Logger,
): Promise<Record<string, unknown>> {
  const fields = PII_FIELDS[model];
  if (!fields) {
    return record;
  }

  const result = { ...record };
  const userId = extractUserIdFromRecord(result);

  for (const field of fields) {
    const value = result[field];
    if (typeof value === "string" && value && service.isEncrypted(value)) {
      try {
        result[field] = await service.decryptField(value, userId);
      } catch (error) {
        logger.error(`Auto-decrypt failed for ${model}.${field}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  return result;
}

function extractUserIdFromArgs(args: Record<string, unknown>): string | undefined {
  const data = args.data as Record<string, unknown> | undefined;
  if (data?.userId && typeof data.userId === "string") {
    return data.userId;
  }
  const where = args.where as Record<string, unknown> | undefined;
  if (where?.userId && typeof where.userId === "string") {
    return where.userId;
  }
  return undefined;
}

function extractUserIdFromRecord(record: Record<string, unknown>): string | undefined {
  if (record.userId && typeof record.userId === "string") {
    return record.userId;
  }
  if (record.id && typeof record.id === "string") {
    return record.id;
  }
  return undefined;
}

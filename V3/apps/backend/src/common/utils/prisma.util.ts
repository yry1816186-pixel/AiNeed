import { Logger } from '@nestjs/common';

const logger = new Logger('PrismaUtil');

const PRISMA_TRANSACTION_ERROR_CODES: ReadonlySet<string> = new Set([
  'P2034',
  'P2037',
]);

export async function transactionWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      const prismaError = error as { code?: string; message?: string };
      if (
        prismaError.code &&
        PRISMA_TRANSACTION_ERROR_CODES.has(prismaError.code)
      ) {
        const delayMs = Math.min(100 * Math.pow(2, attempt - 1), 2000);
        logger.warn(
          `Transaction failed (attempt ${attempt}/${maxRetries}), code: ${prismaError.code}. Retrying in ${delayMs}ms...`,
        );

        if (attempt < maxRetries) {
          await sleep(delayMs);
          continue;
        }
      }

      throw error;
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function softDeleteFilter(): { deletedAt: null } {
  return { deletedAt: null };
}

export function excludeFields<T extends Record<string, unknown>>(
  model: T,
  fields: string[],
): Partial<T> {
  const result: Record<string, unknown> = {};
  const excludeSet = new Set(fields);

  for (const [key, value] of Object.entries(model)) {
    if (!excludeSet.has(key)) {
      result[key] = value;
    }
  }

  return result as Partial<T>;
}

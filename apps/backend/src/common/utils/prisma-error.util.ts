/**
 * @fileoverview Prisma 错误码映射工具函数
 *
 * 消除 error.interceptor.ts 和 all-exceptions.filter.ts 中重复的
 * Prisma 错误码到 HTTP 状态码/消息/标题的映射逻辑。
 *
 * 两个文件中的映射关系完全一致：
 *   P2002 -> 409 Conflict (唯一约束冲突)
 *   P2025 -> 404 Not Found (记录不存在)
 *   P2003 -> 404 Not Found (外键约束失败)
 *   P2011 -> 422 Unprocessable Entity (非空约束失败)
 *
 * @module common/utils/prisma-error
 */

import { HttpStatus } from "@nestjs/common";

/**
 * Prisma 错误码到映射结果的接口
 */
export interface PrismaErrorMapping {
  /** HTTP 状态码 */
  status: number;
  /** 错误标题（英文） */
  title: string;
  /** 生产环境面向用户的错误消息 */
  detail: string;
  /** 5 位业务错误码（格式: XXYYZ） */
  businessCode: number;
}

/**
 * Prisma 错误码映射表
 *
 * 错误码参考: https://www.prisma.io/docs/reference/api-reference/error-reference
 *
 * 业务错误码格式: XXYYZ
 * - XX: 错误类别 (40=客户端, 50=服务端)
 * - YY: 具体错误类型
 * - Z: 严重程度 (0=低, 9=高)
 */
const PRISMA_ERROR_MAP: Record<string, PrismaErrorMapping> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    title: "Conflict",
    detail: "Resource already exists",
    businessCode: 40901,
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    title: "Not Found",
    detail: "Resource not found",
    businessCode: 40401,
  },
  P2003: {
    status: HttpStatus.NOT_FOUND,
    title: "Not Found",
    detail: "Related resource not found",
    businessCode: 40402,
  },
  P2011: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    title: "Unprocessable Entity",
    detail: "Required field is missing",
    businessCode: 42201,
  },
};

/** 默认映射（未匹配到已知错误码时使用） */
const DEFAULT_MAPPING: PrismaErrorMapping = {
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  title: "Internal Server Error",
  detail: "Database operation failed",
  businessCode: 50001,
};

/**
 * 根据 Prisma 错误码获取映射结果
 *
 * @param code - Prisma 错误码（如 'P2002', 'P2025'）
 * @returns 错误映射信息，包含 HTTP 状态码、标题、详情和业务错误码
 *
 * @example
 * ```typescript
 * // 在异常过滤器中使用
 * if (exception instanceof PrismaClientKnownRequestError) {
 *   const mapping = getPrismaErrorMapping(exception.code);
 *   return {
 *     status: mapping.status,
 *     code: mapping.businessCode,
 *     message: this.isProduction ? mapping.detail : exception.message,
 *   };
 * }
 * ```
 */
export function getPrismaErrorMapping(code: string): PrismaErrorMapping {
  return PRISMA_ERROR_MAP[code] ?? DEFAULT_MAPPING;
}

/**
 * 根据 Prisma 错误码获取 HTTP 状态码
 *
 * @param code - Prisma 错误码
 * @returns HTTP 状态码
 *
 * @example
 * ```typescript
 * const statusCode = getPrismaStatusCode('P2002'); // 409
 * ```
 */
export function getPrismaStatusCode(code: string): number {
  return getPrismaErrorMapping(code).status;
}

/**
 * 根据 Prisma 错误码获取生产环境面向用户的错误消息
 *
 * @param code - Prisma 错误码
 * @returns 错误消息字符串
 */
export function getPrismaErrorDetail(code: string): string {
  return getPrismaErrorMapping(code).detail;
}

/**
 * 判断是否为已知的 Prisma 错误码
 *
 * @param code - Prisma 错误码
 * @returns 是否在已知映射表中
 */
export function isKnownPrismaError(code: string): boolean {
  return code in PRISMA_ERROR_MAP;
}

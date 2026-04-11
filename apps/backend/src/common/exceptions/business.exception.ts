/**
 * @fileoverview 业务异常基类
 *
 * 用于表示业务逻辑层面的错误，区别于系统错误和验证错误。
 * 支持自定义错误码、错误详情和多语言消息。
 *
 * @example
 * ```typescript
 * throw new BusinessException(
 *   'USER_BALANCE_INSUFFICIENT',
 *   '用户余额不足',
 *   { currentBalance: 100, requiredAmount: 200 }
 * );
 * ```
 */

import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 业务错误详情接口
 */
export interface BusinessErrorDetails {
  [key: string]: unknown;
}

/**
 * 业务错误码枚举
 * 格式: XXYYZ
 * - XX: 错误类别 (40=客户端, 50=服务端)
 * - YY: 具体错误类型
 * - Z: 严重程度 (0=低, 9=高)
 */
export enum BusinessErrorCode {
  // 用户相关错误 (401xx)
  USER_NOT_FOUND = 40101,
  USER_ALREADY_EXISTS = 40102,
  USER_BALANCE_INSUFFICIENT = 40103,
  USER_ACCOUNT_DISABLED = 40104,
  USER_CREDENTIALS_INVALID = 40105,

  // 认证相关错误 (401xx)
  AUTH_TOKEN_EXPIRED = 40110,
  AUTH_TOKEN_INVALID = 40111,
  AUTH_PERMISSION_DENIED = 40112,
  AUTH_SESSION_EXPIRED = 40113,

  // 资源相关错误 (404xx)
  RESOURCE_NOT_FOUND = 40401,
  RESOURCE_ALREADY_EXISTS = 40402,
  RESOURCE_LOCKED = 40403,
  RESOURCE_EXPIRED = 40404,

  // 操作相关错误 (409xx)
  OPERATION_CONFLICT = 40901,
  OPERATION_TIMEOUT = 40902,
  OPERATION_CANCELLED = 40903,

  // 业务规则错误 (422xx)
  BUSINESS_RULE_VIOLATION = 42201,
  INVALID_OPERATION_STATE = 42202,
  QUOTA_EXCEEDED = 42203,

  // 第三方服务错误 (502xx)
  EXTERNAL_SERVICE_ERROR = 50201,
  EXTERNAL_SERVICE_TIMEOUT = 50202,
  EXTERNAL_SERVICE_UNAVAILABLE = 50203,

  // AI 服务错误 (503xx)
  AI_SERVICE_ERROR = 50301,
  AI_MODEL_UNAVAILABLE = 50302,
  AI_INFERENCE_FAILED = 50303,
}

/**
 * 业务异常类
 *
 * @class BusinessException
 * @extends HttpException
 */
export class BusinessException extends HttpException {
  /**
   * 业务错误码
   */
  readonly businessCode: BusinessErrorCode | number;

  /**
   * 错误标识符（用于前端国际化）
   */
  readonly errorKey: string;

  /**
   * 错误详情（用于调试和前端展示）
   */
  readonly details?: BusinessErrorDetails;

  /**
   * HTTP 状态码
   */
  readonly httpStatus: HttpStatus;

  /**
   * 构造函数
   *
   * @param errorKey 错误标识符（用于前端国际化）
   * @param message 错误消息
   * @param details 错误详情
   * @param businessCode 业务错误码（可选，默认根据 HTTP 状态码推断）
   * @param httpStatus HTTP 状态码（可选，默认 400）
   */
  constructor(
    errorKey: string,
    message: string,
    details?: BusinessErrorDetails,
    businessCode?: BusinessErrorCode | number,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        message,
        errorKey,
        code: businessCode ?? BusinessException.inferBusinessCode(httpStatus),
        details,
      },
      httpStatus,
    );

    this.errorKey = errorKey;
    this.businessCode = businessCode ?? BusinessException.inferBusinessCode(httpStatus);
    this.details = details;
    this.httpStatus = httpStatus;

    // 确保原型链正确
    Object.setPrototypeOf(this, BusinessException.prototype);
  }

  /**
   * 根据 HTTP 状态码推断业务错误码
   */
  private static inferBusinessCode(status: HttpStatus): number {
    const mapping: Record<number, number> = {
      [HttpStatus.BAD_REQUEST]: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
      [HttpStatus.UNAUTHORIZED]: BusinessErrorCode.AUTH_TOKEN_INVALID,
      [HttpStatus.FORBIDDEN]: BusinessErrorCode.AUTH_PERMISSION_DENIED,
      [HttpStatus.NOT_FOUND]: BusinessErrorCode.RESOURCE_NOT_FOUND,
      [HttpStatus.CONFLICT]: BusinessErrorCode.OPERATION_CONFLICT,
      [HttpStatus.UNPROCESSABLE_ENTITY]: BusinessErrorCode.INVALID_OPERATION_STATE,
      [HttpStatus.INTERNAL_SERVER_ERROR]: BusinessErrorCode.EXTERNAL_SERVICE_ERROR,
      [HttpStatus.BAD_GATEWAY]: BusinessErrorCode.EXTERNAL_SERVICE_ERROR,
      [HttpStatus.SERVICE_UNAVAILABLE]: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
      [HttpStatus.GATEWAY_TIMEOUT]: BusinessErrorCode.EXTERNAL_SERVICE_TIMEOUT,
    };

    return mapping[status] ?? BusinessErrorCode.BUSINESS_RULE_VIOLATION;
  }

  /**
   * 创建用户不存在异常
   */
  static userNotFound(userId: string): BusinessException {
    return new BusinessException(
      'USER_NOT_FOUND',
      '用户不存在',
      { userId },
      BusinessErrorCode.USER_NOT_FOUND,
      HttpStatus.NOT_FOUND,
    );
  }

  /**
   * 创建余额不足异常
   */
  static insufficientBalance(
    currentBalance: number,
    requiredAmount: number,
  ): BusinessException {
    return new BusinessException(
      'USER_BALANCE_INSUFFICIENT',
      '用户余额不足',
      { currentBalance, requiredAmount },
      BusinessErrorCode.USER_BALANCE_INSUFFICIENT,
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * 创建资源不存在异常
   */
  static resourceNotFound(
    resourceType: string,
    resourceId: string,
  ): BusinessException {
    return new BusinessException(
      'RESOURCE_NOT_FOUND',
      `${resourceType} 不存在`,
      { resourceType, resourceId },
      BusinessErrorCode.RESOURCE_NOT_FOUND,
      HttpStatus.NOT_FOUND,
    );
  }

  /**
   * 创建外部服务错误异常
   */
  static externalServiceError(
    serviceName: string,
    originalError?: string,
  ): BusinessException {
    return new BusinessException(
      'EXTERNAL_SERVICE_ERROR',
      `${serviceName} 服务异常`,
      { serviceName, originalError },
      BusinessErrorCode.EXTERNAL_SERVICE_ERROR,
      HttpStatus.BAD_GATEWAY,
    );
  }

  /**
   * 创建 AI 服务错误异常
   */
  static aiServiceError(
    serviceName: string,
    originalError?: string,
  ): BusinessException {
    return new BusinessException(
      'AI_SERVICE_ERROR',
      `${serviceName} AI 服务异常`,
      { serviceName, originalError },
      BusinessErrorCode.AI_SERVICE_ERROR,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

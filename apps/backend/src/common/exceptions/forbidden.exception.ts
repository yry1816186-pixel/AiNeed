/**
 * @fileoverview 权限不足异常类
 *
 * 用于表示用户权限不足的场景，支持细粒度的权限控制。
 * 提供清晰的权限缺失信息和操作上下文。
 *
 * @example
 * ```typescript
 * throw new ForbiddenException('delete_user', 'user:delete');
 * throw ForbiddenException.notOwner('clothing', 'clothing-123');
 * throw ForbiddenException.subscriptionRequired('premium');
 * ```
 */

import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 权限类型枚举
 */
export enum PermissionType {
  // 用户权限
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',

  // 服装权限
  CLOTHING_READ = 'clothing:read',
  CLOTHING_WRITE = 'clothing:write',
  CLOTHING_DELETE = 'clothing:delete',

  // 试衣权限
  TRY_ON_CREATE = 'try-on:create',
  TRY_ON_READ = 'try-on:read',

  // AI 服务权限
  AI_STYLIST_CHAT = 'ai-stylist:chat',
  AI_RECOMMENDATION = 'ai:recommendation',

  // 管理员权限
  ADMIN_ACCESS = 'admin:access',
  ADMIN_MANAGE_USERS = 'admin:manage-users',
  ADMIN_MANAGE_CONTENT = 'admin:manage-content',

  // 商家权限
  MERCHANT_ACCESS = 'merchant:access',
  MERCHANT_MANAGE_PRODUCTS = 'merchant:manage-products',
}

/**
 * 订阅层级枚举
 */
export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

/**
 * 权限不足异常类
 *
 * @class ForbiddenException
 * @extends HttpException
 */
export class ForbiddenException extends HttpException {
  /**
   * 操作名称
   */
  readonly operation: string;

  /**
   * 所需权限
   */
  readonly requiredPermission?: string;

  /**
   * 业务错误码
   */
  readonly code: number;

  /**
   * 构造函数
   *
   * @param operation 操作名称
   * @param requiredPermission 所需权限
   * @param message 自定义错误消息
   */
  constructor(
    operation: string,
    requiredPermission?: string | PermissionType,
    message?: string,
  ) {
    const errorMessage = message ?? `您没有权限执行此操作: ${operation}`;

    super(
      {
        message: errorMessage,
        code: 40300,
        operation,
        requiredPermission,
      },
      HttpStatus.FORBIDDEN,
    );

    this.operation = operation;
    this.requiredPermission = requiredPermission;
    this.code = 40300;

    // 确保原型链正确
    Object.setPrototypeOf(this, ForbiddenException.prototype);
  }

  /**
   * 创建非资源所有者异常
   */
  static notOwner(
    resourceType: string,
    resourceId: string,
  ): ForbiddenException {
    return new ForbiddenException(
      `access_${resourceType.toLowerCase()}`,
      undefined,
      `您不是此${resourceType}的所有者，无权访问`,
    );
  }

  /**
   * 创建订阅权限不足异常
   */
  static subscriptionRequired(
    requiredTier: string | SubscriptionTier,
    feature?: string,
  ): ForbiddenException {
    const featureMessage = feature ? `使用 ${feature} 功能` : '执行此操作';
    return new ForbiddenException(
      'check_subscription',
      undefined,
      `${featureMessage}需要 ${requiredTier} 订阅`,
    );
  }

  /**
   * 创建管理员权限不足异常
   */
  static adminRequired(operation?: string): ForbiddenException {
    return new ForbiddenException(
      operation ?? 'admin_operation',
      PermissionType.ADMIN_ACCESS,
      '此操作需要管理员权限',
    );
  }

  /**
   * 创建商家权限不足异常
   */
  static merchantRequired(operation?: string): ForbiddenException {
    return new ForbiddenException(
      operation ?? 'merchant_operation',
      PermissionType.MERCHANT_ACCESS,
      '此操作需要商家权限',
    );
  }

  /**
   * 创建账户已禁用异常
   */
  static accountDisabled(reason?: string): ForbiddenException {
    const message = reason
      ? `账户已被禁用: ${reason}`
      : '账户已被禁用，请联系客服';
    return new ForbiddenException('check_account_status', undefined, message);
  }

  /**
   * 创建 IP 被封禁异常
   */
  static ipBanned(): ForbiddenException {
    return new ForbiddenException(
      'check_ip_status',
      undefined,
      '您的 IP 已被封禁，请联系客服',
    );
  }

  /**
   * 创建操作频率超限异常
   */
  static rateLimitExceeded(
    operation: string,
    retryAfter?: number,
  ): ForbiddenException {
    const message = retryAfter
      ? `操作过于频繁，请在 ${retryAfter} 秒后重试`
      : '操作过于频繁，请稍后重试';
    return new ForbiddenException(operation, undefined, message);
  }

  /**
   * 创建资源访问受限异常
   */
  static resourceAccessDenied(
    resourceType: string,
    reason?: string,
  ): ForbiddenException {
    const message = reason
      ? `无法访问此${resourceType}: ${reason}`
      : `无法访问此${resourceType}`;
    return new ForbiddenException(
      `access_${resourceType.toLowerCase()}`,
      undefined,
      message,
    );
  }

  /**
   * 创建功能未开放异常
   */
  static featureNotAvailable(feature: string): ForbiddenException {
    return new ForbiddenException(
      'check_feature_availability',
      undefined,
      `${feature} 功能暂未开放`,
    );
  }
}

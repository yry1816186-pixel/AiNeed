/**
 * @fileoverview 资源不存在异常类
 *
 * 用于表示请求的资源不存在的场景，支持多种资源类型。
 * 自动生成友好的错误消息和标准化的错误响应。
 *
 * @example
 * ```typescript
 * throw new NotFoundException('User', 'user-123');
 * throw NotFoundException.user('user-123');
 * throw NotFoundException.clothing('shirt-456');
 * ```
 */

import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 资源类型枚举（常用资源）
 */
export enum ResourceType {
  USER = 'User',
  CLOTHING = 'Clothing',
  OUTFIT = 'Outfit',
  TRY_ON = 'TryOn',
  SESSION = 'Session',
  MESSAGE = 'Message',
  RECOMMENDATION = 'Recommendation',
  FAVORITE = 'Favorite',
  CART = 'Cart',
  ORDER = 'Order',
  SUBSCRIPTION = 'Subscription',
  NOTIFICATION = 'Notification',
  PHOTO = 'Photo',
  PROFILE = 'Profile',
  BRAND = 'Brand',
  CATEGORY = 'Category',
  TAG = 'Tag',
}

/**
 * 资源不存在异常类
 *
 * @class NotFoundException
 * @extends HttpException
 */
export class NotFoundException extends HttpException {
  /**
   * 资源类型
   */
  readonly resourceType: string;

  /**
   * 资源标识符
   */
  readonly resourceId: string;

  /**
   * 业务错误码
   */
  readonly code: number;

  /**
   * 构造函数
   *
   * @param resourceType 资源类型
   * @param resourceId 资源标识符
   * @param message 自定义错误消息（可选）
   */
  constructor(
    resourceType: string | ResourceType,
    resourceId: string,
    message?: string,
  ) {
    const errorMessage = message ?? `${resourceType} 不存在`;

    super(
      {
        message: errorMessage,
        code: 40401,
        resourceType,
        resourceId,
      },
      HttpStatus.NOT_FOUND,
    );

    this.resourceType = resourceType;
    this.resourceId = resourceId;
    this.code = 40401;

    // 确保原型链正确
    Object.setPrototypeOf(this, NotFoundException.prototype);
  }

  /**
   * 创建用户不存在异常
   */
  static user(userId: string): NotFoundException {
    return new NotFoundException(ResourceType.USER, userId, '用户不存在');
  }

  /**
   * 创建服装不存在异常
   */
  static clothing(clothingId: string): NotFoundException {
    return new NotFoundException(ResourceType.CLOTHING, clothingId, '服装不存在');
  }

  /**
   * 创建穿搭不存在异常
   */
  static outfit(outfitId: string): NotFoundException {
    return new NotFoundException(ResourceType.OUTFIT, outfitId, '穿搭不存在');
  }

  /**
   * 创建试衣记录不存在异常
   */
  static tryOn(tryOnId: string): NotFoundException {
    return new NotFoundException(ResourceType.TRY_ON, tryOnId, '试衣记录不存在');
  }

  /**
   * 创建会话不存在异常
   */
  static session(sessionId: string): NotFoundException {
    return new NotFoundException(ResourceType.SESSION, sessionId, '会话不存在');
  }

  /**
   * 创建消息不存在异常
   */
  static message(messageId: string): NotFoundException {
    return new NotFoundException(ResourceType.MESSAGE, messageId, '消息不存在');
  }

  /**
   * 创建推荐不存在异常
   */
  static recommendation(recommendationId: string): NotFoundException {
    return new NotFoundException(
      ResourceType.RECOMMENDATION,
      recommendationId,
      '推荐不存在',
    );
  }

  /**
   * 创建收藏不存在异常
   */
  static favorite(favoriteId: string): NotFoundException {
    return new NotFoundException(ResourceType.FAVORITE, favoriteId, '收藏不存在');
  }

  /**
   * 创建购物车不存在异常
   */
  static cart(cartId: string): NotFoundException {
    return new NotFoundException(ResourceType.CART, cartId, '购物车不存在');
  }

  /**
   * 创建订单不存在异常
   */
  static order(orderId: string): NotFoundException {
    return new NotFoundException(ResourceType.ORDER, orderId, '订单不存在');
  }

  /**
   * 创建订阅不存在异常
   */
  static subscription(subscriptionId: string): NotFoundException {
    return new NotFoundException(
      ResourceType.SUBSCRIPTION,
      subscriptionId,
      '订阅不存在',
    );
  }

  /**
   * 创建通知不存在异常
   */
  static notification(notificationId: string): NotFoundException {
    return new NotFoundException(
      ResourceType.NOTIFICATION,
      notificationId,
      '通知不存在',
    );
  }

  /**
   * 创建照片不存在异常
   */
  static photo(photoId: string): NotFoundException {
    return new NotFoundException(ResourceType.PHOTO, photoId, '照片不存在');
  }

  /**
   * 创建形象档案不存在异常
   */
  static profile(profileId: string): NotFoundException {
    return new NotFoundException(ResourceType.PROFILE, profileId, '形象档案不存在');
  }

  /**
   * 创建品牌不存在异常
   */
  static brand(brandId: string): NotFoundException {
    return new NotFoundException(ResourceType.BRAND, brandId, '品牌不存在');
  }

  /**
   * 创建分类不存在异常
   */
  static category(categoryId: string): NotFoundException {
    return new NotFoundException(ResourceType.CATEGORY, categoryId, '分类不存在');
  }

  /**
   * 创建标签不存在异常
   */
  static tag(tagId: string): NotFoundException {
    return new NotFoundException(ResourceType.TAG, tagId, '标签不存在');
  }
}

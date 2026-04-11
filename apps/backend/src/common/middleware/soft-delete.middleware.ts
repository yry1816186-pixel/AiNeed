import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Soft Delete Middleware
 *
 * 这个中间件自动将 DELETE 请求转换为软删除操作
 * 通过设置 req.softDelete 标志，让服务层知道应该执行软删除
 *
 * 软删除实体列表：
 * - ClothingItem (商品)
 * - Order (订单)
 * - CommunityPost (社区帖子)
 * - PostComment (评论)
 */
@Injectable()
export class SoftDeleteMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SoftDeleteMiddleware.name);

  /**
   * 需要软删除的实体路由模式
   */
  private readonly softDeletePatterns = [
    // Clothing items
    /\/clothing\/[\w-]+$/,
    // Orders
    /\/orders\/[\w-]+$/,
    // Community posts
    /\/posts\/[\w-]+$/,
    // Comments
    /\/comments\/[\w-]+$/,
  ];

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;

    // 只处理 DELETE 请求
    if (method === 'DELETE') {
      // 检查是否是软删除实体的端点
      const shouldSoftDelete = this.softDeletePatterns.some(pattern =>
        pattern.test(req.path || originalUrl),
      );

      if (shouldSoftDelete) {
        // 设置软删除标志
        (req as any).softDelete = true;

        this.logger.debug(
          `Soft delete detected for ${method} ${originalUrl}`,
        );
      }
    }

    next();
  }

  /**
   * 检查请求是否应该执行软删除
   */
  isSoftDeleteRequest(req: Request): boolean {
    return (req as any).softDelete === true;
  }
}

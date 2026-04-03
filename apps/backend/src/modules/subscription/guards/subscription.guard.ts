import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { SubscriptionService } from "../subscription.service";

export const FEATURE_KEY = "feature";

/**
 * 订阅权限守卫
 * 检查用户是否有权限使用某个功能
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 获取所需功能
    const requiredFeature = this.reflector.getAllAndOverride<string>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) {
      return true; // 没有功能要求，放行
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    // 检查权限
    const result = await this.subscriptionService.checkPermission(
      user.id,
      requiredFeature,
    );

    if (!result.allowed) {
      throw new ForbiddenException(
        `您已达到使用上限（${result.limit}次/月），请升级会员`,
      );
    }

    // 记录使用
    await this.subscriptionService.recordUsage(user.id, requiredFeature);

    // 在响应头中返回剩余次数
    const response = context.switchToHttp().getResponse();
    response.setHeader("X-RateLimit-Limit", result.limit);
    response.setHeader("X-RateLimit-Remaining", result.remaining);

    return true;
  }
}

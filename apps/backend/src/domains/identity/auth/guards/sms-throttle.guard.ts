/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, CanActivate, ExecutionContext, BadRequestException } from "@nestjs/common";

import { RedisService } from "../../../../common/redis/redis.service";

@Injectable()
export class SmsThrottleGuard implements CanActivate {
  constructor(private redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ body: { phone?: string } }>();
    const phone = request.body?.phone;

    if (!phone) {
      throw new BadRequestException("手机号不能为空");
    }

    const throttleKey = `sms:throttle:${phone}`;
    const isThrottled = await this.redisService.exists(throttleKey);

    if (isThrottled) {
      throw new BadRequestException("发送过于频繁，请60秒后再试");
    }

    return true;
  }
}

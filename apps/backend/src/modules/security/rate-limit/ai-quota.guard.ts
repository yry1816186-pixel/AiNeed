import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';

import { JwtUserPayload } from '../../../common/types/common.types';

import { AiQuotaService, QuotaType as QuotaTypeEnum } from './ai-quota.service';

export const QUOTA_TYPE_KEY = 'quotaType';

export const SetQuotaType = (type: QuotaTypeEnum) => SetMetadata(QUOTA_TYPE_KEY, type);

interface RequestWithUser extends Request {
  user?: JwtUserPayload;
}

@Injectable()
export class AiQuotaGuard implements CanActivate {
  constructor(
    private readonly quotaService: AiQuotaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const quotaType = this.reflector.getAllAndOverride<QuotaTypeEnum>(
      QUOTA_TYPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!quotaType) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();

    const userId = request.user?.id;
    if (!userId) {
      throw new HttpException(
        { message: 'Authentication required', quotaType },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const result = await this.quotaService.consumeQuota(userId, quotaType);

    const limit = quotaType === 'ai-stylist'
      ? Number(process.env.AI_STYLIST_DAILY_LIMIT ?? 10)
      : Number(process.env.TRY_ON_DAILY_LIMIT ?? 3);

    response.setHeader('X-RateLimit-Limit', String(limit));
    response.setHeader('X-RateLimit-Remaining', String(result.remaining));
    response.setHeader(
      'X-RateLimit-Reset',
      String(Math.floor(result.resetAt.getTime() / 1000)),
    );

    if (!result.consumed) {
      const retryAfter = Math.ceil(
        (result.resetAt.getTime() - Date.now()) / 1000,
      );

      throw new HttpException(
        {
          message: `Daily quota exceeded for ${quotaType}`,
          retryAfter,
          quotaType,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}

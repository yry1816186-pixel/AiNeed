/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, ExecutionContext, Logger } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";

import { JwtUserPayload } from "../../../../common/types";

const logger = new Logger("OptionalAuthGuard");

@Injectable()
export class OptionalAuthGuard extends AuthGuard("jwt") {
  constructor() {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // 尝试验证 JWT，但不强制要求
      await super.canActivate(context);
      return true;
    } catch (error) {
      // Log unexpected errors (not missing/expired token) for debugging
      const request = context.switchToHttp().getRequest<Request>();
      const authHeader = request.headers.authorization;
      if (authHeader) {
        // Token was provided but failed validation - log for security monitoring
        const message = error instanceof Error ? error.message : "Unknown error";
        logger.warn(`Optional auth failed for request with Authorization header: ${message}`);
      }
      // 即使验证失败也允许访问
      return true;
    }
  }

  handleRequest<TUser = JwtUserPayload>(err: Error | null, user: TUser | false, _info: unknown, _context: ExecutionContext): TUser | null {
    // 不抛出错误，允许无用户访问
    return user || null;
  }
}

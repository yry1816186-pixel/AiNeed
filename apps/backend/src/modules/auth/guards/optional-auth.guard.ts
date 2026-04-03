import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";

import { JwtUserPayload } from "../../../common/types";

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
      // 即使验证失败也允许访问
      return true;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest<TUser = JwtUserPayload>(err: Error | null, user: TUser | false, info: any, context: ExecutionContext): TUser | null {
    // 不抛出错误，允许无用户访问
    return user || null;
  }
}

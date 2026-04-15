import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from "@nestjs/common";
import { Request } from "express";

import { PaymentRawCallbackData } from "../types/common.types";

/**
 * 支付安全守卫
 * 验证支付请求的有效性和安全性
 */
@Injectable()
export class PaymentSecurityGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 检查是否为 POST 请求
    if (request.method !== "POST") {
      return true;
    }

    const body = request.body as PaymentRawCallbackData;
    const orderId = body?.orderId;

    // 检查订单ID是否存在（仅对需要订单ID的操作）
    if (orderId === undefined && request.path.includes("/close")) {
      throw new BadRequestException("订单ID不能为空");
    }

    // 基本安全检查通过
    return true;
  }
}

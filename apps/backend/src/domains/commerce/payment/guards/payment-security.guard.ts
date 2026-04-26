import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { Request } from "express";

const MAX_CALLBACK_BODY_SIZE = 64 * 1024;
const WECHAT_CALLBACK_REQUIRED_FIELDS = [
  "id",
  "create_time",
  "resource_type",
  "event_type",
  "resource",
];
const ALIPAY_CALLBACK_REQUIRED_FIELDS = [
  "out_trade_no",
  "trade_no",
  "trade_status",
  "sign",
  "sign_type",
];

@Injectable()
export class PaymentSecurityGuard implements CanActivate {
  private readonly logger = new Logger(PaymentSecurityGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (request.method !== "POST") {
      return true;
    }

    const path = request.path || request.url;
    const body = request.body;

    if (!body || typeof body !== "object") {
      this.logger.warn(
        `Payment callback rejected: invalid body type from ${this.maskIp(request.ip)}`
      );
      throw new BadRequestException("Invalid callback payload");
    }

    const bodyStr = JSON.stringify(body);
    if (bodyStr.length > MAX_CALLBACK_BODY_SIZE) {
      this.logger.warn(
        `Payment callback rejected: body too large (${bodyStr.length} bytes) from ${this.maskIp(
          request.ip
        )}`
      );
      throw new BadRequestException("Callback payload too large");
    }

    if (path.includes("/callback/wechat")) {
      this.validateWechatCallback(body, request.ip);
    } else if (path.includes("/callback/alipay")) {
      this.validateAlipayCallback(body, request.ip);
    }

    return true;
  }

  private validateWechatCallback(body: Record<string, unknown>, ip: string | undefined): void {
    for (const field of WECHAT_CALLBACK_REQUIRED_FIELDS) {
      if (!body[field]) {
        this.logger.warn(
          `Wechat callback rejected: missing required field '${field}' from ${this.maskIp(ip)}`
        );
        throw new BadRequestException(`Missing required field: ${field}`);
      }
    }

    const resource = body.resource as Record<string, unknown> | undefined;
    if (!resource?.ciphertext || !resource.nonce || !resource.algorithm) {
      this.logger.warn(
        `Wechat callback rejected: invalid resource structure from ${this.maskIp(ip)}`
      );
      throw new BadRequestException("Invalid callback resource structure");
    }
  }

  private validateAlipayCallback(body: Record<string, unknown>, ip: string | undefined): void {
    for (const field of ALIPAY_CALLBACK_REQUIRED_FIELDS) {
      if (!body[field]) {
        this.logger.warn(
          `Alipay callback rejected: missing required field '${field}' from ${this.maskIp(ip)}`
        );
        throw new BadRequestException(`Missing required field: ${field}`);
      }
    }
  }

  private maskIp(ip: string | undefined): string {
    if (!ip) {
      return "unknown";
    }
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.*`;
    }
    return ip.slice(0, 4) + "***";
  }
}

import * as crypto from "crypto";

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";

@Injectable()
export class PartnerAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const fullApiKey = request.headers["x-api-key"];
    const timestamp = request.headers["x-timestamp"];
    const providedSignature = request.headers["x-signature"];

    if (!fullApiKey || !timestamp || !providedSignature) {
      throw new UnauthorizedException("Missing required authentication headers");
    }

    const timestampNum = Number(timestamp);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (Math.abs(now - timestampNum) > fiveMinutes) {
      throw new UnauthorizedException("Request timestamp expired");
    }

    const keyPrefix = fullApiKey.substring(0, 8);

    const partnerKey = await (this.prisma as any).partnerApiKey.findFirst({
      where: { keyPrefix },
    });

    if (!partnerKey) {
      throw new UnauthorizedException("Invalid API key");
    }

    if (partnerKey.status !== "active") {
      throw new UnauthorizedException("API key is not active");
    }

    if (partnerKey.expiresAt && new Date(partnerKey.expiresAt) < new Date()) {
      throw new UnauthorizedException("API key has expired");
    }

    const method = request.method;
    const path = request.url;
    const body = request.body ? JSON.stringify(request.body) : "";

    const expectedSignature = crypto
      .createHmac("sha256", fullApiKey)
      .update(String(timestamp) + method + path + body)
      .digest("hex");

    if (expectedSignature !== providedSignature) {
      throw new UnauthorizedException("Invalid signature");
    }

    request["partnerApiKey"] = partnerKey;
    return true;
  }
}

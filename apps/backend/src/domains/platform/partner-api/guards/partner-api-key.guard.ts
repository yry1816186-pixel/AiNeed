import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";

@Injectable()
export class PartnerApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers["x-api-key"];

    if (!apiKey) {
      throw new UnauthorizedException("Missing API key");
    }

    const keyPrefix = apiKey.substring(0, 8);

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

    request["partnerApiKey"] = partnerKey;
    return true;
  }
}

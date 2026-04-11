import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as jwt from "jsonwebtoken";

import { JwtUserPayload } from "../../../common/types/common.types";
import { PrismaService } from "../../../common/prisma/prisma.service";

interface MerchantJwtPayload extends JwtUserPayload {
  merchantId?: string;
}

@Injectable()
export class MerchantAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("No token provided");
    }

    const jwtSecret = this.configService.get<string>("JWT_SECRET");
    if (!jwtSecret) {
      throw new Error("JWT_SECRET environment variable is required");
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as MerchantJwtPayload;

      const merchant = await this.prisma.brandMerchant.findUnique({
        where: { id: decoded.merchantId },
        include: { brand: true },
      });

      if (!merchant?.isActive) {
        throw new UnauthorizedException("Merchant not found or inactive");
      }

      request.merchant = merchant;
      return true;
    } catch (error) {
      throw new UnauthorizedException("Invalid token");
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {return null;}

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {return null;}

    return parts[1];
  }
}

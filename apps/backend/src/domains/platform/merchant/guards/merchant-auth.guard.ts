import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

import { PrismaService } from "../../../../../../../common/prisma/prisma.service";
import { JwtUserPayload } from "../../../../../../../common/types/common.types";

interface MerchantJwtPayload extends JwtUserPayload {
  merchantId?: string;
}

@Injectable()
export class MerchantAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("No token provided");
    }

    try {
      const decoded = this.jwtService.verify<MerchantJwtPayload>(token);

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

  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {return null;}

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {return null;}

    return parts[1];
  }
}

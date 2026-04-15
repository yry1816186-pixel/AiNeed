import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
// eslint-disable-next-line import/no-unresolved
import { ExtractJwt, Strategy } from "passport-jwt";

import { TokenBlacklistService } from "../services/token-blacklist.service";

const logger = new Logger("JwtStrategy");

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private tokenBlacklistService: TokenBlacklistService,
  ) {
    const jwtSecret = configService.get<string>("JWT_SECRET");

    if (!jwtSecret) {
      logger.error(
        "FATAL: JWT_SECRET environment variable is not set. " +
          "JWT authentication will not work.",
      );
      throw new Error("JWT_SECRET environment variable is required");
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: { sub: string; email: string; jti?: string }) {
    if (payload.jti) {
      const isBlacklisted = await this.tokenBlacklistService.isBlacklisted(payload.jti);
      if (isBlacklisted) {
        throw new UnauthorizedException("Token has been revoked");
      }
    }

    return { id: payload.sub, email: payload.email };
  }
}

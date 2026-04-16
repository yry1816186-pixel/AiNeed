import { Module, Logger, forwardRef } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import type { JwtModuleOptions, JwtSignOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { EmailModule } from "../../../../common/email/email.module";
import { RedisModule } from "../../../../common/redis/redis.module";

import { AuthController } from "./auth.controller";
import { AuthHelpersService } from "./auth.helpers";
import { AuthService } from "./auth.service";
import { AliyunSmsService, MockSmsService, SmsService } from "./services/sms.service";
import { TokenBlacklistService } from "./services/token-blacklist.service";
import { WechatService } from "./services/wechat.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { LocalStrategy } from "./strategies/local.strategy";
import { WechatAuthStrategy } from "./strategies/wechat.strategy";


const logger = new Logger("AuthModule");

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    forwardRef(() => RedisModule),
    EmailModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const jwtSecret = configService.get<string>("JWT_SECRET");

        if (!jwtSecret) {
          logger.error(
            "FATAL: JWT_SECRET environment variable is not set. " +
              "Authentication will not work properly. " +
              "Please set JWT_SECRET in your environment.",
          );
          throw new Error("JWT_SECRET environment variable is required");
        }

        const expiresIn = configService.get<JwtSignOptions["expiresIn"]>(
          "JWT_ACCESS_EXPIRES_IN",
          "15m",
        );

        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthHelpersService,
    JwtStrategy,
    LocalStrategy,
    WechatService,
    WechatAuthStrategy,
    SmsService,
    TokenBlacklistService,
    {
      provide: "ISmsService",
      useFactory: (configService: ConfigService) => {
        const provider = configService.get<string>("SMS_PROVIDER", "mock");
        return provider === "aliyun" ? new AliyunSmsService(configService) : new MockSmsService();
      },
      inject: [ConfigService],
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}

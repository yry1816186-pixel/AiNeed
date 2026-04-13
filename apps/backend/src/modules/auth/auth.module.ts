import { Module, Logger, forwardRef } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import type { JwtModuleOptions, JwtSignOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { RedisModule } from "../../common/redis/redis.module";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthHelpersService } from "./auth.helpers";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { LocalStrategy } from "./strategies/local.strategy";
import { WechatStrategy } from "./strategies/wechat.strategy";
import { WechatService } from "./services/wechat.service";
import { AliyunSmsService, MockSmsService, SmsService } from "./services/sms.service";


const logger = new Logger("AuthModule");

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    forwardRef(() => RedisModule),
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
          "JWT_EXPIRES_IN",
          "7d",
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
    WechatStrategy,
    SmsService,
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

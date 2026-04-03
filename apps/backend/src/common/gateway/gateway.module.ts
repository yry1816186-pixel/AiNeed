import { Module, Global } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";

import { RedisModule } from "../redis/redis.module";
import { RedisService } from "../redis/redis.service";

import { NotificationGateway } from "./notification.gateway";
import { NotificationService } from "./notification.service";

@Global()
@Module({
  imports: [
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>("JWT_SECRET");
        if (!secret) {
          throw new Error("JWT_SECRET environment variable is required. Please set it in your .env file.");
        }
        return {
          secret,
          signOptions: { expiresIn: "7d" },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [NotificationGateway, NotificationService, RedisService],
  exports: [NotificationService],
})
export class GatewayModule {}

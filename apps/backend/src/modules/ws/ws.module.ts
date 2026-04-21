import { Module, Global, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { AuthModule } from "../../domains/identity/auth/auth.module";
import { RedisModule } from "../../common/redis/redis.module";

import { AIGateway } from "./gateways/ai.gateway";
import { AppGateway } from "./gateways/app.gateway";
import { EventBusService } from "./services/event-bus.service";
import { AIWebSocketGateway } from "./ws.gateway";

@Global()
@Module({
  imports: [RedisModule, JwtModule.register({}), forwardRef(() => AuthModule)],
  providers: [AIWebSocketGateway, AppGateway, AIGateway, EventBusService],
  exports: [AIWebSocketGateway, AppGateway, AIGateway, EventBusService],
})
export class WSModule {}

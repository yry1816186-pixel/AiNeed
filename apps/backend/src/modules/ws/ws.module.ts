import { Module, Global } from '@nestjs/common';

import { RedisModule } from '../../common/redis/redis.module';

import { AIGateway } from './gateways/ai.gateway';
import { AppGateway } from './gateways/app.gateway';
import { EventBusService } from './services/event-bus.service';
import { AIWebSocketGateway } from './ws.gateway';

@Global()
@Module({
  imports: [
    RedisModule,
  ],
  providers: [AIWebSocketGateway, AppGateway, AIGateway, EventBusService],
  exports: [AIWebSocketGateway, AppGateway, AIGateway, EventBusService],
})
export class WSModule {}

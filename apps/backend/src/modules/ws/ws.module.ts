import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { RedisModule } from '../../common/redis/redis.module';

import { AIWebSocketGateway } from './ws.gateway';
import { AppGateway } from './gateways/app.gateway';
import { AIGateway } from './gateways/ai.gateway';
import { EventBusService } from './services/event-bus.service';

@Global()
@Module({
  imports: [
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET environment variable is required. Please set it in your .env file.');
        }
        return {
          secret,
          signOptions: { expiresIn: '7d' },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [AIWebSocketGateway, AppGateway, AIGateway, EventBusService],
  exports: [AIWebSocketGateway, AppGateway, AIGateway, EventBusService],
})
export class WSModule {}

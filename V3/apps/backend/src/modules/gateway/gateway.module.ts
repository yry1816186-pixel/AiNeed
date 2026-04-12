import { Module } from '@nestjs/common';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventsGateway } from './events.gateway';
import { EventsService } from './events.service';
import { WsAuthGuard } from './ws-auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.get<string>('JWT_SECRET', ''),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [EventsGateway, EventsService, WsAuthGuard],
  exports: [EventsService],
})
export class GatewayModule {}

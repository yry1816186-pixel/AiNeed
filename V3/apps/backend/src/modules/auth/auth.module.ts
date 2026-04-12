import { Module, Logger } from '@nestjs/common';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MockSmsProvider } from './providers/mock-sms.provider';
import { ISmsProvider } from './providers/sms-provider.interface';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.get<string>('JWT_SECRET', ''),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m') as '15m',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Redis(configService.get<string>('REDIS_URL', 'redis://localhost:6379'));
      },
      inject: [ConfigService],
    },
    {
      provide: 'SMS_PROVIDER',
      useFactory: (configService: ConfigService): ISmsProvider => {
        const logger = new Logger('SMS_PROVIDER');
        const provider = configService.get<string>('SMS_PROVIDER');
        if (provider === 'aliyun') {
          logger.warn('SMS_PROVIDER=aliyun but AliyunSmsProvider not yet implemented, falling back to MockSmsProvider');
          return new MockSmsProvider();
        }
        return new MockSmsProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CustomOrderController } from './custom-order.controller';
import { CustomOrderService } from './custom-order.service';
import { MockPODProvider } from './providers/mock-pod.provider';
import { IPOD_PROVIDER } from './providers/pod-provider.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret',
      signOptions: {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
      } as Record<string, unknown>,
    }),
  ],
  controllers: [CustomOrderController],
  providers: [
    CustomOrderService,
    { provide: IPOD_PROVIDER, useClass: MockPODProvider },
    JwtAuthGuard,
  ],
  exports: [CustomOrderService],
})
export class CustomOrderModule {}

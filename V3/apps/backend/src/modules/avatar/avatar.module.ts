import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AvatarController } from './avatar.controller';
import { AvatarService } from './avatar.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret',
      signOptions: {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
      } as Record<string, unknown>,
    }),
  ],
  controllers: [AvatarController],
  providers: [AvatarService, JwtAuthGuard],
  exports: [AvatarService],
})
export class AvatarModule {}

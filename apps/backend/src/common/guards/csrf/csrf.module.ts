/**
 * CSRF Module
 * Provides CSRF protection for the application
 */
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CsrfController } from './csrf.controller';
import { CsrfGuard } from './csrf.guard';
import { CsrfService } from './csrf.service';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [CsrfController],
  providers: [CsrfService, CsrfGuard],
  exports: [CsrfService, CsrfGuard],
})
export class CsrfModule {}

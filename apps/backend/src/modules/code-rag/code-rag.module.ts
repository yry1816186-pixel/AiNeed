import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import { CodeRagController } from './code-rag.controller';
import { CodeRagService } from './code-rag.service';

@Module({
  imports: [HttpModule, ConfigModule, AuthModule],
  controllers: [CodeRagController],
  providers: [CodeRagService],
  exports: [CodeRagService],
})
export class CodeRagModule {}

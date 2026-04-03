import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { CodeRagController } from './code-rag.controller';
import { CodeRagService } from './code-rag.service';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [CodeRagController],
  providers: [CodeRagService],
  exports: [CodeRagService],
})
export class CodeRagModule {}

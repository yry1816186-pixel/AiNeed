import { Module } from '@nestjs/common';

import { SoftDeleteService } from './soft-delete.service';

@Module({
  providers: [SoftDeleteService],
  exports: [SoftDeleteService],
})
export class SoftDeleteModule {}

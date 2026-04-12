import { Module } from '@nestjs/common';
import { BespokeOrdersController } from './bespoke-orders.controller';
import { BespokeOrdersService } from './bespoke-orders.service';

@Module({
  controllers: [BespokeOrdersController],
  providers: [BespokeOrdersService],
  exports: [BespokeOrdersService],
})
export class BespokeOrdersModule {}

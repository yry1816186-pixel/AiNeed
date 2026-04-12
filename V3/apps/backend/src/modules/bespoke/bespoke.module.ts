import { Module } from '@nestjs/common';
import { BespokeOrdersModule } from './orders/bespoke-orders.module';
import { StudiosController } from './studios/studios.controller';
import { StudiosService } from './studios/studios.service';

@Module({
  imports: [BespokeOrdersModule],
  controllers: [StudiosController],
  providers: [StudiosService],
  exports: [StudiosService],
})
export class BespokeModule {}

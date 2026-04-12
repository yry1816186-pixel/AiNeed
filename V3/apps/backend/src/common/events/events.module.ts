import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationModule } from '../../modules/notification/notification.module';
import { EventsService } from './events.service';
import { NotificationListener } from './listeners/notification.listener.js';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),
    NotificationModule,
  ],
  providers: [EventsService, NotificationListener],
  exports: [EventsService],
})
export class EventsModule {}

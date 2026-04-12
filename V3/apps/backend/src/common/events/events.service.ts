import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AppEventName,
  AppEventData,
} from './event-types';

@Injectable()
export class EventsService implements OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly emitter: EventEmitter2) {}

  emit<K extends AppEventName>(event: K, data: AppEventData<K>): void {
    this.emitter.emit(event, data);
  }

  on<K extends AppEventName>(
    event: K,
    handler: (data: AppEventData<K>) => void | Promise<void>,
  ): void {
    this.emitter.on(event, (data: AppEventData<K>) => {
      Promise.resolve(handler(data)).catch((error: unknown) => {
        this.logger.error(
          `Error in listener for event "${event}": ${String(error)}`,
        );
      });
    });
  }

  removeAllListeners<K extends AppEventName>(event?: K): void {
    if (event !== undefined) {
      this.emitter.removeAllListeners(event);
    } else {
      this.emitter.removeAllListeners();
    }
  }

  onModuleDestroy(): void {
    this.removeAllListeners();
  }
}

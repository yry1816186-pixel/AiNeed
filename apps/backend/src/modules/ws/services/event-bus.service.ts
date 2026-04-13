import { Injectable, Inject, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';

import { REDIS_CLIENT } from '../../../common/redis/redis.service';

const CHANNEL_PREFIX = 'ws:event:';

interface EventEnvelope {
  type: string;
  userId: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

@Injectable()
export class EventBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventBusService.name);
  private subscriber: Redis | null = null;

  constructor(
    @Inject(REDIS_CLIENT) private redis: Redis,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.subscriber = new Redis(redisUrl);

    await this.subscriber.psubscribe(`${CHANNEL_PREFIX}*`);

    this.subscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
      this.handleRedisMessage(channel, message);
    });

    this.logger.log('EventBus initialized with Redis pub/sub');
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
    this.logger.log('EventBus destroyed');
  }

  async publish(eventType: string, userId: string, payload: Record<string, unknown>): Promise<void> {
    const envelope: EventEnvelope = {
      type: eventType,
      userId,
      payload,
      timestamp: new Date().toISOString(),
    };

    const channel = `${CHANNEL_PREFIX}${eventType}`;
    await this.redis.publish(channel, JSON.stringify(envelope));
  }

  on(eventType: string, handler: (envelope: EventEnvelope) => void): void {
    this.eventEmitter.on(eventType, handler);
  }

  off(eventType: string, handler: (envelope: EventEnvelope) => void): void {
    this.eventEmitter.off(eventType, handler);
  }

  private handleRedisMessage(channel: string, message: string): void {
    try {
      const envelope: EventEnvelope = JSON.parse(message);
      this.eventEmitter.emit(envelope.type, envelope);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to handle Redis message on ${channel}: ${errorMessage}`);
    }
  }
}

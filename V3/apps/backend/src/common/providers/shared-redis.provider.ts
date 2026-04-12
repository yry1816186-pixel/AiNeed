import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export const SHARED_REDIS_CLIENT = 'SHARED_REDIS_CLIENT';

@Injectable()
export class SharedRedisProvider implements OnModuleDestroy {
  readonly client: Redis;

  constructor(@Inject(SHARED_REDIS_CLIENT) client: Redis) {
    this.client = client;
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }
}

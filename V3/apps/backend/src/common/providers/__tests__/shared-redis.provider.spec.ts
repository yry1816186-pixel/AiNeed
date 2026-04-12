import { Test, TestingModule } from '@nestjs/testing';
import { SharedRedisProvider, SHARED_REDIS_CLIENT } from '../shared-redis.provider';

describe('SharedRedisProvider', () => {
  let provider: SharedRedisProvider;
  let mockRedis: { disconnect: jest.Mock };

  beforeEach(async () => {
    mockRedis = { disconnect: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharedRedisProvider,
        {
          provide: SHARED_REDIS_CLIENT,
          useValue: mockRedis,
        },
      ],
    }).compile();

    provider = module.get<SharedRedisProvider>(SharedRedisProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should expose the redis client', () => {
    expect(provider.client).toBe(mockRedis);
  });

  it('should disconnect the client on module destroy', () => {
    provider.onModuleDestroy();

    expect(mockRedis.disconnect).toHaveBeenCalled();
  });
});

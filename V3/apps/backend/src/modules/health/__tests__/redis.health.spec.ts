import { Test, TestingModule } from '@nestjs/testing';
import { RedisHealthIndicator } from '../indicators/redis.health';
import { SHARED_REDIS_CLIENT } from '../../../common/providers/shared-redis.provider';

describe('RedisHealthIndicator', () => {
  let indicator: RedisHealthIndicator;
  let redisClient: { ping: jest.Mock };

  beforeEach(async () => {
    redisClient = { ping: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisHealthIndicator,
        {
          provide: SHARED_REDIS_CLIENT,
          useValue: redisClient,
        },
      ],
    }).compile();

    indicator = module.get<RedisHealthIndicator>(RedisHealthIndicator);
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  it('should return healthy when PING returns PONG', async () => {
    redisClient.ping.mockResolvedValue('PONG');

    const result = await indicator.isHealthy('redis');

    expect(result.redis.status).toBe('up');
  });

  it('should throw HealthCheckError when PING returns unexpected response', async () => {
    redisClient.ping.mockResolvedValue('NOT_PONG');

    await expect(indicator.isHealthy('redis')).rejects.toThrow('RedisHealthCheck failed');
  });

  it('should throw HealthCheckError when PING fails', async () => {
    redisClient.ping.mockRejectedValue(new Error('Connection refused'));

    await expect(indicator.isHealthy('redis')).rejects.toThrow('RedisHealthCheck failed');
  });
});

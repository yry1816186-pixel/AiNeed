import { Test, TestingModule } from '@nestjs/testing';
import { StorageHealthIndicator } from '../indicators/storage.health';
import { ConfigService } from '@nestjs/config';
import { HealthCheckError } from '@nestjs/terminus';

describe('StorageHealthIndicator', () => {
  let indicator: StorageHealthIndicator;
  let listBucketsMock: jest.Mock;

  beforeEach(async () => {
    listBucketsMock = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageHealthIndicator,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const map: Record<string, string> = {
                MINIO_ENDPOINT: 'localhost',
                MINIO_PORT: '9000',
                MINIO_ACCESS_KEY: 'minioadmin',
                MINIO_SECRET_KEY: 'minioadmin',
                MINIO_BUCKET: 'aineed',
              };
              return map[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    indicator = module.get<StorageHealthIndicator>(StorageHealthIndicator);
    (indicator as unknown as { minioClient: { listBuckets: jest.Mock } }).minioClient = {
      listBuckets: listBucketsMock,
    };
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  it('should return healthy when listBuckets succeeds', async () => {
    listBucketsMock.mockResolvedValue([{ name: 'aineed' }]);

    const result = await indicator.isHealthy('storage');

    expect(result.storage.status).toBe('up');
  });

  it('should include bucket name in healthy response', async () => {
    listBucketsMock.mockResolvedValue([{ name: 'aineed' }]);

    const result = await indicator.isHealthy('storage');

    expect(result.storage).toHaveProperty('bucket', 'aineed');
  });

  it('should return healthy when listBuckets returns empty array', async () => {
    listBucketsMock.mockResolvedValue([]);

    const result = await indicator.isHealthy('storage');

    expect(result.storage.status).toBe('up');
  });

  it('should throw HealthCheckError when listBuckets fails', async () => {
    listBucketsMock.mockRejectedValue(new Error('Connection refused'));

    await expect(indicator.isHealthy('storage')).rejects.toThrow('StorageHealthCheck failed');
  });

  it('should include error message and bucket in failed response', async () => {
    listBucketsMock.mockRejectedValue(new Error('ECONNREFUSED'));

    try {
      await indicator.isHealthy('storage');
      fail('Expected HealthCheckError');
    } catch (error) {
      expect(error).toBeInstanceOf(HealthCheckError);
      const causes = (error as HealthCheckError).causes as Record<string, unknown>;
      expect((causes.storage as Record<string, unknown>).message).toBe('ECONNREFUSED');
      expect((causes.storage as Record<string, unknown>).bucket).toBe('aineed');
    }
  });

  it('should handle non-Error exceptions from listBuckets', async () => {
    listBucketsMock.mockRejectedValue('timeout');

    try {
      await indicator.isHealthy('storage');
      fail('Expected HealthCheckError');
    } catch (error) {
      expect(error).toBeInstanceOf(HealthCheckError);
      const causes = (error as HealthCheckError).causes as Record<string, unknown>;
      expect((causes.storage as Record<string, unknown>).message).toBe('MinIO connection failed');
    }
  });
});

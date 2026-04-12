import { Test, TestingModule } from '@nestjs/testing';
import { QdrantHealthIndicator } from '../indicators/qdrant.health';
import { ConfigService } from '@nestjs/config';
import { HealthCheckError } from '@nestjs/terminus';

describe('QdrantHealthIndicator', () => {
  let indicator: QdrantHealthIndicator;
  let getCollectionsMock: jest.Mock;

  beforeEach(async () => {
    getCollectionsMock = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QdrantHealthIndicator,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              if (key === 'QDRANT_URL') return 'http://localhost:6333';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    indicator = module.get<QdrantHealthIndicator>(QdrantHealthIndicator);
    (indicator as unknown as { client: { getCollections: jest.Mock } }).client = {
      getCollections: getCollectionsMock,
    };
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  it('should return healthy when getCollections succeeds', async () => {
    getCollectionsMock.mockResolvedValue({ collections: [] });

    const result = await indicator.isHealthy('qdrant');

    expect(result.qdrant.status).toBe('up');
  });

  it('should return healthy when getCollections returns collections', async () => {
    getCollectionsMock.mockResolvedValue({
      collections: [{ name: 'test-collection' }],
    });

    const result = await indicator.isHealthy('qdrant');

    expect(result.qdrant.status).toBe('up');
  });

  it('should throw HealthCheckError when getCollections fails', async () => {
    getCollectionsMock.mockRejectedValue(new Error('Connection refused'));

    await expect(indicator.isHealthy('qdrant')).rejects.toThrow('QdrantHealthCheck failed');
  });

  it('should include error message in HealthCheckError details', async () => {
    getCollectionsMock.mockRejectedValue(new Error('ECONNREFUSED'));

    try {
      await indicator.isHealthy('qdrant');
      fail('Expected HealthCheckError');
    } catch (error) {
      expect(error).toBeInstanceOf(HealthCheckError);
      const causes = (error as HealthCheckError).causes as Record<string, unknown>;
      expect((causes.qdrant as Record<string, unknown>).message).toBe('ECONNREFUSED');
    }
  });

  it('should handle non-Error exceptions', async () => {
    getCollectionsMock.mockRejectedValue('string error');

    try {
      await indicator.isHealthy('qdrant');
      fail('Expected HealthCheckError');
    } catch (error) {
      expect(error).toBeInstanceOf(HealthCheckError);
      const causes = (error as HealthCheckError).causes as Record<string, unknown>;
      expect((causes.qdrant as Record<string, unknown>).message).toBe('Qdrant connection failed');
    }
  });
});

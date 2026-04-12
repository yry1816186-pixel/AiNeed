import { Test, TestingModule } from '@nestjs/testing';
import { ElasticsearchHealthIndicator } from '../indicators/elasticsearch.health';
import { ConfigService } from '@nestjs/config';
import { HealthCheckError } from '@nestjs/terminus';

// We mock the @elastic/elasticsearch module at the top level
jest.mock('@elastic/elasticsearch', () => {
  return {
    Client: jest.fn(),
  };
});

// Import the mocked Client so we can control its behavior
import { Client } from '@elastic/elasticsearch';
const MockedClient = Client as jest.MockedClass<typeof Client>;

describe('ElasticsearchHealthIndicator', () => {
  const mockClusterHealth = jest.fn();
  const mockClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    MockedClient.mockImplementation(() => ({
      cluster: { health: mockClusterHealth },
      close: mockClose,
    }) as unknown as InstanceType<typeof Client>);
  });

  it('should be defined', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticsearchHealthIndicator,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => undefined),
          },
        },
      ],
    }).compile();

    const indicator = module.get<ElasticsearchHealthIndicator>(ElasticsearchHealthIndicator);
    expect(indicator).toBeDefined();
  });

  it('should return unhealthy when ES URL not configured', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticsearchHealthIndicator,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => undefined),
          },
        },
      ],
    }).compile();

    const indicator = module.get<ElasticsearchHealthIndicator>(ElasticsearchHealthIndicator);
    const result = await indicator.isHealthy('elasticsearch');

    expect(result.elasticsearch.status).toBe('down');
    expect(result.elasticsearch).toHaveProperty('message', 'Elasticsearch URL not configured');
  });

  it('should return unhealthy when ES URL is null', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticsearchHealthIndicator,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => null),
          },
        },
      ],
    }).compile();

    const indicator = module.get<ElasticsearchHealthIndicator>(ElasticsearchHealthIndicator);
    const result = await indicator.isHealthy('elasticsearch');

    expect(result.elasticsearch.status).toBe('down');
  });

  it('should return unhealthy when ES URL is empty string', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticsearchHealthIndicator,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ELASTICSEARCH_URL') return '';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    const indicator = module.get<ElasticsearchHealthIndicator>(ElasticsearchHealthIndicator);
    const result = await indicator.isHealthy('elasticsearch');

    expect(result.elasticsearch.status).toBe('down');
  });

  it('should return healthy when cluster status is green', async () => {
    mockClusterHealth.mockResolvedValue({ status: 'green' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticsearchHealthIndicator,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ELASTICSEARCH_URL') return 'http://localhost:9200';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    const indicator = module.get<ElasticsearchHealthIndicator>(ElasticsearchHealthIndicator);
    const result = await indicator.isHealthy('elasticsearch');

    expect(result.elasticsearch.status).toBe('up');
    expect(result.elasticsearch).toHaveProperty('clusterStatus', 'green');
    expect(mockClose).toHaveBeenCalled();
  });

  it('should return healthy when cluster status is yellow', async () => {
    mockClusterHealth.mockResolvedValue({ status: 'yellow' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticsearchHealthIndicator,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ELASTICSEARCH_URL') return 'http://localhost:9200';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    const indicator = module.get<ElasticsearchHealthIndicator>(ElasticsearchHealthIndicator);
    const result = await indicator.isHealthy('elasticsearch');

    expect(result.elasticsearch.status).toBe('up');
    expect(result.elasticsearch).toHaveProperty('clusterStatus', 'yellow');
    expect(mockClose).toHaveBeenCalled();
  });

  it('should throw HealthCheckError when cluster status is red', async () => {
    mockClusterHealth.mockResolvedValue({ status: 'red' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticsearchHealthIndicator,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ELASTICSEARCH_URL') return 'http://localhost:9200';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    const indicator = module.get<ElasticsearchHealthIndicator>(ElasticsearchHealthIndicator);

    try {
      await indicator.isHealthy('elasticsearch');
      fail('Expected HealthCheckError');
    } catch (error) {
      expect(error).toBeInstanceOf(HealthCheckError);
      expect(mockClose).toHaveBeenCalled();
    }
  });

  it('should throw HealthCheckError when cluster health check throws', async () => {
    mockClusterHealth.mockRejectedValue(new Error('Connection refused'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticsearchHealthIndicator,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ELASTICSEARCH_URL') return 'http://localhost:9200';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    const indicator = module.get<ElasticsearchHealthIndicator>(ElasticsearchHealthIndicator);

    try {
      await indicator.isHealthy('elasticsearch');
      fail('Expected HealthCheckError');
    } catch (error) {
      expect(error).toBeInstanceOf(HealthCheckError);
      expect(mockClose).toHaveBeenCalled();
    }
  });

  it('should handle non-Error exceptions from cluster health', async () => {
    mockClusterHealth.mockRejectedValue('string error');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticsearchHealthIndicator,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ELASTICSEARCH_URL') return 'http://localhost:9200';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    const indicator = module.get<ElasticsearchHealthIndicator>(ElasticsearchHealthIndicator);

    try {
      await indicator.isHealthy('elasticsearch');
      fail('Expected HealthCheckError');
    } catch (error) {
      expect(error).toBeInstanceOf(HealthCheckError);
    }
  });
});

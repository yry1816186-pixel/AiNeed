import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from '../health.service';
import { HealthCheckService, HealthCheckResult, HealthIndicatorStatus, HealthIndicatorFunction } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from '../indicators/database.health';
import { RedisHealthIndicator } from '../indicators/redis.health';
import { StorageHealthIndicator } from '../indicators/storage.health';
import { QdrantHealthIndicator } from '../indicators/qdrant.health';
import { Neo4jHealthIndicator } from '../indicators/neo4j.health';
import { ElasticsearchHealthIndicator } from '../indicators/elasticsearch.health';
import { ExternalHealthIndicator } from '../indicators/external.health';

const UP: HealthIndicatorStatus = 'up';
const DOWN: HealthIndicatorStatus = 'down';

describe('HealthService', () => {
  let service: HealthService;
  let healthCheckService: HealthCheckService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn(),
          },
        },
        {
          provide: DatabaseHealthIndicator,
          useValue: { isHealthy: jest.fn() },
        },
        {
          provide: RedisHealthIndicator,
          useValue: { isHealthy: jest.fn() },
        },
        {
          provide: StorageHealthIndicator,
          useValue: { isHealthy: jest.fn() },
        },
        {
          provide: QdrantHealthIndicator,
          useValue: { isHealthy: jest.fn() },
        },
        {
          provide: Neo4jHealthIndicator,
          useValue: { isHealthy: jest.fn() },
        },
        {
          provide: ElasticsearchHealthIndicator,
          useValue: { isHealthy: jest.fn() },
        },
        {
          provide: ExternalHealthIndicator,
          useValue: { isHealthy: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkLiveness', () => {
    it('should return ok status', () => {
      const result = service.checkLiveness();
      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('checkReadiness', () => {
    it('should return ok when all core services are healthy', async () => {
      const mockResult = {
        status: 'ok' as const,
        info: {
          database: { status: UP },
          redis: { status: UP },
          storage: { status: UP },
        },
        error: {},
        details: {
          database: { status: UP },
          redis: { status: UP },
          storage: { status: UP },
        },
      } as unknown as HealthCheckResult;
      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockResult);

      const result = await service.checkReadiness();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThan(0);
      expect(result.version).toBeDefined();
    });

    it('should return unhealthy when a core service fails', async () => {
      const mockResult = {
        status: 'error' as const,
        info: {},
        error: {
          database: { status: DOWN },
        },
        details: {
          database: { status: DOWN },
        },
      } as unknown as HealthCheckResult;
      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockResult);

      const result = await service.checkReadiness();

      expect(result.status).toBe('unhealthy');
    });
  });

  describe('checkFull', () => {
    it('should return ok when all services are healthy', async () => {
      const mockResult = {
        status: 'ok' as const,
        info: {
          database: { status: UP },
          redis: { status: UP },
          storage: { status: UP },
          qdrant: { status: UP },
          neo4j: { status: UP },
          elasticsearch: { status: UP },
          external: { status: UP },
        },
        error: {},
        details: {
          database: { status: UP },
          redis: { status: UP },
          storage: { status: UP },
          qdrant: { status: UP },
          neo4j: { status: UP },
          elasticsearch: { status: UP },
          external: { status: UP },
        },
      } as unknown as HealthCheckResult;
      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockResult);

      const result = await service.checkFull();

      expect(result.status).toBe('ok');
      expect(result.checks).toBeDefined();
    });

    it('should return unhealthy when services fail', async () => {
      const mockResult = {
        status: 'error' as const,
        info: {},
        error: {
          database: { status: DOWN },
        },
        details: {
          database: { status: DOWN },
        },
      } as unknown as HealthCheckResult;
      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockResult);

      const result = await service.checkFull();

      expect(result.status).toBe('unhealthy');
    });

    it('should return degraded for shutting_down status', async () => {
      const mockResult = {
        status: 'shutting_down' as const,
        info: {},
        error: {},
        details: {},
      } as unknown as HealthCheckResult;
      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockResult);

      const result = await service.checkFull();

      expect(result.status).toBe('degraded');
    });
  });

  describe('buildResponse edge cases', () => {
    it('should return unhealthy for unknown status string', async () => {
      const mockResult = {
        status: 'unknown_status' as const,
        info: {},
        error: {},
        details: {},
      } as unknown as HealthCheckResult;
      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockResult);

      const result = await service.checkFull();

      expect(result.status).toBe('unhealthy');
    });

    it('should use info when info is present', async () => {
      const mockResult = {
        status: 'ok' as const,
        info: { database: { status: UP } },
        error: {},
        details: {},
      } as unknown as HealthCheckResult;
      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockResult);

      const result = await service.checkFull();

      expect(result.checks).toEqual({ database: { status: UP } });
    });

    it('should use info when info is present even if empty object', async () => {
      // result.info ?? result.error ?? {} -- {} is truthy so ?? does not fallback
      const mockResult = {
        status: 'error' as const,
        info: {},
        error: { database: { status: DOWN } },
        details: {},
      } as unknown as HealthCheckResult;
      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockResult);

      const result = await service.checkFull();

      expect(result.checks).toEqual({});
    });

    it('should fallback to empty object when both info and error are empty', async () => {
      const mockResult = {
        status: 'ok' as const,
        info: {},
        error: {},
        details: {},
      } as unknown as HealthCheckResult;
      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockResult);

      const result = await service.checkFull();

      expect(result.checks).toEqual({});
    });

    it('should include valid ISO timestamp', async () => {
      const mockResult = {
        status: 'ok' as const,
        info: {},
        error: {},
        details: {},
      } as unknown as HealthCheckResult;
      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockResult);

      const result = await service.checkFull();

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should include version from npm_package_version or default', async () => {
      const mockResult = {
        status: 'ok' as const,
        info: {},
        error: {},
        details: {},
      } as unknown as HealthCheckResult;
      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockResult);

      const result = await service.checkFull();

      expect(typeof result.version).toBe('string');
      expect(result.version.length).toBeGreaterThan(0);
    });

    it('should call healthCheckService.check with 7 indicators for full check', async () => {
      const mockResult = {
        status: 'ok' as const,
        info: {},
        error: {},
        details: {},
      } as unknown as HealthCheckResult;
      const checkSpy = jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockResult);

      await service.checkFull();

      expect(checkSpy).toHaveBeenCalledTimes(1);
      const checkFns = checkSpy.mock.calls[0][0];
      expect(checkFns).toHaveLength(7);
    });

    it('should call healthCheckService.check with 3 indicators for readiness check', async () => {
      const mockResult = {
        status: 'ok' as const,
        info: {},
        error: {},
        details: {},
      } as unknown as HealthCheckResult;
      const checkSpy = jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockResult);

      await service.checkReadiness();

      expect(checkSpy).toHaveBeenCalledTimes(1);
      const checkFns = checkSpy.mock.calls[0][0];
      expect(checkFns).toHaveLength(3);
    });

    it('should execute full check callback functions that call each indicator', async () => {
      // Make the mock check function actually execute the callbacks
      const mockResult = {
        status: 'ok' as const,
        info: {},
        error: {},
        details: {},
      } as unknown as HealthCheckResult;

      const checkSpy = jest.spyOn(healthCheckService, 'check').mockImplementation(
        async (fns: HealthIndicatorFunction[]) => {
          // Execute each callback to cover the lambda bodies
          for (const fn of fns) {
            await fn();
          }
          return mockResult;
        },
      );

      await service.checkFull();

      expect(checkSpy).toHaveBeenCalledTimes(1);
    });

    it('should execute readiness check callback functions', async () => {
      const mockResult = {
        status: 'ok' as const,
        info: {},
        error: {},
        details: {},
      } as unknown as HealthCheckResult;

      const checkSpy = jest.spyOn(healthCheckService, 'check').mockImplementation(
        async (fns: HealthIndicatorFunction[]) => {
          for (const fn of fns) {
            await fn();
          }
          return mockResult;
        },
      );

      await service.checkReadiness();

      expect(checkSpy).toHaveBeenCalledTimes(1);
    });
  });
});

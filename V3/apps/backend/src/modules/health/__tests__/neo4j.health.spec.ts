import { Test, TestingModule } from '@nestjs/testing';
import { Neo4jHealthIndicator } from '../indicators/neo4j.health';
import { ConfigService } from '@nestjs/config';
import { HealthCheckError } from '@nestjs/terminus';

describe('Neo4jHealthIndicator', () => {
  // We will spy on neo4j-driver after it's been loaded by the test module.
  // Instead of jest.mock at module level, we'll test only the config-gating paths
  // which do not need the driver at all (driver is only used when all 3 configs are present).

  describe('without config', () => {
    it('should be defined', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          Neo4jHealthIndicator,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const indicator = module.get<Neo4jHealthIndicator>(Neo4jHealthIndicator);
      expect(indicator).toBeDefined();
    });

    it('should return unhealthy when Neo4j credentials not configured', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          Neo4jHealthIndicator,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const indicator = module.get<Neo4jHealthIndicator>(Neo4jHealthIndicator);
      const result = await indicator.isHealthy('neo4j');

      expect(result.neo4j.status).toBe('down');
      expect(result.neo4j).toHaveProperty('message', 'Neo4j credentials not configured');
    });

    it('should return unhealthy when only URL is configured', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          Neo4jHealthIndicator,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'NEO4J_URL') return 'bolt://localhost:7687';
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      const indicator = module.get<Neo4jHealthIndicator>(Neo4jHealthIndicator);
      const result = await indicator.isHealthy('neo4j');

      expect(result.neo4j.status).toBe('down');
    });

    it('should return unhealthy when URL and user configured but no password', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          Neo4jHealthIndicator,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'NEO4J_URL') return 'bolt://localhost:7687';
                if (key === 'NEO4J_USER') return 'neo4j';
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      const indicator = module.get<Neo4jHealthIndicator>(Neo4jHealthIndicator);
      const result = await indicator.isHealthy('neo4j');

      expect(result.neo4j.status).toBe('down');
    });

    it('should return unhealthy when user and password present but no URL', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          Neo4jHealthIndicator,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'NEO4J_USER') return 'neo4j';
                if (key === 'NEO4J_PASSWORD') return 'password';
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      const indicator = module.get<Neo4jHealthIndicator>(Neo4jHealthIndicator);
      const result = await indicator.isHealthy('neo4j');

      expect(result.neo4j.status).toBe('down');
    });

    it('should return unhealthy when password is empty string', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          Neo4jHealthIndicator,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'NEO4J_URL') return 'bolt://localhost:7687';
                if (key === 'NEO4J_USER') return 'neo4j';
                if (key === 'NEO4J_PASSWORD') return '';
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      const indicator = module.get<Neo4jHealthIndicator>(Neo4jHealthIndicator);
      const result = await indicator.isHealthy('neo4j');

      // Empty string is falsy, so credentials are not fully configured
      expect(result.neo4j.status).toBe('down');
    });
  });

  describe('with full config and real neo4j-driver', () => {
    it('should throw HealthCheckError when Neo4j is unreachable with valid config', async () => {
      // With real config pointing to localhost, the driver will fail to connect
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          Neo4jHealthIndicator,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                const map: Record<string, string> = {
                  NEO4J_URL: 'bolt://localhost:7687',
                  NEO4J_USER: 'neo4j',
                  NEO4J_PASSWORD: 'testpassword',
                };
                return map[key];
              }),
            },
          },
        ],
      }).compile();

      const indicator = module.get<Neo4jHealthIndicator>(Neo4jHealthIndicator);

      // The driver will attempt to connect and fail since Neo4j is not running
      // But if it IS running, it will succeed. Either way, it should not throw
      // an unexpected error type.
      try {
        const result = await indicator.isHealthy('neo4j');
        // If Neo4j is running, it should be up
        expect(result.neo4j.status).toBe('up');
      } catch (error) {
        // If Neo4j is not running, it should throw HealthCheckError
        expect(error).toBeInstanceOf(HealthCheckError);
      }
    });
  });
});

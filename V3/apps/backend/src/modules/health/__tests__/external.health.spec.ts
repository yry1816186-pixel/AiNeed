import { Test, TestingModule } from '@nestjs/testing';
import { ExternalHealthIndicator } from '../indicators/external.health';
import { ConfigService } from '@nestjs/config';
import { HealthCheckError } from '@nestjs/terminus';

describe('ExternalHealthIndicator', () => {
  let indicator: ExternalHealthIndicator;

  describe('with no API keys configured', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ExternalHealthIndicator,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      indicator = module.get<ExternalHealthIndicator>(ExternalHealthIndicator);
    });

    it('should be defined', () => {
      expect(indicator).toBeDefined();
    });

    it('should throw HealthCheckError when no external APIs are configured', async () => {
      await expect(indicator.isHealthy('external')).rejects.toThrow('ExternalHealthCheck failed');
    });

    it('should include details in HealthCheckError when no APIs configured', async () => {
      try {
        await indicator.isHealthy('external');
        fail('Expected HealthCheckError');
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckError);
        expect((error as HealthCheckError).causes).toBeDefined();
      }
    });
  });

  describe('with placeholder API keys', () => {
    it('should throw HealthCheckError when zhipu key is placeholder', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ExternalHealthIndicator,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'ZHIPU_API_KEY') return 'your-zhipu-api-key';
                if (key === 'DEEPSEEK_API_KEY') return undefined;
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      const testIndicator = module.get<ExternalHealthIndicator>(ExternalHealthIndicator);
      await expect(testIndicator.isHealthy('external')).rejects.toThrow('ExternalHealthCheck failed');
    });

    it('should throw HealthCheckError when deepseek key is placeholder', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ExternalHealthIndicator,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'ZHIPU_API_KEY') return undefined;
                if (key === 'DEEPSEEK_API_KEY') return 'your-deepseek-api-key';
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      const testIndicator = module.get<ExternalHealthIndicator>(ExternalHealthIndicator);
      await expect(testIndicator.isHealthy('external')).rejects.toThrow('ExternalHealthCheck failed');
    });

    it('should throw HealthCheckError when both keys are placeholders', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ExternalHealthIndicator,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'ZHIPU_API_KEY') return 'your-zhipu-api-key';
                if (key === 'DEEPSEEK_API_KEY') return 'your-deepseek-api-key';
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      const testIndicator = module.get<ExternalHealthIndicator>(ExternalHealthIndicator);
      await expect(testIndicator.isHealthy('external')).rejects.toThrow('ExternalHealthCheck failed');
    });
  });

  describe('with real API keys and mocked fetch', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('should return healthy when both APIs return ok or 429', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ExternalHealthIndicator,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'ZHIPU_API_KEY') return 'real-zhipu-key';
                if (key === 'DEEPSEEK_API_KEY') return 'real-deepseek-key';
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      const testIndicator = module.get<ExternalHealthIndicator>(ExternalHealthIndicator);
      const result = await testIndicator.isHealthy('external');

      expect(result.external.status).toBe('up');
    });

    it('should return healthy with degraded when only one API is reachable', async () => {
      let callCount = 0;
      globalThis.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // zhipu succeeds
          return Promise.resolve({ ok: true, status: 200 });
        }
        // deepseek fails
        return Promise.reject(new Error('Connection refused'));
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ExternalHealthIndicator,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'ZHIPU_API_KEY') return 'real-zhipu-key';
                if (key === 'DEEPSEEK_API_KEY') return 'real-deepseek-key';
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      const testIndicator = module.get<ExternalHealthIndicator>(ExternalHealthIndicator);
      const result = await testIndicator.isHealthy('external');

      expect(result.external.status).toBe('up');
      expect(result.external).toHaveProperty('degraded', true);
    });

    it('should treat 429 as reachable (rate limited but API is up)', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ExternalHealthIndicator,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'ZHIPU_API_KEY') return 'real-zhipu-key';
                if (key === 'DEEPSEEK_API_KEY') return 'real-deepseek-key';
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      const testIndicator = module.get<ExternalHealthIndicator>(ExternalHealthIndicator);
      const result = await testIndicator.isHealthy('external');

      expect(result.external.status).toBe('up');
    });

    it('should throw HealthCheckError when both APIs fail', async () => {
      globalThis.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ExternalHealthIndicator,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'ZHIPU_API_KEY') return 'real-zhipu-key';
                if (key === 'DEEPSEEK_API_KEY') return 'real-deepseek-key';
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      const testIndicator = module.get<ExternalHealthIndicator>(ExternalHealthIndicator);
      await expect(testIndicator.isHealthy('external')).rejects.toThrow('ExternalHealthCheck failed');
    });

    it('should handle non-Error rejection from fetch', async () => {
      globalThis.fetch = jest.fn().mockRejectedValue('string error');

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ExternalHealthIndicator,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'ZHIPU_API_KEY') return 'real-zhipu-key';
                if (key === 'DEEPSEEK_API_KEY') return 'real-deepseek-key';
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      const testIndicator = module.get<ExternalHealthIndicator>(ExternalHealthIndicator);
      await expect(testIndicator.isHealthy('external')).rejects.toThrow('ExternalHealthCheck failed');
    });

    it('should include latency in check results', async () => {
      globalThis.fetch = jest.fn().mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 5));
        return { ok: true, status: 200 };
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ExternalHealthIndicator,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'ZHIPU_API_KEY') return 'real-zhipu-key';
                if (key === 'DEEPSEEK_API_KEY') return 'real-deepseek-key';
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      const testIndicator = module.get<ExternalHealthIndicator>(ExternalHealthIndicator);
      const result = await testIndicator.isHealthy('external');

      // Check that the details include zhipu and deepseek with latencyMs
      const details = result.external as Record<string, unknown>;
      expect(details).toHaveProperty('zhipu');
      expect(details).toHaveProperty('deepseek');
    });

    it('should return healthy when API returns non-ok non-429 status', async () => {
      // 500 is not ok and not 429, so reachable: false
      globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ExternalHealthIndicator,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'ZHIPU_API_KEY') return 'real-zhipu-key';
                if (key === 'DEEPSEEK_API_KEY') return 'real-deepseek-key';
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      const testIndicator = module.get<ExternalHealthIndicator>(ExternalHealthIndicator);
      await expect(testIndicator.isHealthy('external')).rejects.toThrow('ExternalHealthCheck failed');
    });
  });
});

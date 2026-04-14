import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';

describe('Health E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  /** Helper to extract attributes from JSON:API response */
  const extractAttributes = (body: Record<string, unknown>) => {
    return (body as any).data?.attributes ?? body;
  };

  describe('/api/v1/health (GET)', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      const attrs = extractAttributes(response.body);
      expect(attrs).toHaveProperty('status');
      expect(['healthy', 'unhealthy', 'degraded']).toContain(attrs.status);
      expect(attrs).toHaveProperty('timestamp');
      expect(attrs).toHaveProperty('uptime');
      expect(attrs).toHaveProperty('version');
    });

    it('should include database health check', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      const attrs = extractAttributes(response.body);
      expect(attrs.checks).toHaveProperty('database');
      expect(attrs.checks.database).toHaveProperty('status');
      expect(['up', 'down']).toContain(attrs.checks.database.status);
    });

    it('should include redis health check', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      const attrs = extractAttributes(response.body);
      expect(attrs.checks).toHaveProperty('redis');
      expect(attrs.checks.redis).toHaveProperty('status');
      expect(['up', 'down']).toContain(attrs.checks.redis.status);
    });

    it('should include storage health check', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      const attrs = extractAttributes(response.body);
      expect(attrs.checks).toHaveProperty('storage');
      expect(attrs.checks.storage).toHaveProperty('status');
      expect(['up', 'down']).toContain(attrs.checks.storage.status);
    });

    it('should include latency information', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      const attrs = extractAttributes(response.body);
      if (attrs.checks.database.status === 'up') {
        expect(attrs.checks.database).toHaveProperty('latency');
        expect(typeof attrs.checks.database.latency).toBe('number');
      }
    });
  });

  describe('/api/v1/health/live (GET)', () => {
    it('should return liveness status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/live')
        .expect(200);

      const attrs = extractAttributes(response.body);
      expect(attrs).toHaveProperty('status', 'alive');
      expect(attrs).toHaveProperty('timestamp');
    });

    it('should be fast (no dependency checks)', async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .get('/api/v1/health/live')
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('/api/v1/health/ready (GET)', () => {
    it('should return readiness status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200);

      const attrs = extractAttributes(response.body);
      expect(attrs).toHaveProperty('ready');
      expect(typeof attrs.ready).toBe('boolean');
      expect(attrs).toHaveProperty('checks');
    });

    it('should check all dependencies', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200);

      const attrs = extractAttributes(response.body);
      expect(attrs.checks).toHaveProperty('database');
      expect(attrs.checks).toHaveProperty('redis');
      expect(typeof attrs.checks.database).toBe('boolean');
      expect(typeof attrs.checks.redis).toBe('boolean');
    });

    it('should return ready=true only when all checks pass', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200);

      const attrs = extractAttributes(response.body);
      const checks = attrs.checks as Record<string, boolean>;
      const allChecksPass = Object.values(checks).every(v => v === true);
      expect(attrs.ready).toBe(allChecksPass);
    });
  });
});

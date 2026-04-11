import { INestApplication, ValidationPipe } from '@nestjs/common';
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/health (GET)', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(['healthy', 'unhealthy', 'degraded']).toContain(response.body.status);
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
    });

    it('should include database health check', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks.database).toHaveProperty('status');
      expect(['up', 'down']).toContain(response.body.checks.database.status);
    });

    it('should include redis health check', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.checks).toHaveProperty('redis');
      expect(response.body.checks.redis).toHaveProperty('status');
      expect(['up', 'down']).toContain(response.body.checks.redis.status);
    });

    it('should include storage health check', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.checks).toHaveProperty('storage');
      expect(response.body.checks.storage).toHaveProperty('status');
      expect(['up', 'down']).toContain(response.body.checks.storage.status);
    });

    it('should include latency information', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      if (response.body.checks.database.status === 'up') {
        expect(response.body.checks.database).toHaveProperty('latency');
        expect(typeof response.body.checks.database.latency).toBe('number');
      }
    });
  });

  describe('/health/live (GET)', () => {
    it('should return liveness status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'alive');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should be fast (no dependency checks)', async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .get('/health/live')
        .expect(200);
      const duration = Date.now() - start;

      // Liveness should be very fast (< 100ms)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('/health/ready (GET)', () => {
    it('should return readiness status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('ready');
      expect(typeof response.body.ready).toBe('boolean');
      expect(response.body).toHaveProperty('checks');
    });

    it('should check all dependencies', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);

      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks).toHaveProperty('redis');
      expect(response.body.checks).toHaveProperty('storage');
      expect(typeof response.body.checks.database).toBe('boolean');
      expect(typeof response.body.checks.redis).toBe('boolean');
      expect(typeof response.body.checks.storage).toBe('boolean');
    });

    it('should return ready=true only when all checks pass', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);

      const allChecksPass = Object.values(response.body.checks).every(v => v === true);
      expect(response.body.ready).toBe(allChecksPass);
    });
  });
});

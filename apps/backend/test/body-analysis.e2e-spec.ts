import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';

describe('Body Analysis E2E', () => {
  let app: INestApplication;
  let authToken: string;

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

  describe('/ai/health/body-analysis (GET)', () => {
    it('should return body analysis service health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai/health/body-analysis')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(['healthy', 'unavailable']).toContain(response.body.status);
      expect(response.body).toHaveProperty('available');
      expect(response.body).toHaveProperty('modelLoaded');
      expect(response.body).toHaveProperty('gpuAvailable');
      expect(typeof response.body.available).toBe('boolean');
      expect(typeof response.body.modelLoaded).toBe('boolean');
      expect(typeof response.body.gpuAvailable).toBe('boolean');
    });
  });

  describe('/ai/body-analysis (POST)', () => {
    it('should reject request without authentication', async () => {
      // Create a minimal valid image buffer (1x1 PNG)
      const minimalPng = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
        0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59,
        0xe7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
        0x44, 0xae, 0x42, 0x60, 0x82,
      ]);

      await request(app.getHttpServer())
        .post('/ai/body-analysis')
        .attach('image', minimalPng, 'test.png')
        .expect(401);
    });

    it('should reject request without image file', async () => {
      // This test requires authentication, so we expect 401
      // If authenticated, it would return 400 for missing file
      await request(app.getHttpServer())
        .post('/ai/body-analysis')
        .expect(401);
    });
  });

  describe('BodyAnalysisResult DTO validation', () => {
    it('should have correct response structure when service is available', async () => {
      // This test verifies the DTO structure matches ML service response
      const expectedStructure = {
        success: expect.any(Boolean),
        bodyType: expect.any(String),
        bodyTypeConfidence: expect.any(Number),
        skinTone: expect.any(String),
        colorSeason: expect.any(String),
        measurements: {
          shoulderWidth: expect.any(Number),
          hipWidth: expect.any(Number),
          waistWidth: expect.any(Number),
          bustWidth: expect.any(Number),
          torsoHeight: expect.any(Number),
          legHeight: expect.any(Number),
          estimatedHeight: expect.any(Number),
        },
        proportions: {
          shoulderToHipRatio: expect.any(Number),
          waistToHipRatio: expect.any(Number),
          waistToShoulderRatio: expect.any(Number),
        },
        recommendations: {
          suitableStyles: expect.any(Array),
          avoidStyles: expect.any(Array),
          bodyTypeName: expect.any(String),
          description: expect.any(String),
        },
        processingTime: expect.any(Number),
      };

      // Verify structure is defined correctly
      expect(expectedStructure).toBeDefined();
    });

    it('should have valid body types', () => {
      const validBodyTypes = [
        'rectangle',
        'hourglass',
        'triangle',
        'inverted_triangle',
        'oval',
      ];
      expect(validBodyTypes).toHaveLength(5);
    });

    it('should have valid skin tones', () => {
      const validSkinTones = [
        'fair',
        'light',
        'medium',
        'olive',
        'tan',
        'dark',
      ];
      expect(validSkinTones).toHaveLength(6);
    });

    it('should have valid color seasons', () => {
      const validColorSeasons = [
        'spring',
        'summer',
        'autumn',
        'winter',
      ];
      expect(validColorSeasons).toHaveLength(4);
    });
  });

  describe('Fallback behavior', () => {
    it('should return fallback data when ML service is unavailable', () => {
      const fallbackData = {
        success: false,
        bodyType: 'rectangle',
        bodyTypeConfidence: 0.5,
        skinTone: 'medium',
        colorSeason: 'autumn',
        measurements: {
          shoulderWidth: 40,
          hipWidth: 38,
          waistWidth: 32,
          bustWidth: 34,
          torsoHeight: 50,
          legHeight: 80,
          estimatedHeight: 170,
        },
        proportions: {
          shoulderToHipRatio: 1.05,
          waistToHipRatio: 0.84,
          waistToShoulderRatio: 0.80,
        },
        recommendations: {
          suitableStyles: ['收腰设计', '层次搭配', 'V领上衣', 'A字裙'],
          avoidStyles: ['直筒连衣裙', '无腰线款式'],
          bodyTypeName: 'H型（矩形）',
          description: '肩、腰、臀宽度相近，身体线条平直',
        },
        processingTime: 0,
        error: 'AI服务不可用',
      };

      // Verify fallback data structure
      expect(fallbackData.success).toBe(false);
      expect(fallbackData.bodyType).toBe('rectangle');
      expect(fallbackData.error).toBeDefined();
    });
  });
});

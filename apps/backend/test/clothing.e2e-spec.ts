/**
 * Clothing API E2E 集成测试
 *
 * 覆盖服装列表 API 的核心场景:
 * 1. 基础分页查询
 * 2. 分类/品牌/价格筛选
 * 3. 排序功能
 * 4. 边界条件 (page=0, limit>100)
 * 5. 商品详情查询
 * 6. 分类列表
 * 7. 热门标签
 * 8. 精选商品
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClothingCategory } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../src/app.module';

describe('Clothing API E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ==================== 基础分页查询 ====================
  describe('GET /clothing (基础分页)', () => {
    it('should return paginated clothing list with default params', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/clothing')
        .expect(200);

      // 验证分页结构
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('hasMore');
      expect(response.body).toHaveProperty('totalPages');

      // items 应为数组
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should respect page parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/clothing')
        .query({ page: 2 })
        .expect(200);

      expect(response.body.page).toBe(2);
    });

    it('should respect limit parameter with max 100', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/clothing')
        .query({ limit: 5 })
        .expect(200);

      expect(response.body.limit).toBeLessThanOrEqual(5);
      expect(response.body.items.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array for page beyond total', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/clothing')
        .query({ page: 99999 })
        .expect(200);

      expect(response.body.items.length).toBe(0);
      expect(response.body.hasMore).toBe(false);
    });

    it('should complete within timeout threshold (5s)', async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .get('/api/v1/clothing')
        .expect(200);
      const duration = Date.now() - start;

      // 查询应在 5 秒超时内完成
      expect(duration).toBeLessThan(5000);
    });
  });

  // ==================== 筛选功能 ====================
  describe('GET /clothing (筛选)', () => {
    it('should filter by category', async () => {
      const category = ClothingCategory.tops;
      const response = await request(app.getHttpServer())
        .get('/api/v1/clothing')
        .query({ category })
        .expect(200);

      // 所有返回的商品应属于该分类
      for (const item of response.body.items) {
        expect(item.category).toBe(category);
      }
    });

    it('should filter by price range', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/clothing')
        .query({ minPrice: 100, maxPrice: 500 })
        .expect(200);

      for (const item of response.body.items) {
        expect(item.price).toBeGreaterThanOrEqual(100);
        expect(item.price).toBeLessThanOrEqual(500);
      }
    });

    it('should reject invalid category value', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/clothing')
        .query({ category: 'invalid_category' })
        .expect(400);
    });

    it('should reject negative minPrice', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/clothing')
        .query({ minPrice: -10 })
        .expect(400);
    });

    it('should reject limit > 100', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/clothing')
        .query({ limit: 200 })
        .expect(400);
    });

    it('should reject page < 1', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/clothing')
        .query({ page: 0 })
        .expect(400);
    });

    it('should handle colors filter (comma-separated)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/clothing')
        .query({ colors: 'black,white' })
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    });
  });

  // ==================== 排序功能 ====================
  describe('GET /clothing (排序)', () => {
    it('should sort by price ascending', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/clothing')
        .query({ sortBy: 'price', sortOrder: 'asc', limit: 20 })
        .expect(200);

      if (response.body.items.length >= 2) {
        for (let i = 1; i < response.body.items.length; i++) {
          expect(response.body.items[i].price)
            .toBeGreaterThanOrEqual(response.body.items[i - 1].price);
        }
      }
    });

    it('should sort by createdAt descending (default)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/clothing')
        .query({ sortBy: 'createdAt', sortOrder: 'desc', limit: 20 })
        .expect(200);

      if (response.body.items.length >= 2) {
        const dates = response.body.items.map((item: { createdAt: string }) =>
          new Date(item.createdAt).getTime(),
        );
        for (let i = 1; i < dates.length; i++) {
          expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
        }
      }
    });

    it('should reject invalid sortBy value', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/clothing')
        .query({ sortBy: 'invalid_field' })
        .expect(400);
    });
  });

  // ==================== 商品详情 ====================
  describe('GET /clothing/:id (详情)', () => {
    it('should return item details for valid ID', async () => {
      // 先获取一个有效的商品 ID
      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/clothing')
        .query({ limit: 1 })
        .expect(200);

      if (listResponse.body.items.length > 0) {
        const itemId = listResponse.body.items[0].id;

        const detailResponse = await request(app.getHttpServer())
          .get(`/api/v1/clothing/${itemId}`)
          .expect(200);

        // 验证详情字段完整性
        expect(detailResponse.body).toHaveProperty('id', itemId);
        expect(detailResponse.body).toHaveProperty('name');
        expect(detailResponse.body).toHaveProperty('category');
        expect(detailResponse.body).toHaveProperty('price');
        expect(detailResponse.body).toHaveProperty('colors');
        expect(detailResponse.body).toHaveProperty('sizes');
        expect(detailResponse.body).toHaveProperty('viewCount');
        expect(detailResponse.body).toHaveProperty('brand');
      }
    });

    it('should return 404 for non-existent ID', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/clothing/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/clothing/not-a-valid-uuid')
        .expect(400);
    });
  });

  // ==================== 分类列表 ====================
  describe('GET /clothing/categories (分类)', () => {
    it('should return all clothing categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/clothing/categories')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // 应包含所有定义的分类枚举值
      const expectedCategories = Object.values(ClothingCategory);
      expect(response.body.length).toBe(expectedCategories.length);
    });
  });

  // ==================== 热门标签 ====================
  describe('GET /clothing/tags (标签)', () => {
    it('should return popular tags', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/clothing/tags')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/clothing/tags')
        .query({ limit: 5 })
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(5);
    });
  });

  // ==================== 精选商品 ====================
  describe('GET /clothing/featured (精选)', () => {
    it('should return featured items', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/clothing/featured')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/clothing/featured')
        .query({ limit: 3 })
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(3);
    });
  });

  // ==================== 响应结构一致性 ====================
  describe('响应结构验证', () => {
    it('list items should not contain description field (轻量返回)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/clothing')
        .query({ limit: 5 })
        .expect(200);

      for (const item of response.body.items) {
        // 列表接口不应返回 description（性能优化）
        expect(item.description).toBeNull();
        // 列表接口不应返回完整 images 数组
        expect(item.images).toEqual([]);
      }
    });

    it('detail should include full data (description, images, tags)', async () => {
      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/clothing')
        .query({ limit: 1 })
        .expect(200);

      if (listResponse.body.items.length > 0) {
        const itemId = listResponse.body.items[0].id;
        const detailResponse = await request(app.getHttpServer())
          .get(`/api/v1/clothing/${itemId}`)
          .expect(200);

        // 详情接口应包含完整数据
        expect(detailResponse.body).toHaveProperty('description');
        expect(detailResponse.body).toHaveProperty('images');
        expect(Array.isArray(detailResponse.body.images)).toBe(true);
        expect(detailResponse.body).toHaveProperty('tags');
      }
    });

    it('each item should have brand info when brandId exists', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/clothing')
        .query({ limit: 20 })
        .expect(200);

      const itemsWithBrand = response.body.items.filter(
        (item: { brandId: string | null }) => item.brandId !== null,
      );

      for (const item of itemsWithBrand) {
        expect(item.brand).toBeDefined();
        expect(item.brand).toHaveProperty('id');
        expect(item.brand).toHaveProperty('name');
      }
    });
  });
});

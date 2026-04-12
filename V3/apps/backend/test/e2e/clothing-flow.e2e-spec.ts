import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { ClothingModule } from '../../src/modules/clothing/clothing.module';
import { FavoritesModule } from '../../src/modules/favorites/favorites.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { E2eTestHelper, API_PREFIX } from './utils/test-app.helper';

describe('Clothing Flow E2E', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: string;

  function reRegisterUserMock(): void {
    E2eTestHelper.prisma.user.findUnique.mockImplementation((args: { where: { id?: string; phone?: string } }) => {
      if (args.where.id === userId || args.where.phone === '13800138010') {
        return Promise.resolve({
          id: userId,
          phone: '13800138010',
          nickname: '用户8010',
          avatarUrl: null,
          role: 'user',
        });
      }
      return Promise.resolve(null);
    });
  }

  beforeAll(async () => {
    app = await E2eTestHelper.initApp({ modules: [AuthModule, ClothingModule, FavoritesModule] });
    const tokens = await E2eTestHelper.registerTestUser('13800138010');
    accessToken = tokens.accessToken;
    userId = tokens.userId;
  });

  afterAll(async () => {
    await E2eTestHelper.closeApp();
  });

  afterEach(() => {
    E2eTestHelper.resetMocks();
    reRegisterUserMock();
  });

  describe('GET /clothing', () => {
    it('should return paginated clothing list', async () => {
      E2eTestHelper.seedClothingData();

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/clothing?page=1&limit=10`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { id: string; name: string }[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta.total).toBeGreaterThanOrEqual(1);
      expect(body.meta.page).toBe(1);
      expect(body.meta.limit).toBe(10);
    });

    it('should return empty list for page beyond results', async () => {
      E2eTestHelper.prisma.clothingItem.findMany.mockResolvedValue([]);
      E2eTestHelper.prisma.clothingItem.count.mockResolvedValue(0);

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/clothing?page=999&limit=10`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: unknown[];
        meta: { total: number };
      };
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(0);
    });

    it('should apply default pagination when no params', async () => {
      E2eTestHelper.seedClothingData();

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/clothing`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: unknown[];
        meta: { page: number; limit: number };
      };
      expect(body.success).toBe(true);
      expect(body.meta.page).toBeDefined();
      expect(body.meta.limit).toBeDefined();
    });
  });

  describe('GET /clothing/:id', () => {
    it('should return clothing detail by id', async () => {
      const seed = E2eTestHelper.seedClothingData();

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/clothing/${seed.clothingId}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: {
          id: string;
          name: string;
          price: number;
          brand: { id: string; name: string };
          category: { id: string; name: string };
          colors: string[];
        };
      };
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(seed.clothingId);
      expect(body.data.name).toBeDefined();
      expect(body.data.brand).toBeDefined();
      expect(body.data.category).toBeDefined();
      expect(body.data.colors).toContain('white');
    });

    it('should return 404 for non-existent clothing id', async () => {
      E2eTestHelper.prisma.clothingItem.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/clothing/00000000-0000-0000-0000-000000000000`)
        .expect(404);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });
  });

  describe('POST /favorites', () => {
    it('should add clothing to favorites', async () => {
      const seed = E2eTestHelper.seedClothingData();
      const favoriteId = uuidv4();
      E2eTestHelper.prisma.favorite.findUnique.mockResolvedValue(null);
      E2eTestHelper.prisma.favorite.create.mockResolvedValue({
        id: favoriteId,
        userId,
        targetType: 'clothing',
        targetId: seed.clothingId,
        createdAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/favorites`)
        .set(E2eTestHelper.authHeader(accessToken))
        .send({ targetType: 'clothing', targetId: seed.clothingId })
        .expect(201);

      const body = res.body as {
        success: boolean;
        data: { id: string; targetType: string; targetId: string };
      };
      expect(body.success).toBe(true);
      expect(body.data.targetType).toBe('clothing');
      expect(body.data.targetId).toBe(seed.clothingId);
    });

    it('should reject duplicate favorite', async () => {
      const seed = E2eTestHelper.seedClothingData();
      E2eTestHelper.prisma.favorite.findUnique.mockResolvedValue({
        id: uuidv4(),
        userId,
        targetType: 'clothing',
        targetId: seed.clothingId,
        createdAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/favorites`)
        .set(E2eTestHelper.authHeader(accessToken))
        .send({ targetType: 'clothing', targetId: seed.clothingId });

      expect(res.status).toBe(409);
    });

    it('should reject favorite without authentication', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/favorites`)
        .send({ targetType: 'clothing', targetId: uuidv4() })
        .expect(401);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });
  });

  describe('GET /favorites', () => {
    it('should return favorites filtered by targetType', async () => {
      const favTargetId = uuidv4();
      E2eTestHelper.prisma.favorite.findMany.mockResolvedValue([
        { id: uuidv4(), userId, targetType: 'clothing', targetId: favTargetId, createdAt: new Date() },
      ]);
      E2eTestHelper.prisma.favorite.count.mockResolvedValue(1);
      E2eTestHelper.prisma.clothingItem.findMany.mockResolvedValue([
        { id: favTargetId, name: 'Test', price: 100, imageUrls: [], gender: 'unisex', colors: [] },
      ]);

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/favorites?target_type=clothing`)
        .set(E2eTestHelper.authHeader(accessToken))
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { items: { targetType: string; targetId: string }[]; total: number };
      };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.items)).toBe(true);
      expect(body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(body.data.items[0].targetType).toBe('clothing');
    });

    it('should reject favorites without authentication', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/favorites?target_type=clothing`)
        .expect(401);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });
  });

  describe('GET /clothing/categories', () => {
    it('should return category tree', async () => {
      E2eTestHelper.seedClothingData();

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/clothing/categories`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { id: string; name: string; slug: string }[];
      };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /clothing/brands', () => {
    it('should return brand list', async () => {
      E2eTestHelper.seedClothingData();

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/clothing/brands`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { id: string; name: string }[];
      };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});

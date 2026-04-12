import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { SearchController } from '../../src/modules/search/search.controller';
import { SearchService } from '../../src/modules/search/search.service';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { E2eTestHelper, API_PREFIX } from './utils/test-app.helper';

const mockSearchProvider = {
  search: jest.fn().mockResolvedValue({
    clothing: [],
    posts: [],
    users: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  }),
  suggest: jest.fn().mockResolvedValue([]),
  index: jest.fn().mockResolvedValue(undefined),
  removeFromIndex: jest.fn().mockResolvedValue(undefined),
  isAvailable: jest.fn().mockResolvedValue(false),
};

const mockDatabaseProvider = {
  search: jest.fn().mockResolvedValue({
    clothing: [],
    posts: [],
    users: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  }),
  suggest: jest.fn().mockResolvedValue([]),
  index: jest.fn().mockResolvedValue(undefined),
  removeFromIndex: jest.fn().mockResolvedValue(undefined),
  isAvailable: jest.fn().mockResolvedValue(true),
};

describe('Search Flow E2E', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    app = await E2eTestHelper.initApp({
      modules: [AuthModule],
      controllers: [SearchController],
      providers: [
        { provide: 'SEARCH_PROVIDER', useValue: mockSearchProvider },
        { provide: 'DATABASE_SEARCH_PROVIDER', useValue: mockDatabaseProvider },
        {
          provide: SearchService,
          useValue: new SearchService(mockSearchProvider, mockDatabaseProvider, E2eTestHelper.prisma),
        },
      ],
    });

    const tokens = await E2eTestHelper.registerTestUser('13800138030');
    accessToken = tokens.accessToken;
    userId = tokens.userId;
  });

  afterAll(async () => {
    await E2eTestHelper.closeApp();
  });

  afterEach(() => {
    E2eTestHelper.resetMocks();
    jest.clearAllMocks();
  });

  describe('GET /search', () => {
    it('should search by keyword and return results', async () => {
      mockDatabaseProvider.search.mockResolvedValueOnce({
        clothing: [
          {
            id: uuidv4(),
            name: '白色T恤',
            description: '简约白色T恤',
            price: 199,
            originalPrice: 299,
            currency: 'CNY',
            imageUrls: ['https://example.com/tshirt.jpg'],
            colors: ['white'],
            styleTags: ['minimal'],
            brandName: 'TestBrand',
            purchaseUrl: null,
          },
        ],
        posts: [],
        users: [],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/search?q=白色`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: {
          clothing: unknown[];
          posts: unknown[];
          total: number;
        };
      };
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it('should search with type filter', async () => {
      mockDatabaseProvider.search.mockResolvedValueOnce({
        clothing: [],
        posts: [],
        users: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/search?q=白色&type=clothing`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: {
          clothing: unknown[];
          total: number;
        };
      };
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it('should search with pagination', async () => {
      mockDatabaseProvider.search.mockResolvedValueOnce({
        clothing: [],
        posts: [],
        users: [],
        total: 0,
        page: 1,
        limit: 5,
        totalPages: 0,
      });

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/search?q=T恤&page=1&limit=5`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: unknown;
      };
      expect(body.success).toBe(true);
    });

    it('should return empty results for non-matching query', async () => {
      mockDatabaseProvider.search.mockResolvedValueOnce({
        clothing: [],
        posts: [],
        users: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/search?q=zzzznonexistent`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: {
          clothing: unknown[];
          posts: unknown[];
          total: number;
        };
      };
      expect(body.success).toBe(true);
      expect(body.data.total).toBe(0);
    });

    it('should return results even without q parameter (uses default empty string)', async () => {
      mockDatabaseProvider.search.mockResolvedValueOnce({
        clothing: [],
        posts: [],
        users: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/search`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: unknown;
      };
      expect(body.success).toBe(true);
    });

    it('should reject invalid type parameter', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/search?q=test&type=invalid_type`)
        .expect(400);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });
  });

  describe('GET /search/suggestions', () => {
    it('should return search suggestions', async () => {
      mockDatabaseProvider.suggest.mockResolvedValueOnce([
        { text: '白色T恤', type: 'clothing' },
        { text: '白色衬衫', type: 'clothing' },
      ]);

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/search/suggestions?q=白`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { suggestions: { text: string; type: string }[] };
      };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.suggestions)).toBe(true);
    });

    it('should return suggestions with custom limit', async () => {
      mockDatabaseProvider.suggest.mockResolvedValueOnce([
        { text: '白色T恤', type: 'clothing' },
      ]);

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/search/suggestions?q=白&limit=3`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { suggestions: { text: string }[] };
      };
      expect(body.success).toBe(true);
      expect(body.data.suggestions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('GET /search/hot', () => {
    it('should return hot keywords', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/search/hot`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { keywords: unknown[] };
      };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.keywords)).toBe(true);
    });
  });

  describe('GET /search/history', () => {
    it('should return user search history with authentication', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/search/history`)
        .set(E2eTestHelper.authHeader(accessToken))
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { items: unknown[] };
      };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.items)).toBe(true);
    });

    it('should reject search history without authentication', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/search/history`)
        .expect(401);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { PrismaModule } from '../../../src/prisma/prisma.module';
import { TransformInterceptor } from '../../../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../../../src/common/filters/http-exception.filter';
import { MockSmsProvider } from '../../../src/modules/auth/providers/mock-sms.provider';
import { validate } from '../../../src/config/env';
import {
  MockPrismaService,
  createMockPrismaService,
  resetMockPrismaService,
} from '../../utils/mock-prisma';

const API_PREFIX = '/api/v1';

export { API_PREFIX };

interface AuthTokens {
  accessToken: string;
  userId: string;
}

interface MockRedisClient {
  get: jest.Mock<Promise<string | null>, [string]>;
  set: jest.Mock<Promise<string | null>, [string, string, ...unknown[]]>;
  del: jest.Mock<Promise<number>, [string | string[]]>;
  keys: jest.Mock<Promise<string[]>, [string]>;
  flushdb: jest.Mock<Promise<string>, []>;
  exists: jest.Mock<Promise<number>, [string]>;
  expire: jest.Mock<Promise<number>, [string, number]>;
  ttl: jest.Mock<Promise<number>, [string]>;
  incr: jest.Mock<Promise<number>, [string]>;
  sadd: jest.Mock<Promise<number>, [string, ...string[]]>;
  srem: jest.Mock<Promise<number>, [string, ...string[]]>;
  smembers: jest.Mock<Promise<string[]>, [string]>;
  ping: jest.Mock<Promise<string>, []>;
  quit: jest.Mock<Promise<string>, []>;
  on: jest.Mock;
  connect: jest.Mock<Promise<void>, []>;
  status: string;
  zrevrange: jest.Mock<Promise<string[]>, [string, number, number, ...string[]]>;
  zincrby: jest.Mock<Promise<string>, [string, number, string]>;
  lrange: jest.Mock<Promise<string[]>, [string, number, number]>;
  lpush: jest.Mock<Promise<number>, [string, ...string[]]>;
  lrem: jest.Mock<Promise<number>, [string, number, string]>;
  ltrim: jest.Mock<Promise<string>, [string, number, number]>;
  pipeline: jest.Mock;
  disconnect: jest.Mock;
}

function createMockRedisClient(): MockRedisClient {
  const store = new Map<string, string>();

  return {
    get: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    set: jest.fn((key: string, value: string, ..._args: unknown[]) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    del: jest.fn((key: string | string[]) => {
      const keys = Array.isArray(key) ? key : [key];
      let count = 0;
      for (const k of keys) {
        if (store.delete(k)) count++;
      }
      return Promise.resolve(count);
    }),
    keys: jest.fn((pattern: string) => {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return Promise.resolve([...store.keys()].filter((k) => regex.test(k)));
    }),
    flushdb: jest.fn(() => {
      store.clear();
      return Promise.resolve('OK');
    }),
    exists: jest.fn((key: string) => Promise.resolve(store.has(key) ? 1 : 0)),
    expire: jest.fn(() => Promise.resolve(1)),
    ttl: jest.fn(() => Promise.resolve(-2)),
    incr: jest.fn((key: string) => {
      const val = (parseInt(store.get(key) ?? '0', 10) + 1).toString();
      store.set(key, val);
      return Promise.resolve(parseInt(val, 10));
    }),
    sadd: jest.fn(() => Promise.resolve(1)),
    srem: jest.fn(() => Promise.resolve(1)),
    smembers: jest.fn(() => Promise.resolve([])),
    ping: jest.fn(() => Promise.resolve('PONG')),
    quit: jest.fn(() => Promise.resolve('OK')),
    on: jest.fn().mockReturnThis(),
    connect: jest.fn(() => Promise.resolve(undefined)),
    status: 'ready',
    zrevrange: jest.fn(() => Promise.resolve([])),
    zincrby: jest.fn(() => Promise.resolve('1')),
    lrange: jest.fn(() => Promise.resolve([])),
    lpush: jest.fn(() => Promise.resolve(1)),
    lrem: jest.fn(() => Promise.resolve(1)),
    ltrim: jest.fn(() => Promise.resolve('OK')),
    pipeline: jest.fn(() => ({
      lrem: jest.fn().mockReturnThis(),
      lpush: jest.fn().mockReturnThis(),
      ltrim: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn(() => Promise.resolve([])),
    })),
    disconnect: jest.fn(),
  };
}

type ModuleImport = new (...args: unknown[]) => unknown;

interface OverrideConfig {
  provide: string | symbol | Function;
  useValue?: unknown;
  useClass?: new (...args: unknown[]) => unknown;
}

interface InitAppOptions {
  modules?: ModuleImport[];
  controllers?: new (...args: unknown[]) => unknown[];
  providers?: (OverrideConfig | (new (...args: unknown[]) => unknown))[];
  overrides?: OverrideConfig[];
}

export class E2eTestHelper {
  private static app: INestApplication | null = null;
  private static mockPrisma: MockPrismaService;
  private static mockRedis: MockRedisClient;
  private static jwtService: JwtService | null = null;

  static get prisma(): MockPrismaService {
    return this.mockPrisma;
  }

  static get redis(): MockRedisClient {
    return this.mockRedis;
  }

  static async initApp(options: InitAppOptions = {}): Promise<INestApplication> {
    const { modules = [], controllers = [], providers = [], overrides = [] } = options;

    if (this.app) {
      return this.app;
    }

    this.mockPrisma = createMockPrismaService();
    this.mockRedis = createMockRedisClient();

    let builder = Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validate,
          envFilePath: ['.env.local', '.env'],
        }),
        PassportModule,
        JwtModule.registerAsync({
          useFactory: (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET', 'test-secret-key-for-e2e-testing-min-32-chars'),
            signOptions: {
              expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
            },
          }),
          inject: [ConfigService],
        }),
        PrismaModule,
        ...modules,
      ],
      controllers: [...controllers],
      providers: [...providers],
    });

    builder = builder
      .overrideProvider(PrismaService)
      .useValue(this.mockPrisma)
      .overrideProvider('REDIS_CLIENT')
      .useValue(this.mockRedis)
      .overrideProvider('SMS_PROVIDER')
      .useClass(MockSmsProvider);

    for (const ov of overrides) {
      if (ov.useValue !== undefined) {
        builder = builder.overrideProvider(ov.provide).useValue(ov.useValue);
      } else if (ov.useClass !== undefined) {
        builder = builder.overrideProvider(ov.provide).useClass(ov.useClass);
      }
    }

    const moduleFixture: TestingModule = await builder.compile();

    this.app = moduleFixture.createNestApplication();

    this.app.setGlobalPrefix('api/v1');

    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    this.app.useGlobalInterceptors(new TransformInterceptor());
    this.app.useGlobalFilters(new HttpExceptionFilter());

    await this.app.init();

    try {
      this.jwtService = this.app.get(JwtService);
    } catch {
      this.jwtService = null;
    }

    return this.app;
  }

  static async closeApp(): Promise<void> {
    if (this.app) {
      await this.app.close();
      this.app = null;
      this.jwtService = null;
    }
  }

  static resetMocks(): void {
    resetMockPrismaService(this.mockPrisma);
    jest.clearAllMocks();
  }

  static generateAuthToken(userId?: string): string {
    if (!this.jwtService) {
      throw new Error('JwtService not available');
    }
    const id = userId ?? uuidv4();
    return this.jwtService.sign({
      sub: id,
      phone: '13800138000',
      role: 'user',
      type: 'access',
    });
  }

  static authHeader(token?: string): { Authorization: string } {
    const authToken = token ?? this.generateAuthToken();
    return { Authorization: `Bearer ${authToken}` };
  }

  static async registerTestUser(
    phone: string = '13800138000',
  ): Promise<AuthTokens> {
    const userId = uuidv4();
    const accessToken = this.generateAuthToken(userId);

    this.mockPrisma.user.findUnique.mockResolvedValue({
      id: userId,
      phone,
      nickname: `用户${phone.slice(-4)}`,
      avatarUrl: null,
      role: 'user',
      language: 'zh',
      gender: null,
      birthYear: null,
      height: null,
      weight: null,
      bodyType: null,
      colorSeason: null,
      passwordHash: null,
      email: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { accessToken, userId };
  }

  static async createSecondUser(
    phone: string = '13900139000',
  ): Promise<AuthTokens> {
    return this.registerTestUser(phone);
  }

  static seedClothingData(): {
    brandId: string;
    categoryId: string;
    clothingId: string;
  } {
    const brandId = uuidv4();
    const categoryId = uuidv4();
    const clothingId = uuidv4();

    this.mockPrisma.brand.findMany.mockResolvedValue([
      { id: brandId, name: 'TestBrand', logoUrl: null, description: 'E2E test brand' },
    ]);

    this.mockPrisma.category.findMany.mockResolvedValue([
      {
        id: categoryId,
        name: 'T恤',
        nameEn: 'T-Shirt',
        slug: 'tshirt-e2e',
        parentId: null,
        sortOrder: 1,
      },
    ]);

    this.mockPrisma.clothingItem.findMany.mockResolvedValue([
      {
        id: clothingId,
        brandId,
        categoryId,
        name: 'E2E白色T恤',
        description: 'E2E测试用白色T恤',
        price: { toNumber: () => 199.0 },
        originalPrice: { toNumber: () => 299.0 },
        currency: 'CNY',
        gender: 'unisex',
        seasons: ['spring', 'summer'],
        occasions: ['casual', 'daily'],
        styleTags: ['minimal', 'basic'],
        colors: ['white'],
        materials: ['cotton'],
        fitType: 'regular',
        imageUrls: ['https://example.com/tshirt.jpg'],
        isActive: true,
        sourceUrl: null,
        purchaseUrl: null,
        sourceName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        brand: { id: brandId, name: 'TestBrand', logoUrl: null, description: 'E2E test brand' },
        category: { id: categoryId, name: 'T恤', nameEn: 'T-Shirt', slug: 'tshirt-e2e', parentId: null, sortOrder: 1 },
      },
    ]);

    this.mockPrisma.clothingItem.count.mockResolvedValue(1);

    this.mockPrisma.clothingItem.findUnique.mockResolvedValue({
      id: clothingId,
      brandId,
      categoryId,
      name: 'E2E白色T恤',
      description: 'E2E测试用白色T恤',
      price: { toNumber: () => 199.0 },
      originalPrice: { toNumber: () => 299.0 },
      currency: 'CNY',
      gender: 'unisex',
      seasons: ['spring', 'summer'],
      occasions: ['casual', 'daily'],
      styleTags: ['minimal', 'basic'],
      colors: ['white'],
      materials: ['cotton'],
      fitType: 'regular',
      imageUrls: ['https://example.com/tshirt.jpg'],
      isActive: true,
      sourceUrl: null,
      purchaseUrl: null,
      sourceName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      brand: { id: brandId, name: 'TestBrand', logoUrl: null, description: 'E2E test brand' },
      category: { id: categoryId, name: 'T恤', nameEn: 'T-Shirt', slug: 'tshirt-e2e', parentId: null, sortOrder: 1 },
    });

    return { brandId, categoryId, clothingId };
  }
}

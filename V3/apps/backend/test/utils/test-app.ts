import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, DynamicModule, ForwardReference, Type, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { MockPrismaService, createMockPrismaService, resetMockPrismaService } from './mock-prisma';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

const API_PREFIX = '/api/v1';

export { API_PREFIX };

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

type ImportType = Type<unknown> | DynamicModule | Promise<DynamicModule> | ForwardReference;

interface TestAppOptions {
  imports?: ImportType[];
  providers?: Provider[];
  overrides?: (builder: ReturnType<typeof Test.createTestingModule>) => ReturnType<typeof Test.createTestingModule>;
}

export class TestApp {
  private app: INestApplication | null = null;
  private moduleRef: TestingModule | null = null;
  private mockPrisma: MockPrismaService;
  private jwtService: JwtService | null = null;

  constructor() {
    this.mockPrisma = createMockPrismaService();
  }

  get prisma(): MockPrismaService {
    return this.mockPrisma;
  }

  async create(options?: TestAppOptions): Promise<INestApplication> {
    this.mockPrisma = createMockPrismaService();

    const defaultImports: ImportType[] = [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [() => ({
          DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
          JWT_SECRET: 'test-jwt-secret-for-unit-tests-only',
          JWT_ACCESS_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '7d',
          REDIS_URL: 'redis://localhost:6379',
          MINIO_ENDPOINT: 'localhost',
          MINIO_PORT: '9000',
          MINIO_ACCESS_KEY: 'minioadmin',
          MINIO_SECRET_KEY: 'minioadmin',
          MINIO_BUCKET: 'aineed',
          ZHIPU_API_KEY: 'test-key',
          APP_PORT: '3001',
          APP_ENV: 'test',
          CORS_ORIGIN: '*',
        })],
        ignoreEnvFile: true,
      }),
      PassportModule.register({ defaultStrategy: 'jwt' }),
      JwtModule.register({
        secret: 'test-jwt-secret-for-unit-tests-only',
        signOptions: { expiresIn: '15m' },
      }),
    ];

    const allImports = [...defaultImports, ...(options?.imports ?? [])];
    const allProviders: Provider[] = [...(options?.providers ?? [])];

    let moduleBuilder = Test.createTestingModule({
      imports: allImports,
      providers: allProviders,
    });

    moduleBuilder = moduleBuilder.overrideProvider(PrismaService).useValue(this.mockPrisma);

    if (options?.overrides) {
      moduleBuilder = options.overrides(moduleBuilder);
    }

    this.moduleRef = await moduleBuilder.compile();

    this.app = this.moduleRef.createNestApplication();

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

  request(): request.Agent {
    if (!this.app) {
      throw new Error('TestApp not initialized. Call create() first.');
    }
    return request(this.app.getHttpServer());
  }

  async close(): Promise<void> {
    if (this.app) {
      await this.app.close();
      this.app = null;
      this.moduleRef = null;
      this.jwtService = null;
    }
  }

  resetMocks(): void {
    resetMockPrismaService(this.mockPrisma);
  }

  generateAuthToken(userId?: string): string {
    if (!this.jwtService) {
      throw new Error('JwtService not available. Ensure JwtModule is imported in test app.');
    }
    return this.jwtService.sign({
      sub: userId ?? uuidv4(),
      phone: '13800138000',
      role: 'user',
      type: 'access',
    });
  }

  authHeader(token?: string): { Authorization: string } {
    const authToken = token ?? this.generateAuthToken();
    return { Authorization: `Bearer ${authToken}` };
  }

  async generateAuthTokens(userId?: string): Promise<AuthTokens> {
    if (!this.jwtService) {
      throw new Error('JwtService not available. Ensure JwtModule is imported in test app.');
    }
    const id = userId ?? uuidv4();
    const accessToken = this.jwtService.sign({
      sub: id,
      phone: '13800138000',
      role: 'user',
      type: 'access',
    });
    const refreshToken = this.jwtService.sign(
      { sub: id, phone: '13800138000', role: 'user', type: 'refresh' },
      { expiresIn: '7d' },
    );
    return { accessToken, refreshToken, userId: id };
  }
}

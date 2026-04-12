import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { E2eTestHelper, API_PREFIX } from './utils/test-app.helper';

describe('Auth Flow E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await E2eTestHelper.initApp({ modules: [AuthModule, UsersModule] });
  });

  afterAll(async () => {
    await E2eTestHelper.closeApp();
  });

  afterEach(() => {
    E2eTestHelper.resetMocks();
  });

  describe('POST /auth/send-code', () => {
    it('should send verification code for valid phone', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/send-code`)
        .send({ phone: '13800138000' })
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { message: string };
      };
      expect(body.success).toBe(true);
      expect(body.data.message).toBe('验证码已发送');
    });

    it('should reject invalid phone format', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/send-code`)
        .send({ phone: '123' })
        .expect(400);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });

    it('should reject missing phone field', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/send-code`)
        .send({})
        .expect(400);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });
  });

  describe('POST /auth/verify-code', () => {
    const testPhone = '13800138001';

    it('should verify code and return tokens for new user (register)', async () => {
      await E2eTestHelper.redis.set(`sms:code:${testPhone}`, '123456', 'EX', 300);

      E2eTestHelper.prisma.user.findUnique.mockResolvedValue(null);
      E2eTestHelper.prisma.user.create.mockResolvedValue({
        id: 'user-001',
        phone: testPhone,
        nickname: '用户8001',
        avatarUrl: null,
        role: 'user',
      });

      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/verify-code`)
        .send({ phone: testPhone, code: '123456' })
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: {
          accessToken: string;
          refreshToken: string;
          user: { id: string; phone: string; nickname: string; role: string };
        };
      };
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
      expect(body.data.user.phone).toBe(testPhone);
      expect(body.data.user.role).toBe('user');
    });

    it('should verify code and return tokens for existing user (login)', async () => {
      await E2eTestHelper.redis.set(`sms:code:${testPhone}`, '654321', 'EX', 300);

      E2eTestHelper.prisma.user.findUnique.mockResolvedValue({
        id: 'user-001',
        phone: testPhone,
        nickname: '用户8001',
        avatarUrl: null,
        role: 'user',
      });

      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/verify-code`)
        .send({ phone: testPhone, code: '654321' })
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: {
          accessToken: string;
          refreshToken: string;
          user: { id: string; phone: string };
        };
      };
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
      expect(body.data.user.phone).toBe(testPhone);
    });

    it('should reject wrong verification code', async () => {
      await E2eTestHelper.redis.set(`sms:code:${testPhone}`, '999999', 'EX', 300);

      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/verify-code`)
        .send({ phone: testPhone, code: '000000' })
        .expect(401);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });

    it('should reject expired verification code', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/verify-code`)
        .send({ phone: testPhone, code: '123456' })
        .expect(401);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });

    it('should reject code with wrong length', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/verify-code`)
        .send({ phone: testPhone, code: '123' })
        .expect(400);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });
  });

  describe('GET /users/me', () => {
    it('should get current user info with valid token', async () => {
      const tokens = await E2eTestHelper.registerTestUser('13800138002');

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/users/me`)
        .set(E2eTestHelper.authHeader(tokens.accessToken))
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { id: string; phone: string; nickname: string };
      };
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(tokens.userId);
      expect(body.data.phone).toBe('13800138002');
    });

    it('should reject request without token', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/users/me`)
        .expect(401);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/users/me`)
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const tokens = await E2eTestHelper.registerTestUser('13800138003');
      const refreshToken = E2eTestHelper['jwtService']!.sign(
        { sub: tokens.userId, phone: '13800138003', role: 'user', type: 'refresh' },
        { expiresIn: '7d' },
      );
      await E2eTestHelper.redis.set(`refresh:${tokens.userId}`, refreshToken, 'EX', 604800);

      E2eTestHelper.prisma.user.findUnique.mockResolvedValue({
        id: tokens.userId,
        phone: '13800138003',
        nickname: '用户8003',
        avatarUrl: null,
        role: 'user',
      });

      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/refresh`)
        .send({ refreshToken })
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: {
          accessToken: string;
          refreshToken: string;
          user: { id: string };
        };
      };
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/refresh`)
        .send({ refreshToken: 'invalid.refresh.token' })
        .expect(401);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });

    it('should reject missing refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/refresh`)
        .send({})
        .expect(400);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const tokens = await E2eTestHelper.registerTestUser('13800138004');

      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/logout`)
        .set(E2eTestHelper.authHeader(tokens.accessToken))
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { message: string };
      };
      expect(body.success).toBe(true);
      expect(body.data.message).toBe('已登出');
    });

    it('should reject logout without token', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/logout`)
        .expect(401);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });
  });
});

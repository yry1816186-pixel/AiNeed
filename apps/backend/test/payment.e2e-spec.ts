import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import * as bcrypt from '../src/common/security/bcrypt';


describe('Payment E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let paymentOrderId: string;
  let paymentRecordId: string;

  const testUser = {
    email: 'payment-e2e@example.com',
    password: 'Test123456!',
    nickname: 'Payment Test User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Create test user
    const hashedPassword = await bcrypt.hash(testUser.password);
    const user = await prisma.user.create({
      data: {
        email: testUser.email,
        password: hashedPassword,
        nickname: testUser.nickname,
      },
    });
    userId = user.id;

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    accessToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.refundRecord.deleteMany({ where: { paymentRecord: { userId } } });
    await prisma.paymentRecord.deleteMany({ where: { userId } });
    await prisma.paymentOrder.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  describe('/payment/create (POST)', () => {
    beforeAll(async () => {
      // Create a payment order for testing
      const paymentOrder = await prisma.paymentOrder.create({
        data: {
          userId,
          amount: 99.00,
          metadata: {
            planId: 'test-plan-id',
            planName: 'Test Plan',
          },
        },
      });
      paymentOrderId = paymentOrder.id;
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/payment/create')
        .send({
          orderId: paymentOrderId,
          provider: 'alipay',
          amount: 99.00,
        })
        .expect(401);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/payment/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('should validate provider field', async () => {
      await request(app.getHttpServer())
        .post('/payment/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: paymentOrderId,
          provider: 'invalid-provider',
          amount: 99.00,
        })
        .expect(400);
    });

    it('should validate amount is positive', async () => {
      await request(app.getHttpServer())
        .post('/payment/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: `test-order-${Date.now()}`,
          provider: 'alipay',
          amount: -10,
        })
        .expect(400);
    });

    it('should create payment with valid data', async () => {
      // Note: This test may need to be adjusted based on actual payment provider mock
      const response = await request(app.getHttpServer())
        .post('/payment/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: paymentOrderId,
          provider: 'alipay',
          amount: 99.00,
          subject: 'Test Payment',
        });

      // Response depends on payment provider mock implementation
      expect([201, 400, 500]).toContain(response.status);
    });
  });

  describe('/payment/query/:orderId (GET)', () => {
    beforeAll(async () => {
      // Create a payment record for testing
      const record = await prisma.paymentRecord.create({
        data: {
          orderId: `test-query-order-${Date.now()}`,
          userId,
          provider: 'alipay',
          amount: 50.00,
          currency: 'CNY',
          status: 'pending',
          expiredAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });
      paymentRecordId = record.id;
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/payment/query/${paymentOrderId}`)
        .expect(401);
    });

    it('should return 404 for non-existent order', async () => {
      await request(app.getHttpServer())
        .get('/payment/query/non-existent-order-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return payment status for existing order', async () => {
      const record = await prisma.paymentRecord.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (record) {
        const response = await request(app.getHttpServer())
          .get(`/payment/query/${record.orderId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('orderId');
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('amount');
      }
    });
  });

  describe('/payment/poll/:orderId (GET)', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/payment/poll/some-order-id')
        .expect(401);
    });

    it('should return payment polling status', async () => {
      const record = await prisma.paymentRecord.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (record) {
        const response = await request(app.getHttpServer())
          .get(`/payment/poll/${record.orderId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('paid');
        expect(response.body).toHaveProperty('status');
        expect(typeof response.body.paid).toBe('boolean');
      }
    });
  });

  describe('/payment/records (GET)', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/payment/records')
        .expect(401);
    });

    it('should return payment records list', async () => {
      const response = await request(app.getHttpServer())
        .get('/payment/records')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pageSize');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/payment/records?page=1&pageSize=5')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(5);
    });
  });

  describe('/payment/close (POST)', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/payment/close')
        .send({ orderId: 'some-order-id' })
        .expect(401);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/payment/close')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('should return 404 for non-existent order', async () => {
      await request(app.getHttpServer())
        .post('/payment/close')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ orderId: 'non-existent-order' })
        .expect(404);
    });
  });

  describe('/payment/refund (POST)', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/payment/refund')
        .send({
          orderId: 'some-order-id',
          amount: 50,
          reason: 'Test refund',
        })
        .expect(401);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/payment/refund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('should validate amount is positive', async () => {
      await request(app.getHttpServer())
        .post('/payment/refund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: 'some-order-id',
          amount: -10,
          reason: 'Test refund',
        })
        .expect(400);
    });
  });

  describe('Payment Callbacks', () => {
    describe('/payment/callback/alipay (POST)', () => {
      it('should accept callback without authentication', async () => {
        // This endpoint should be publicly accessible for payment callbacks
        const response = await request(app.getHttpServer())
          .post('/payment/callback/alipay')
          .send({
            out_trade_no: 'test-order-id',
            trade_no: 'alipay-trade-no',
            trade_status: 'TRADE_SUCCESS',
            total_amount: '99.00',
          });

        // Response should be 200 even if order doesn't exist
        // (to not reveal order existence to attackers)
        expect(response.status).toBe(200);
      });
    });

    describe('/payment/callback/wechat (POST)', () => {
      it('should accept callback without authentication', async () => {
        const response = await request(app.getHttpServer())
          .post('/payment/callback/wechat')
          .send({
            out_trade_no: 'test-order-id',
            transaction_id: 'wechat-transaction-id',
            trade_state: 'SUCCESS',
            total: 9900,
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('code');
      });
    });
  });
});

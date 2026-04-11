import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import * as bcrypt from '../src/common/security/bcrypt';


describe('Cart & Order E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let itemId: string;
  let cartItemId: string;
  let addressId: string;

  const testUser = {
    email: 'cart-e2e@example.com',
    password: 'Test123456!',
    nickname: 'Cart Test User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    const user = await prisma.user.create({
      data: {
        email: testUser.email,
        password: hashedPassword,
        nickname: testUser.nickname,
      },
    });
    userId = user.id;

    const brand = await prisma.brand.create({
      data: {
        name: 'Test Brand',
        slug: 'test-brand-e2e',
      },
    });

    const item = await prisma.clothingItem.create({
      data: {
        brandId: brand.id,
        name: 'Test Item E2E',
        sku: 'TEST-E2E-001',
        category: 'tops',
        colors: ['black', 'white'],
        sizes: ['S', 'M', 'L'],
        price: 199,
        images: ['https://example.com/test.jpg'],
        isActive: true,
      },
    });
    itemId = item.id;

    const address = await prisma.userAddress.create({
      data: {
        userId,
        name: 'Test User',
        phone: '13800138000',
        province: 'Beijing',
        city: 'Beijing',
        district: 'Chaoyang',
        address: 'Test Address 123',
        isDefault: true,
      },
    });
    addressId = address.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    accessToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await prisma.cartItem.deleteMany({ where: { userId } });
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.userAddress.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  describe('Cart Flow', () => {
    it('should add item to cart', async () => {
      const response = await request(app.getHttpServer())
        .post('/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          itemId,
          color: 'black',
          size: 'M',
          quantity: 1,
        })
        .expect(201);

      expect(response.body).toHaveProperty('itemId', itemId);
      expect(response.body).toHaveProperty('color', 'black');
      expect(response.body).toHaveProperty('size', 'M');
      cartItemId = response.body.id;
    });

    it('should get cart items', async () => {
      const response = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should get cart summary', async () => {
      const response = await request(app.getHttpServer())
        .get('/cart/summary')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalItems');
      expect(response.body).toHaveProperty('totalPrice');
    });

    it('should update cart item quantity', async () => {
      const response = await request(app.getHttpServer())
        .put(`/cart/${cartItemId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ quantity: 2 })
        .expect(200);

      expect(response.body.quantity).toBe(2);
    });

    it('should update cart item selection', async () => {
      await request(app.getHttpServer())
        .put(`/cart/${cartItemId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ selected: false })
        .expect(200);
    });
  });

  describe('Order Flow', () => {
    beforeAll(async () => {
      await request(app.getHttpServer())
        .put(`/cart/${cartItemId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ selected: true });
    });

    it('should create order from cart', async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          items: [{ itemId, color: 'black', size: 'M', quantity: 1 }],
          addressId,
          remark: 'E2E Test Order',
        })
        .expect(201);

      expect(response.body).toHaveProperty('orderNo');
      expect(response.body).toHaveProperty('status', 'pending');
    });

    it('should get orders list', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body.items.length).toBeGreaterThan(0);
    });

    it('should filter orders by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders?status=pending')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.items.every((o: any) => o.status === 'pending')).toBe(true);
    });
  });

  describe('Address Management', () => {
    it('should get addresses', async () => {
      const response = await request(app.getHttpServer())
        .get('/addresses')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should create new address', async () => {
      const response = await request(app.getHttpServer())
        .post('/addresses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Another User',
          phone: '13900139000',
          province: 'Shanghai',
          city: 'Shanghai',
          district: 'Pudong',
          address: 'Test Address 456',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });

    it('should validate phone format', async () => {
      await request(app.getHttpServer())
        .post('/addresses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Invalid Phone',
          phone: '12345',
          province: 'Beijing',
          city: 'Beijing',
          district: 'Test',
          address: 'Test',
        })
        .expect(400);
    });
  });
});

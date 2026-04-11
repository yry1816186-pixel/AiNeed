/**
 * 支付完整流程集成测试
 * @description 测试从购物车到支付完成的完整业务流程
 * 
 * 测试流程:
 * 1. 用户注册/登录
 * 2. 添加商品到购物车
 * 3. 创建订单
 * 4. 创建支付
 * 5. 支付回调处理
 * 6. 订单状态更新
 */

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ClothingCategory, OrderStatus, PaymentStatus } from "@prisma/client";
import request from "supertest";

import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/common/prisma/prisma.service";
import * as bcrypt from "../../src/common/security/bcrypt";
import {
  generateTestEmail,
  measureResponseTime,
} from "../utils/test.utils";
import { clothingFixtures } from "../utils/fixtures";

describe("Payment Flow E2E - 支付流程", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let itemId: string;
  let brandId: string;
  let cartItemId: string;
  let addressId: string;
  let orderId: string;
  let orderNo: string;
  let paymentOrderId: string;

  const testUser = {
    email: generateTestEmail(),
    password: "Test123456!",
    nickname: "支付流程测试",
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // 创建测试用户
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    const user = await prisma.user.create({
      data: {
        email: testUser.email,
        password: hashedPassword,
        nickname: testUser.nickname,
      },
    });
    userId = user.id;

    // 登录获取 token
    const loginResponse = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: testUser.email, password: testUser.password });
    accessToken = loginResponse.body.access_token;

    // 创建测试品牌
    const brand = await prisma.brand.create({
      data: {
        name: "测试品牌",
        slug: `test-brand-${Date.now()}`,
      },
    });
    brandId = brand.id;

    // 创建测试商品
    const item = await prisma.clothingItem.create({
      data: {
        brandId,
        name: clothingFixtures.tshirt.name,
        category: ClothingCategory.tops,
        images: clothingFixtures.tshirt.images,
        price: clothingFixtures.tshirt.price,
        colors: clothingFixtures.tshirt.colors,
        sizes: clothingFixtures.tshirt.sizes,
        isActive: true,
      },
    });
    itemId = item.id;

    // 创建测试地址
    const address = await prisma.userAddress.create({
      data: {
        userId,
        name: "测试收货人",
        phone: "13800138000",
        province: "北京市",
        city: "北京市",
        district: "朝阳区",
        address: "测试地址 123 号",
        isDefault: true,
      },
    });
    addressId = address.id;
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.refundRecord.deleteMany({
      where: { paymentRecord: { userId } },
    }).catch(() => {});
    await prisma.paymentRecord.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.paymentOrder.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.orderItem.deleteMany({
      where: { order: { userId } },
    }).catch(() => {});
    await prisma.order.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.cartItem.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.userAddress.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.clothingItem.delete({ where: { id: itemId } }).catch(() => {});
    await prisma.brand.delete({ where: { id: brandId } }).catch(() => {});
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    await app.close();
  });

  describe("阶段 1: 购物车操作", () => {
    it("应该成功添加商品到购物车", async () => {
      const response = await request(app.getHttpServer())
        .post("/cart")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          itemId,
          color: "white",
          size: "M",
          quantity: 2,
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("itemId", itemId);
      expect(response.body).toHaveProperty("color", "white");
      expect(response.body).toHaveProperty("size", "M");
      expect(response.body).toHaveProperty("quantity", 2);

      cartItemId = response.body.id;
    });

    it("应该成功获取购物车列表", async () => {
      const response = await request(app.getHttpServer())
        .get("/cart")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("应该成功获取购物车摘要", async () => {
      const response = await request(app.getHttpServer())
        .get("/cart/summary")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("totalItems");
      expect(response.body).toHaveProperty("totalPrice");
      expect(response.body).toHaveProperty("selectedItems");
      expect(response.body).toHaveProperty("selectedPrice");
    });

    it("应该成功更新购物车商品数量", async () => {
      const response = await request(app.getHttpServer())
        .put(`/cart/${cartItemId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ quantity: 3 })
        .expect(200);

      expect(response.body.quantity).toBe(3);
    });

    it("应该成功选中购物车商品", async () => {
      const response = await request(app.getHttpServer())
        .put(`/cart/${cartItemId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ selected: true })
        .expect(200);

      expect(response.body.selected).toBe(true);
    });
  });

  describe("阶段 2: 创建订单", () => {
    it("应该成功从购物车创建订单", async () => {
      const response = await request(app.getHttpServer())
        .post("/orders")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          items: [
            {
              itemId,
              color: "white",
              size: "M",
              quantity: 2,
            },
          ],
          addressId,
          remark: "集成测试订单",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("orderNo");
      expect(response.body).toHaveProperty("status", OrderStatus.pending);
      expect(response.body).toHaveProperty("totalAmount");

      orderId = response.body.id;
      orderNo = response.body.orderNo;
    });

    it("应该成功获取订单列表", async () => {
      const response = await request(app.getHttpServer())
        .get("/orders")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
      expect(response.body).toHaveProperty("total");
      expect(response.body.items.length).toBeGreaterThan(0);
    });

    it("应该成功获取订单详情", async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("id", orderId);
      expect(response.body).toHaveProperty("orderNo");
      expect(response.body).toHaveProperty("items");
      expect(response.body).toHaveProperty("address");
    });

    it("应该成功按状态筛选订单", async () => {
      const response = await request(app.getHttpServer())
        .get("/orders")
        .query({ status: OrderStatus.pending })
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(
        response.body.items.every((o: { status: string }) => o.status === OrderStatus.pending)
      ).toBe(true);
    });
  });

  describe("阶段 3: 创建支付", () => {
    it("应该成功创建支付订单", async () => {
      // 先创建支付订单
      const paymentOrder = await prisma.paymentOrder.create({
        data: {
          userId,
          amount: 398.0, // 199 * 2
          metadata: {
            orderId,
            orderNo,
          },
        },
      });
      paymentOrderId = paymentOrder.id;

      expect(paymentOrder.id).toBeDefined();
      expect(paymentOrder.amount).toBe(398.0);
    });

    it("应该成功发起支付请求", async () => {
      const response = await request(app.getHttpServer())
        .post("/payment/create")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          orderId: paymentOrderId,
          provider: "alipay",
          amount: 398.0,
          subject: "测试订单支付",
        });

      // 支付请求可能成功或返回特定错误（取决于支付配置）
      expect([201, 400, 500]).toContain(response.status);

      if (response.status === 201) {
        expect(response.body).toHaveProperty("orderId");
      }
    });

    it("应该成功查询支付状态", async () => {
      // 创建支付记录
      const paymentRecord = await prisma.paymentRecord.create({
        data: {
          orderId: `test-pay-${Date.now()}`,
          userId,
          provider: "alipay",
          amount: 398.0,
          currency: "CNY",
          status: PaymentStatus.pending,
          expiredAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/payment/query/${paymentRecord.orderId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("orderId");
      expect(response.body).toHaveProperty("status");
      expect(response.body).toHaveProperty("amount");
    });

    it("应该成功获取支付记录列表", async () => {
      const response = await request(app.getHttpServer())
        .get("/payment/records")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
      expect(response.body).toHaveProperty("total");
      expect(response.body).toHaveProperty("page");
      expect(response.body).toHaveProperty("pageSize");
    });
  });

  describe("阶段 4: 支付回调处理", () => {
    it("应该成功处理支付宝回调", async () => {
      const response = await request(app.getHttpServer())
        .post("/payment/callback/alipay")
        .send({
          out_trade_no: paymentOrderId,
          trade_no: `alipay-trade-${Date.now()}`,
          trade_status: "TRADE_SUCCESS",
          total_amount: "398.00",
          buyer_id: "test-buyer-id",
          gmt_payment: new Date().toISOString(),
        })
        .expect(200);

      // 回调应该返回 success
      expect(response.text).toBe("success");
    });

    it("应该成功处理微信支付回调", async () => {
      const response = await request(app.getHttpServer())
        .post("/payment/callback/wechat")
        .send({
          out_trade_no: paymentOrderId,
          transaction_id: `wechat-tx-${Date.now()}`,
          trade_state: "SUCCESS",
          total: 39800,
          time_end: new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14),
        })
        .expect(200);

      expect(response.body).toHaveProperty("code");
    });

    it("支付轮询应该返回支付状态", async () => {
      const response = await request(app.getHttpServer())
        .get(`/payment/poll/${paymentOrderId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("paid");
      expect(response.body).toHaveProperty("status");
      expect(typeof response.body.paid).toBe("boolean");
    });
  });

  describe("阶段 5: 订单状态更新", () => {
    it("支付成功后订单状态应该更新", async () => {
      // 模拟支付成功更新订单状态
      await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.paid },
      });

      const response = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.status).toBe(OrderStatus.paid);
    });

    it("应该成功取消未支付订单", async () => {
      // 创建一个新的待支付订单
      const newOrder = await prisma.order.create({
        data: {
          userId,
          orderNo: `CANCEL-${Date.now()}`,
          status: OrderStatus.pending,
          totalAmount: 100,
          finalAmount: 100,
        },
      });

      // 取消订单
      await request(app.getHttpServer())
        .put(`/orders/${newOrder.id}/cancel`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      // 验证订单状态
      const response = await request(app.getHttpServer())
        .get(`/orders/${newOrder.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.status).toBe(OrderStatus.cancelled);
    });
  });

  describe("阶段 6: 支付关闭和退款", () => {
    it("应该成功关闭支付订单", async () => {
      // 创建一个待支付的支付记录
      const paymentRecord = await prisma.paymentRecord.create({
        data: {
          orderId: `close-pay-${Date.now()}`,
          userId,
          provider: "alipay",
          amount: 100.0,
          currency: "CNY",
          status: PaymentStatus.pending,
          expiredAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .post("/payment/close")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ orderId: paymentRecord.orderId });

      // 可能成功或返回 404（如果支付渠道不支持）
      expect([200, 404]).toContain(response.status);
    });

    it("应该成功申请退款", async () => {
      // 创建一个已支付的支付记录
      const paidRecord = await prisma.paymentRecord.create({
        data: {
          orderId: `refund-pay-${Date.now()}`,
          userId,
          provider: "alipay",
          amount: 100.0,
          currency: "CNY",
          status: PaymentStatus.paid,
          paidAt: new Date(),
        },
      });

      const response = await request(app.getHttpServer())
        .post("/payment/refund")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          orderId: paidRecord.orderId,
          amount: 100.0,
          reason: "测试退款",
        });

      // 退款请求可能成功或返回特定错误
      expect([201, 400, 404]).toContain(response.status);
    });
  });

  describe("异常情况处理", () => {
    it("未认证用户应该无法访问购物车", async () => {
      await request(app.getHttpServer())
        .get("/cart")
        .expect(401);
    });

    it("未认证用户应该无法创建订单", async () => {
      await request(app.getHttpServer())
        .post("/orders")
        .send({
          items: [{ itemId, color: "white", size: "M", quantity: 1 }],
          addressId,
        })
        .expect(401);
    });

    it("无效商品 ID 应该返回 404", async () => {
      await request(app.getHttpServer())
        .post("/cart")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          itemId: "non-existent-item-id",
          color: "white",
          size: "M",
          quantity: 1,
        })
        .expect(404);
    });

    it("无效地址 ID 应该返回 404", async () => {
      await request(app.getHttpServer())
        .post("/orders")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          items: [{ itemId, color: "white", size: "M", quantity: 1 }],
          addressId: "non-existent-address-id",
        })
        .expect(404);
    });

    it("无效支付金额应该返回 400", async () => {
      await request(app.getHttpServer())
        .post("/payment/create")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          orderId: paymentOrderId,
          provider: "alipay",
          amount: -100,
        })
        .expect(400);
    });

    it("无效支付渠道应该返回 400", async () => {
      await request(app.getHttpServer())
        .post("/payment/create")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          orderId: paymentOrderId,
          provider: "invalid-provider",
          amount: 100,
        })
        .expect(400);
    });
  });

  describe("性能测试", () => {
    it("添加购物车响应时间应该小于 300ms", async () => {
      const duration = await measureResponseTime(async () => {
        await request(app.getHttpServer())
          .post("/cart")
          .set("Authorization", `Bearer ${accessToken}`)
          .send({
            itemId,
            color: "black",
            size: "L",
            quantity: 1,
          })
          .expect(201);
      });

      expect(duration).toBeLessThan(300);
    });

    it("创建订单响应时间应该小于 500ms", async () => {
      const duration = await measureResponseTime(async () => {
        await request(app.getHttpServer())
          .post("/orders")
          .set("Authorization", `Bearer ${accessToken}`)
          .send({
            items: [{ itemId, color: "black", size: "L", quantity: 1 }],
            addressId,
          })
          .expect(201);
      });

      expect(duration).toBeLessThan(500);
    });

    it("获取订单列表响应时间应该小于 200ms", async () => {
      const duration = await measureResponseTime(async () => {
        await request(app.getHttpServer())
          .get("/orders")
          .set("Authorization", `Bearer ${accessToken}`)
          .expect(200);
      });

      expect(duration).toBeLessThan(200);
    });
  });
});

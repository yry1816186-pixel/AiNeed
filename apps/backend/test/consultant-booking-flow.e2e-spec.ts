import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

describe("Consultant Booking Flow E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let clientAccessToken: string;
  let clientUserId: string;
  let consultantProfileId: string;

  const clientUser = {
    email: "consultant-client-e2e@example.com",
    password: "Test123456!",
    nickname: "Consultant Client",
  };

  const consultantUser = {
    email: "consultant-pro-e2e@example.com",
    password: "Test123456!",
    nickname: "Consultant Pro",
  };

  let consultantAccessToken: string;
  let consultantUserId: string;
  let bookingId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    const userIds = [clientUserId, consultantUserId].filter(Boolean);
    for (const uid of userIds) {
      await prisma.serviceBooking
        .deleteMany({ where: { userId: uid } })
        .catch(() => {});
    }
    if (consultantProfileId) {
      await prisma.consultantProfile
        .delete({ where: { id: consultantProfileId } })
        .catch(() => {});
    }
    for (const uid of userIds) {
      await prisma.user.delete({ where: { id: uid } }).catch(() => {});
    }
    await app.close();
  });

  describe("前置条件：用户注册", () => {
    it("应该成功注册客户用户", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send(clientUser)
        .expect(201);

      clientAccessToken = response.body.access_token;
      clientUserId = response.body.user.id;
    });

    it("应该成功注册顾问用户", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send(consultantUser)
        .expect(201);

      consultantAccessToken = response.body.access_token;
      consultantUserId = response.body.user.id;
    });
  });

  describe("顾问档案创建", () => {
    it("应该成功创建顾问档案", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/consultant/profile")
        .set("Authorization", `Bearer ${consultantAccessToken}`)
        .send({
          studioName: "E2E测试造型工作室",
          specialties: ["色彩搭配", "日常穿搭"],
          yearsOfExperience: 5,
          bio: "5年时尚行业经验",
          certifications: [{ name: "高级形象设计师" }],
        })
        .expect(201);

      consultantProfileId = response.body.id;
    });
  });

  describe("GET /api/v1/consultant/profiles - 浏览顾问列表", () => {
    it("应该返回顾问列表", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/consultant/profiles")
        .set("Authorization", `Bearer ${clientAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("应该支持按专长筛选", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/consultant/profiles?specialty=色彩搭配")
        .set("Authorization", `Bearer ${clientAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
    });

    it("应该支持按评分排序", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/consultant/profiles?sortBy=rating")
        .set("Authorization", `Bearer ${clientAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
    });

    it("未认证时应该返回 401", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/consultant/profiles")
        .expect(401);
    });
  });

  describe("GET /api/v1/consultant/profiles/:id - 查看顾问详情", () => {
    it("应该返回顾问详情", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/consultant/profiles/${consultantProfileId}`)
        .set("Authorization", `Bearer ${clientAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("id", consultantProfileId);
      expect(response.body).toHaveProperty("studioName");
    });

    it("不存在的顾问应该返回 404", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/consultant/profiles/nonexistent-id")
        .set("Authorization", `Bearer ${clientAccessToken}`)
        .expect(404);
    });
  });

  describe("POST /api/v1/consultant/bookings - 创建预约", () => {
    it("应该成功创建预约", async () => {
      const scheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const response = await request(app.getHttpServer())
        .post("/api/v1/consultant/bookings")
        .set("Authorization", `Bearer ${clientAccessToken}`)
        .send({
          consultantId: consultantProfileId,
          serviceType: "styling_consultation",
          scheduledAt,
          price: 299,
          notes: "希望了解职场穿搭建议",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("status", "pending");
      bookingId = response.body.id;
    });

    it("无效的顾问 ID 应该返回 404", async () => {
      const scheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      await request(app.getHttpServer())
        .post("/api/v1/consultant/bookings")
        .set("Authorization", `Bearer ${clientAccessToken}`)
        .send({
          consultantId: "nonexistent-id",
          serviceType: "styling_consultation",
          scheduledAt,
          price: 299,
        })
        .expect(404);
    });

    it("缺少必填字段应该返回 400", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/consultant/bookings")
        .set("Authorization", `Bearer ${clientAccessToken}`)
        .send({
          consultantId: consultantProfileId,
        })
        .expect(400);
    });

    it("未认证时应该返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/consultant/bookings")
        .send({
          consultantId: consultantProfileId,
          serviceType: "styling_consultation",
          scheduledAt: new Date().toISOString(),
          price: 299,
        })
        .expect(401);
    });
  });

  describe("GET /api/v1/consultant/bookings - 查看预约列表", () => {
    it("客户应该看到自己的预约列表", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/consultant/bookings")
        .set("Authorization", `Bearer ${clientAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("应该支持按状态筛选", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/consultant/bookings?status=pending")
        .set("Authorization", `Bearer ${clientAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
    });
  });

  describe("GET /api/v1/consultant/bookings/:id - 查看预约详情", () => {
    it("应该返回预约详情", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/consultant/bookings/${bookingId}`)
        .set("Authorization", `Bearer ${clientAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("id", bookingId);
    });

    it("不存在的预约应该返回 404", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/consultant/bookings/nonexistent-id")
        .set("Authorization", `Bearer ${clientAccessToken}`)
        .expect(404);
    });
  });

  describe("定金支付流程", () => {
    it("应该返回定金支付信息", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/consultant/bookings/${bookingId}/pay-deposit`)
        .set("Authorization", `Bearer ${clientAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("paymentCategory");
      expect(response.body).toHaveProperty("amount");
    });
  });

  describe("取消预约与退款", () => {
    it("应该成功取消预约", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/consultant/bookings/${bookingId}`)
        .set("Authorization", `Bearer ${clientAccessToken}`)
        .send({
          status: "cancelled",
          cancelReason: "时间冲突，需要改期",
        })
        .expect(200);

      expect(response.body).toHaveProperty("status", "cancelled");
    });

    it("已取消的预约不能再次取消", async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/consultant/bookings/${bookingId}`)
        .set("Authorization", `Bearer ${clientAccessToken}`)
        .send({
          status: "cancelled",
          cancelReason: "再次取消",
        })
        .expect(400);
    });
  });

  describe("顾问端预约管理", () => {
    let consultantBookingId: string;

    it("顾问应该能查看自己的预约列表", async () => {
      const scheduledAt = new Date(
        Date.now() + 72 * 60 * 60 * 1000,
      ).toISOString();

      const createResponse = await request(app.getHttpServer())
        .post("/api/v1/consultant/bookings")
        .set("Authorization", `Bearer ${clientAccessToken}`)
        .send({
          consultantId: consultantProfileId,
          serviceType: "color_analysis",
          scheduledAt,
          price: 399,
        })
        .expect(201);

      consultantBookingId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(
          `/api/v1/consultant/profiles/${consultantProfileId}/bookings`,
        )
        .set("Authorization", `Bearer ${consultantAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
    });
  });
});

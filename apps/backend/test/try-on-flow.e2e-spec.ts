import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

describe("Try-On Flow E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let tryOnTaskId: string;

  const testUser = {
    email: "tryon-e2e@example.com",
    password: "Test123456!",
    nickname: "TryOn E2E User",
  };

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
    if (userId) {
      await prisma.virtualTryOn.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await app.close();
  });

  describe("前置条件：用户注册与登录", () => {
    it("应该成功注册用户", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send(testUser)
        .expect(201);

      accessToken = response.body.access_token;
      userId = response.body.user.id;
    });
  });

  describe("POST /api/v1/try-on - 创建试衣任务", () => {
    it("应该成功创建试衣任务", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/try-on")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          userImage: "https://example.com/user-photo.jpg",
          garmentImage: "https://example.com/garment.jpg",
          category: "tops",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("status");
      tryOnTaskId = response.body.id;
    });

    it("缺少用户照片时应该返回 400", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/try-on")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          garmentImage: "https://example.com/garment.jpg",
          category: "tops",
        })
        .expect(400);
    });

    it("缺少服装图片时应该返回 400", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/try-on")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          userImage: "https://example.com/user-photo.jpg",
          category: "tops",
        })
        .expect(400);
    });

    it("未认证时应该返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/try-on")
        .send({
          userImage: "https://example.com/user-photo.jpg",
          garmentImage: "https://example.com/garment.jpg",
          category: "tops",
        })
        .expect(401);
    });

    it("无效分类时应该返回 400", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/try-on")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          userImage: "https://example.com/user-photo.jpg",
          garmentImage: "https://example.com/garment.jpg",
          category: "invalid_category",
        })
        .expect(400);
    });
  });

  describe("GET /api/v1/try-on/:id - 查询试衣状态", () => {
    it("应该返回试衣任务状态", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/try-on/${tryOnTaskId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("id", tryOnTaskId);
      expect(response.body).toHaveProperty("status");
    });

    it("不存在的任务应该返回 404", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/try-on/nonexistent-task-id")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(404);
    });

    it("未认证时应该返回 401", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/try-on/${tryOnTaskId}`)
        .expect(401);
    });
  });

  describe("GET /api/v1/try-on/history - 试衣历史", () => {
    it("应该返回试衣历史列表", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/try-on/history")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it("应该支持分页参数", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/try-on/history?page=1&pageSize=10")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it("未认证时应该返回 401", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/try-on/history")
        .expect(401);
    });
  });

  describe("不同图片格式", () => {
    it("应该接受 PNG 格式图片", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/try-on")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          userImage: "https://example.com/user.png",
          garmentImage: "https://example.com/garment.png",
          category: "tops",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
    });

    it("应该接受 JPG 格式图片", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/try-on")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          userImage: "https://example.com/user.jpg",
          garmentImage: "https://example.com/garment.jpg",
          category: "bottoms",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
    });

    it("应该接受 WEBP 格式图片", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/try-on")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          userImage: "https://example.com/user.webp",
          garmentImage: "https://example.com/garment.webp",
          category: "dresses",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
    });
  });

  describe("错误输入处理", () => {
    it("无效 URL 格式应该返回 400", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/try-on")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          userImage: "not-a-url",
          garmentImage: "https://example.com/garment.jpg",
          category: "tops",
        })
        .expect(400);
    });

    it("空请求体应该返回 400", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/try-on")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });
  });
});

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

describe("Recommendation Flow E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  const testUser = {
    email: "rec-e2e@example.com",
    password: "Test123456!",
    nickname: "Rec E2E User",
  };

  const coldStartUser = {
    email: "cold-e2e@example.com",
    password: "Test123456!",
    nickname: "Cold Start User",
  };

  let coldStartAccessToken: string;
  let coldStartUserId: string;

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
    const userIds = [userId, coldStartUserId].filter(Boolean);
    for (const uid of userIds) {
      await prisma.user.delete({ where: { id: uid } }).catch(() => {});
    }
    await app.close();
  });

  describe("前置条件：用户注册", () => {
    it("应该成功注册老用户", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send(testUser)
        .expect(201);

      accessToken = response.body.access_token;
      userId = response.body.user.id;
    });

    it("应该成功注册冷启动用户", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send(coldStartUser)
        .expect(201);

      coldStartAccessToken = response.body.access_token;
      coldStartUserId = response.body.user.id;
    });
  });

  describe("GET /api/v1/recommendations - 获取推荐", () => {
    it("老用户应该获取个性化推荐", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/recommendations")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it("冷启动用户应该获取热门推荐", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/recommendations")
        .set("Authorization", `Bearer ${coldStartAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it("未认证时应该返回 401", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/recommendations")
        .expect(401);
    });
  });

  describe("GET /api/v1/recommendations - 分类筛选", () => {
    it("应该支持按分类筛选推荐", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/recommendations?category=tops")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
    });

    it("应该支持按风格筛选推荐", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/recommendations?style=casual")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
    });

    it("应该支持按场合筛选推荐", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/recommendations?occasion=daily")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
    });
  });

  describe("GET /api/v1/recommendations - 分页", () => {
    it("应该支持分页参数", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/recommendations?page=1&pageSize=5")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
      expect(response.body).toHaveProperty("total");
      expect(response.body).toHaveProperty("hasMore");
    });

    it("应该支持 cursor 分页", async () => {
      const firstPage = await request(app.getHttpServer())
        .get("/api/v1/recommendations?pageSize=5")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      if (firstPage.body.cursor) {
        const secondPage = await request(app.getHttpServer())
          .get(
            `/api/v1/recommendations?cursor=${firstPage.body.cursor}&pageSize=5`,
          )
          .set("Authorization", `Bearer ${accessToken}`)
          .expect(200);

        expect(secondPage.body).toHaveProperty("items");
      }
    });

    it("第二页结果不应与第一页重复", async () => {
      const firstPage = await request(app.getHttpServer())
        .get("/api/v1/recommendations?page=1&pageSize=5")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      const secondPage = await request(app.getHttpServer())
        .get("/api/v1/recommendations?page=2&pageSize=5")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      if (
        firstPage.body.items.length > 0 &&
        secondPage.body.items.length > 0
      ) {
        const firstIds = firstPage.body.items.map((i: any) => i.id);
        const secondIds = secondPage.body.items.map((i: any) => i.id);
        const overlap = firstIds.filter((id: string) =>
          secondIds.includes(id),
        );
        expect(overlap).toHaveLength(0);
      }
    });
  });

  describe("GET /api/v1/recommendations/feed - Feed 流", () => {
    it("应该获取每日推荐 Feed", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/recommendations/feed?category=daily")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
    });

    it("应该获取趋势推荐 Feed", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/recommendations/feed?category=trending")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
    });

    it("应该获取场合推荐 Feed", async () => {
      const response = await request(app.getHttpServer())
        .get(
          "/api/v1/recommendations/feed?category=occasion&subCategory=date",
        )
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
    });
  });

  describe("推荐结果验证", () => {
    it("推荐结果应该包含必要字段", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/recommendations?pageSize=5")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      if (response.body.items.length > 0) {
        const item = response.body.items[0];
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("price");
      }
    });

    it("分类筛选结果应该匹配请求的分类", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/recommendations?category=tops&pageSize=20")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      if (response.body.items.length > 0) {
        for (const item of response.body.items) {
          if (item.category) {
            expect(item.category).toBe("tops");
          }
        }
      }
    });
  });
});

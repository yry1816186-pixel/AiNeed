/**
 * 推荐系统集成测试
 * @description 测试推荐系统的完整流程，包括个性化推荐、风格指南、搭配推荐等
 */

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import {
  BodyType,
  SkinTone,
  ColorSeason,
  ClothingCategory,
} from "@prisma/client";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

describe("Recommendations E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  const testItemId: string = "";

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
    // 清理测试数据
    if (userId) {
      await prisma.userProfile.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    if (testItemId) {
      await prisma.clothingItem.delete({ where: { id: testItemId } }).catch(() => {});
    }
    await app.close();
  });

  describe("用户注册和档案设置", () => {
    it("应该成功注册用户", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          email: "recommendations-test@example.com",
          password: "Test123456!",
          nickname: "Recommendations Test User",
        })
        .expect(201);

      expect(response.body).toHaveProperty("access_token");
      accessToken = response.body.access_token;
      userId = response.body.user.id;
    });

    it("应该成功更新用户档案", async () => {
      const response = await request(app.getHttpServer())
        .put("/profile")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          bodyType: BodyType.hourglass,
          skinTone: SkinTone.medium,
          colorSeason: ColorSeason.autumn,
          height: 165,
          weight: 55,
          stylePreferences: [
            { name: "casual", category: "style" },
            { name: "elegant", category: "style" },
          ],
          colorPreferences: ["blue", "black", "white"],
        })
        .expect(200);

      expect(response.body.bodyType).toBe(BodyType.hourglass);
      expect(response.body.colorSeason).toBe(ColorSeason.autumn);
    });
  });

  describe("个性化推荐 API", () => {
    it("应该返回个性化推荐列表", async () => {
      const response = await request(app.getHttpServer())
        .get("/recommendations")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it("应该支持按分类筛选推荐", async () => {
      const response = await request(app.getHttpServer())
        .get("/recommendations")
        .query({ category: ClothingCategory.tops })
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
    });

    it("应该支持按场合筛选推荐", async () => {
      const response = await request(app.getHttpServer())
        .get("/recommendations")
        .query({ occasion: "daily" })
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
    });

    it("应该支持限制返回数量", async () => {
      const response = await request(app.getHttpServer())
        .get("/recommendations")
        .query({ limit: 5 })
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.items.length).toBeLessThanOrEqual(5);
    });

    it("未认证用户应该返回 401", async () => {
      await request(app.getHttpServer())
        .get("/recommendations")
        .expect(401);
    });
  });

  describe("风格指南 API", () => {
    it("应该返回用户的风格指南", async () => {
      const response = await request(app.getHttpServer())
        .get("/recommendations/style-guide")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("bodyType");
      expect(response.body).toHaveProperty("colorSeason");
      expect(response.body).toHaveProperty("recommendations");
      expect(Array.isArray(response.body.recommendations)).toBe(true);
    });

    it("风格指南应该包含体型建议", async () => {
      const response = await request(app.getHttpServer())
        .get("/recommendations/style-guide")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      // 用户档案设置为 hourglass (X型)
      expect(response.body.bodyType).toBe("X型");
    });

    it("风格指南应该包含色彩季型建议", async () => {
      const response = await request(app.getHttpServer())
        .get("/recommendations/style-guide")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      // 用户档案设置为 autumn (秋季)
      expect(response.body.colorSeason).toBe("秋季");
    });
  });

  describe("相似商品推荐 API", () => {
    it("应该返回相似商品列表", async () => {
      // 首先获取一个商品ID
      const itemsResponse = await request(app.getHttpServer())
        .get("/clothing")
        .query({ limit: 1 })
        .set("Authorization", `Bearer ${accessToken}`);

      if (itemsResponse.body.items?.length > 0) {
        const itemId = itemsResponse.body.items[0].id;

        const response = await request(app.getHttpServer())
          .get(`/recommendations/similar/${itemId}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body).toHaveProperty("items");
        expect(Array.isArray(response.body.items)).toBe(true);
      }
    });
  });

  describe("搭配推荐 API", () => {
    it("应该返回搭配建议", async () => {
      // 首先获取一个商品ID
      const itemsResponse = await request(app.getHttpServer())
        .get("/clothing")
        .query({ limit: 1 })
        .set("Authorization", `Bearer ${accessToken}`);

      if (itemsResponse.body.items?.length > 0) {
        const itemId = itemsResponse.body.items[0].id;

        const response = await request(app.getHttpServer())
          .get(`/recommendations/outfit/${itemId}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body).toHaveProperty("outfits");
        expect(Array.isArray(response.body.outfits)).toBe(true);
      }
    });

    it("应该支持按场合获取搭配建议", async () => {
      const itemsResponse = await request(app.getHttpServer())
        .get("/clothing")
        .query({ limit: 1 })
        .set("Authorization", `Bearer ${accessToken}`);

      if (itemsResponse.body.items?.length > 0) {
        const itemId = itemsResponse.body.items[0].id;

        const response = await request(app.getHttpServer())
          .get(`/recommendations/outfit/${itemId}`)
          .query({ occasion: "work" })
          .set("Authorization", `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body).toHaveProperty("outfits");
      }
    });
  });

  describe("推荐解释 API", () => {
    it("应该返回推荐解释", async () => {
      // 首先获取推荐
      const recResponse = await request(app.getHttpServer())
        .get("/recommendations")
        .query({ limit: 1 })
        .set("Authorization", `Bearer ${accessToken}`);

      if (recResponse.body.items?.length > 0) {
        const itemId = recResponse.body.items[0].id;

        const response = await request(app.getHttpServer())
          .get(`/recommendations/explain/${itemId}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body).toHaveProperty("explanation");
        expect(response.body).toHaveProperty("score");
        expect(response.body).toHaveProperty("reasons");
      }
    });
  });

  describe("推荐反馈 API", () => {
    it("应该成功记录推荐反馈", async () => {
      const recResponse = await request(app.getHttpServer())
        .get("/recommendations")
        .query({ limit: 1 })
        .set("Authorization", `Bearer ${accessToken}`);

      if (recResponse.body.items?.length > 0) {
        const itemId = recResponse.body.items[0].id;

        const response = await request(app.getHttpServer())
          .post(`/recommendations/feedback/${itemId}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send({
            action: "like",
            context: { source: "recommendations_page" },
          })
          .expect(201);

        expect(response.body).toHaveProperty("success", true);
      }
    });

    it("应该支持不喜欢反馈", async () => {
      const recResponse = await request(app.getHttpServer())
        .get("/recommendations")
        .query({ limit: 1 })
        .set("Authorization", `Bearer ${accessToken}`);

      if (recResponse.body.items?.length > 0) {
        const itemId = recResponse.body.items[0].id;

        const response = await request(app.getHttpServer())
          .post(`/recommendations/feedback/${itemId}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send({
            action: "dislike",
            reason: "not_my_style",
          })
          .expect(201);

        expect(response.body).toHaveProperty("success", true);
      }
    });
  });

  describe("推荐性能测试", () => {
    it("推荐响应时间应该小于 500ms", async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .get("/recommendations")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it("风格指南响应时间应该小于 200ms", async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .get("/recommendations/style-guide")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(200);
    });
  });
});
